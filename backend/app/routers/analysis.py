from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import Register, Risk
from app.services.monte_carlo import run_simulation

router = APIRouter(tags=["analysis"])


@router.get("/registers/{register_id}/analysis/monte-carlo")
async def monte_carlo(
    register_id: str,
    iterations: int = Query(10_000, ge=100, le=100_000),
    db: AsyncSession = Depends(get_session),
):
    reg = await db.get(Register, register_id)
    if not reg:
        raise HTTPException(404, "Register not found")

    result = await db.execute(
        select(Risk).where(Risk.register_id == register_id)
    )
    risks = result.scalars().all()

    # Filter to risks that have both probability and cost defined
    risk_dicts = []
    for r in risks:
        if r.probability is None or r.probability == 0:
            continue
        if r.cost_single is None and r.cost_min is None:
            continue
        risk_dicts.append({
            "probability": r.probability,
            "cost_single": r.cost_single,
            "cost_min": r.cost_min,
            "cost_expected": r.cost_expected,
            "cost_max": r.cost_max,
        })

    return run_simulation(risk_dicts, iterations=iterations)


@router.get("/registers/{register_id}/analysis/summary")
async def summary(
    register_id: str,
    db: AsyncSession = Depends(get_session),
):
    reg = await db.get(Register, register_id)
    if not reg:
        raise HTTPException(404, "Register not found")

    result = await db.execute(
        select(Risk).where(Risk.register_id == register_id)
    )
    risks = result.scalars().all()

    total_expected = 0.0
    for r in risks:
        prob = (r.probability or 0) / 100.0
        if r.cost_min is not None:
            cost = r.cost_expected or 0
        else:
            cost = r.cost_single or 0
        total_expected += prob * cost

    return {
        "risk_count": len(risks),
        "total_expected_value": round(total_expected, 2),
    }
