from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_session
from app.models import Register, Risk
from app.schemas import ReorderRequest, RiskCreate, RiskOut, RiskUpdate

router = APIRouter(tags=["risks"])


def _risk_to_out(r: Risk) -> RiskOut:
    return RiskOut(
        id=r.id,
        register_id=r.register_id,
        display_id=r.display_id,
        title=r.title,
        description=r.description,
        category=r.category,
        probability=r.probability,
        cost_single=r.cost_single,
        cost_min=r.cost_min,
        cost_expected=r.cost_expected,
        cost_max=r.cost_max,
        notes=r.notes,
        sort_order=r.sort_order,
        created_at=r.created_at,
        updated_at=r.updated_at,
        linked_mitigation_ids=[rm.mitigation_id for rm in r.risk_mitigations],
    )


async def _next_display_id(db: AsyncSession, register_id: str) -> str:
    result = await db.execute(
        select(func.max(Risk.display_id)).where(Risk.register_id == register_id)
    )
    max_id = result.scalar_one()
    if max_id is None:
        return "R-001"
    num = int(max_id.split("-")[1]) + 1
    return f"R-{num:03d}"


@router.get("/registers/{register_id}/risks", response_model=list[RiskOut])
async def list_risks(register_id: str, db: AsyncSession = Depends(get_session)):
    reg = await db.get(Register, register_id)
    if not reg:
        raise HTTPException(404, "Register not found")
    result = await db.execute(
        select(Risk)
        .where(Risk.register_id == register_id)
        .options(selectinload(Risk.risk_mitigations))
        .order_by(Risk.sort_order, Risk.created_at)
    )
    return [_risk_to_out(r) for r in result.scalars().all()]


@router.post("/registers/{register_id}/risks", response_model=RiskOut, status_code=201)
async def create_risk(register_id: str, body: RiskCreate, db: AsyncSession = Depends(get_session)):
    reg = await db.get(Register, register_id)
    if not reg:
        raise HTTPException(404, "Register not found")
    display_id = await _next_display_id(db, register_id)
    # Set sort_order to put new risk at the end
    result = await db.execute(
        select(func.coalesce(func.max(Risk.sort_order), -1)).where(Risk.register_id == register_id)
    )
    max_order = result.scalar_one()
    risk = Risk(
        register_id=register_id,
        display_id=display_id,
        title=body.title,
        description=body.description,
        category=body.category,
        probability=body.probability,
        cost_single=body.cost_single,
        cost_min=body.cost_min,
        cost_expected=body.cost_expected,
        cost_max=body.cost_max,
        notes=body.notes,
        sort_order=max_order + 1,
    )
    db.add(risk)
    await db.commit()
    await db.refresh(risk, ["risk_mitigations"])
    return _risk_to_out(risk)


@router.patch("/risks/{risk_id}", response_model=RiskOut)
async def update_risk(risk_id: str, body: RiskUpdate, db: AsyncSession = Depends(get_session)):
    risk = await db.get(Risk, risk_id)
    if not risk:
        raise HTTPException(404, "Risk not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(risk, field, value)
    await db.commit()
    await db.refresh(risk, ["risk_mitigations"])
    return _risk_to_out(risk)


@router.delete("/risks/{risk_id}", status_code=204)
async def delete_risk(risk_id: str, db: AsyncSession = Depends(get_session)):
    risk = await db.get(Risk, risk_id)
    if not risk:
        raise HTTPException(404, "Risk not found")
    await db.delete(risk)
    await db.commit()


@router.patch("/registers/{register_id}/risks/reorder", response_model=list[RiskOut])
async def reorder_risks(register_id: str, body: ReorderRequest, db: AsyncSession = Depends(get_session)):
    reg = await db.get(Register, register_id)
    if not reg:
        raise HTTPException(404, "Register not found")
    for item in body.items:
        risk = await db.get(Risk, item.id)
        if risk and risk.register_id == register_id:
            risk.sort_order = item.sort_order
    await db.commit()
    result = await db.execute(
        select(Risk)
        .where(Risk.register_id == register_id)
        .options(selectinload(Risk.risk_mitigations))
        .order_by(Risk.sort_order, Risk.created_at)
    )
    return [_risk_to_out(r) for r in result.scalars().all()]
