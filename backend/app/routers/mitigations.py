from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_session
from app.models import CellComment, Mitigation, Register, Risk, RiskMitigation
from app.schemas import (
    CommentOut,
    MitigationCommentCreate,
    MitigationCreate,
    MitigationOut,
    MitigationUpdate,
)

router = APIRouter(tags=["mitigations"])


def _mitigation_to_out(m: Mitigation) -> MitigationOut:
    return MitigationOut(
        id=m.id,
        register_id=m.register_id,
        display_id=m.display_id,
        title=m.title,
        description=m.description,
        notes=m.notes,
        sort_order=m.sort_order,
        created_at=m.created_at,
        updated_at=m.updated_at,
        linked_risk_ids=[rm.risk_id for rm in m.risk_mitigations],
    )


async def _next_display_id(db: AsyncSession, register_id: str) -> str:
    result = await db.execute(
        select(func.max(Mitigation.display_id)).where(Mitigation.register_id == register_id)
    )
    max_id = result.scalar_one()
    if max_id is None:
        return "M-001"
    num = int(max_id.split("-")[1]) + 1
    return f"M-{num:03d}"


# --- CRUD ---


@router.get("/registers/{register_id}/mitigations", response_model=list[MitigationOut])
async def list_mitigations(register_id: str, db: AsyncSession = Depends(get_session)):
    reg = await db.get(Register, register_id)
    if not reg:
        raise HTTPException(404, "Register not found")
    result = await db.execute(
        select(Mitigation)
        .where(Mitigation.register_id == register_id)
        .options(selectinload(Mitigation.risk_mitigations))
        .order_by(Mitigation.sort_order, Mitigation.created_at)
    )
    return [_mitigation_to_out(m) for m in result.scalars().all()]


@router.post("/registers/{register_id}/mitigations", response_model=MitigationOut, status_code=201)
async def create_mitigation(register_id: str, body: MitigationCreate, db: AsyncSession = Depends(get_session)):
    reg = await db.get(Register, register_id)
    if not reg:
        raise HTTPException(404, "Register not found")
    display_id = await _next_display_id(db, register_id)
    result = await db.execute(
        select(func.coalesce(func.max(Mitigation.sort_order), -1)).where(Mitigation.register_id == register_id)
    )
    max_order = result.scalar_one()
    mitigation = Mitigation(
        register_id=register_id,
        display_id=display_id,
        title=body.title,
        description=body.description,
        notes=body.notes,
        sort_order=max_order + 1,
    )
    db.add(mitigation)
    await db.commit()
    result = await db.execute(
        select(Mitigation).where(Mitigation.id == mitigation.id).options(selectinload(Mitigation.risk_mitigations))
    )
    return _mitigation_to_out(result.scalar_one())


@router.patch("/mitigations/{mitigation_id}", response_model=MitigationOut)
async def update_mitigation(mitigation_id: str, body: MitigationUpdate, db: AsyncSession = Depends(get_session)):
    mitigation = await db.get(Mitigation, mitigation_id)
    if not mitigation:
        raise HTTPException(404, "Mitigation not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(mitigation, field, value)
    await db.commit()
    result = await db.execute(
        select(Mitigation).where(Mitigation.id == mitigation.id).options(selectinload(Mitigation.risk_mitigations))
    )
    return _mitigation_to_out(result.scalar_one())


@router.delete("/mitigations/{mitigation_id}", status_code=204)
async def delete_mitigation(mitigation_id: str, db: AsyncSession = Depends(get_session)):
    mitigation = await db.get(Mitigation, mitigation_id)
    if not mitigation:
        raise HTTPException(404, "Mitigation not found")
    await db.delete(mitigation)
    await db.commit()


# --- Risk linking ---


@router.post("/mitigations/{mitigation_id}/risks/{risk_id}", status_code=201)
async def link_risk(mitigation_id: str, risk_id: str, db: AsyncSession = Depends(get_session)):
    mitigation = await db.get(Mitigation, mitigation_id)
    if not mitigation:
        raise HTTPException(404, "Mitigation not found")
    risk = await db.get(Risk, risk_id)
    if not risk:
        raise HTTPException(404, "Risk not found")
    existing = await db.execute(
        select(RiskMitigation).where(
            RiskMitigation.mitigation_id == mitigation_id,
            RiskMitigation.risk_id == risk_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Link already exists")
    link = RiskMitigation(risk_id=risk_id, mitigation_id=mitigation_id)
    db.add(link)
    await db.commit()
    return {"status": "linked"}


@router.delete("/mitigations/{mitigation_id}/risks/{risk_id}", status_code=204)
async def unlink_risk(mitigation_id: str, risk_id: str, db: AsyncSession = Depends(get_session)):
    result = await db.execute(
        select(RiskMitigation).where(
            RiskMitigation.mitigation_id == mitigation_id,
            RiskMitigation.risk_id == risk_id,
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(404, "Link not found")
    await db.delete(link)
    await db.commit()


# --- Comments ---


@router.get("/mitigations/{mitigation_id}/comments", response_model=list[CommentOut])
async def list_mitigation_comments(
    mitigation_id: str,
    column_key: str | None = Query(None),
    db: AsyncSession = Depends(get_session),
):
    mitigation = await db.get(Mitigation, mitigation_id)
    if not mitigation:
        raise HTTPException(404, "Mitigation not found")
    stmt = select(CellComment).where(CellComment.mitigation_id == mitigation_id)
    if column_key:
        stmt = stmt.where(CellComment.column_key == column_key)
    stmt = stmt.order_by(CellComment.created_at)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/mitigations/{mitigation_id}/comments", response_model=CommentOut, status_code=201)
async def create_mitigation_comment(
    mitigation_id: str,
    body: MitigationCommentCreate,
    db: AsyncSession = Depends(get_session),
):
    mitigation = await db.get(Mitigation, mitigation_id)
    if not mitigation:
        raise HTTPException(404, "Mitigation not found")
    comment = CellComment(
        mitigation_id=mitigation_id,
        column_key=body.column_key,
        author_name=body.author_name,
        content=body.content,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment


@router.get("/registers/{register_id}/mitigations/comments/counts")
async def mitigation_comment_counts(register_id: str, db: AsyncSession = Depends(get_session)):
    """Return comment counts per (mitigation_id, column_key) for badge display."""
    stmt = (
        select(
            CellComment.mitigation_id,
            CellComment.column_key,
            func.count().label("comment_count"),
        )
        .join(Mitigation, Mitigation.id == CellComment.mitigation_id)
        .where(Mitigation.register_id == register_id)
        .group_by(CellComment.mitigation_id, CellComment.column_key)
    )
    result = await db.execute(stmt)
    return [
        {
            "mitigation_id": row.mitigation_id,
            "column_key": row.column_key,
            "comment_count": row.comment_count,
        }
        for row in result.all()
    ]
