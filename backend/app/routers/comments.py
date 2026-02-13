import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import CellComment, Risk
from app.schemas import CommentCreate, CommentOut

router = APIRouter(tags=["comments"])


@router.get("/risks/{risk_id}/comments", response_model=list[CommentOut])
async def list_comments(
    risk_id: str,
    column_key: str | None = Query(None),
    db: AsyncSession = Depends(get_session),
):
    risk = await db.get(Risk, risk_id)
    if not risk:
        raise HTTPException(404, "Risk not found")
    stmt = select(CellComment).where(CellComment.risk_id == risk_id)
    if column_key:
        stmt = stmt.where(CellComment.column_key == column_key)
    stmt = stmt.order_by(CellComment.created_at)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/registers/{register_id}/comments/counts")
async def comment_counts(register_id: str, db: AsyncSession = Depends(get_session)):
    """Return comment and proposal counts per (risk_id, column_key) for badge display."""
    stmt = (
        select(
            CellComment.risk_id,
            CellComment.column_key,
            func.count().label("comment_count"),
            func.sum(
                case((
                    (CellComment.proposed_value.isnot(None)) & (CellComment.status == "active"),
                    1,
                ), else_=0)
            ).label("proposal_count"),
        )
        .join(Risk, Risk.id == CellComment.risk_id)
        .where(Risk.register_id == register_id)
        .group_by(CellComment.risk_id, CellComment.column_key)
    )
    result = await db.execute(stmt)
    return [
        {
            "risk_id": row.risk_id,
            "column_key": row.column_key,
            "comment_count": row.comment_count,
            "proposal_count": row.proposal_count,
        }
        for row in result.all()
    ]


@router.post("/risks/{risk_id}/comments", response_model=CommentOut, status_code=201)
async def create_comment(
    risk_id: str,
    body: CommentCreate,
    db: AsyncSession = Depends(get_session),
):
    risk = await db.get(Risk, risk_id)
    if not risk:
        raise HTTPException(404, "Risk not found")
    comment = CellComment(
        risk_id=risk_id,
        column_key=body.column_key,
        author_name=body.author_name,
        content=body.content,
        proposed_value=body.proposed_value,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment


@router.post("/comments/{comment_id}/accept", response_model=CommentOut)
async def accept_proposal(comment_id: str, db: AsyncSession = Depends(get_session)):
    comment = await db.get(CellComment, comment_id)
    if not comment:
        raise HTTPException(404, "Comment not found")
    if comment.proposed_value is None:
        raise HTTPException(400, "Comment is not a proposal")
    if comment.status != "active":
        raise HTTPException(400, "Proposal is not active")

    risk = await db.get(Risk, comment.risk_id)
    if not risk:
        raise HTTPException(404, "Risk not found")

    # Write proposed value to the risk
    _apply_proposed_value(risk, comment.column_key, comment.proposed_value)

    # Accept this proposal
    comment.status = "accepted"

    # Reject other active proposals on the same cell
    await db.execute(
        update(CellComment)
        .where(
            CellComment.risk_id == comment.risk_id,
            CellComment.column_key == comment.column_key,
            CellComment.id != comment.id,
            CellComment.status == "active",
            CellComment.proposed_value.isnot(None),
        )
        .values(status="rejected")
    )

    await db.commit()
    await db.refresh(comment)
    return comment


@router.post("/comments/{comment_id}/reject", response_model=CommentOut)
async def reject_proposal(comment_id: str, db: AsyncSession = Depends(get_session)):
    comment = await db.get(CellComment, comment_id)
    if not comment:
        raise HTTPException(404, "Comment not found")
    if comment.proposed_value is None:
        raise HTTPException(400, "Comment is not a proposal")
    if comment.status != "active":
        raise HTTPException(400, "Proposal is not active")
    comment.status = "rejected"
    await db.commit()
    await db.refresh(comment)
    return comment


def _apply_proposed_value(risk: Risk, column_key: str, proposed_value: str):
    """Write a proposed value to the appropriate risk field."""
    if column_key == "probability":
        risk.probability = float(proposed_value)
    elif column_key == "cost":
        # Could be a single value or JSON object for triangular
        try:
            parsed = json.loads(proposed_value)
            if isinstance(parsed, dict):
                risk.cost_min = parsed["min"]
                risk.cost_expected = parsed["expected"]
                risk.cost_max = parsed["max"]
                risk.cost_single = None
            else:
                risk.cost_single = float(parsed)
                risk.cost_min = None
                risk.cost_expected = None
                risk.cost_max = None
        except (json.JSONDecodeError, KeyError):
            risk.cost_single = float(proposed_value)
            risk.cost_min = None
            risk.cost_expected = None
            risk.cost_max = None
    elif column_key in ("title", "description", "category", "notes"):
        setattr(risk, column_key, proposed_value)
