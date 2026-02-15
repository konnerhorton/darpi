import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_session
from app.models import CellComment, Mitigation, Register, Risk, Snapshot
from app.schemas import (
    CommentOut,
    MitigationOut,
    RiskOut,
    SnapshotCreate,
    SnapshotListItem,
    SnapshotOut,
)
from app.services.monte_carlo import run_simulation

router = APIRouter(tags=["snapshots"])


@router.get("/registers/{register_id}/snapshots", response_model=list[SnapshotListItem])
async def list_snapshots(register_id: str, db: AsyncSession = Depends(get_session)):
    reg = await db.get(Register, register_id)
    if not reg:
        raise HTTPException(404, "Register not found")
    result = await db.execute(
        select(
            Snapshot.id,
            Snapshot.register_id,
            Snapshot.name,
            Snapshot.description,
            Snapshot.risk_count,
            Snapshot.aggregate_mean,
            Snapshot.aggregate_p50,
            Snapshot.created_at,
        )
        .where(Snapshot.register_id == register_id)
        .order_by(Snapshot.created_at.desc())
    )
    return [
        SnapshotListItem(
            id=row.id,
            register_id=row.register_id,
            name=row.name,
            description=row.description,
            risk_count=row.risk_count,
            aggregate_mean=row.aggregate_mean,
            aggregate_p50=row.aggregate_p50,
            created_at=row.created_at,
        )
        for row in result.all()
    ]


@router.post("/registers/{register_id}/snapshots", response_model=SnapshotOut, status_code=201)
async def create_snapshot(register_id: str, body: SnapshotCreate, db: AsyncSession = Depends(get_session)):
    reg = await db.get(Register, register_id)
    if not reg:
        raise HTTPException(404, "Register not found")

    # Query all risks
    risk_result = await db.execute(
        select(Risk).where(Risk.register_id == register_id).order_by(Risk.sort_order, Risk.created_at)
    )
    risks = risk_result.scalars().all()

    # Query all mitigations with linked risk IDs
    mit_result = await db.execute(
        select(Mitigation)
        .where(Mitigation.register_id == register_id)
        .options(selectinload(Mitigation.risk_mitigations))
        .order_by(Mitigation.sort_order, Mitigation.created_at)
    )
    mitigations = mit_result.scalars().all()

    # Query all comments for this register's risks and mitigations
    risk_ids = [r.id for r in risks]
    mit_ids = [m.id for m in mitigations]

    comments = []
    if risk_ids:
        result = await db.execute(
            select(CellComment).where(CellComment.risk_id.in_(risk_ids))
        )
        comments.extend(result.scalars().all())
    if mit_ids:
        result = await db.execute(
            select(CellComment).where(CellComment.mitigation_id.in_(mit_ids))
        )
        comments.extend(result.scalars().all())

    # Serialize using existing Pydantic schemas
    risks_data = [RiskOut.model_validate(r).model_dump(mode="json") for r in risks]
    mits_data = [
        MitigationOut(
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
        ).model_dump(mode="json")
        for m in mitigations
    ]
    comments_data = [CommentOut.model_validate(c).model_dump(mode="json") for c in comments]

    data_json = json.dumps({"risks": risks_data, "mitigations": mits_data, "comments": comments_data})

    # Compute aggregate expected cost
    total_expected = 0.0
    for r in risks:
        prob = (r.probability or 0) / 100.0
        cost = (r.cost_expected if r.cost_min is not None else r.cost_single) or 0
        total_expected += prob * cost

    # Run Monte Carlo for cached percentiles
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

    mc = run_simulation(risk_dicts)

    snapshot = Snapshot(
        register_id=register_id,
        name=body.name,
        description=body.description,
        data=data_json,
        risk_count=len(risks),
        aggregate_expected_cost=round(total_expected, 2),
        aggregate_mean=mc["mean"],
        aggregate_std_dev=mc["std_dev"],
        aggregate_p10=mc["p10"],
        aggregate_p20=mc["p20"],
        aggregate_p30=mc["p30"],
        aggregate_p40=mc["p40"],
        aggregate_p50=mc["p50"],
        aggregate_p60=mc["p60"],
        aggregate_p70=mc["p70"],
        aggregate_p80=mc["p80"],
        aggregate_p90=mc["p90"],
        aggregate_p95=mc["p95"],
    )
    db.add(snapshot)
    await db.commit()
    await db.refresh(snapshot)
    return snapshot


@router.get("/snapshots/{snapshot_id}", response_model=SnapshotOut)
async def get_snapshot(snapshot_id: str, db: AsyncSession = Depends(get_session)):
    snapshot = await db.get(Snapshot, snapshot_id)
    if not snapshot:
        raise HTTPException(404, "Snapshot not found")
    return snapshot


@router.delete("/snapshots/{snapshot_id}", status_code=204)
async def delete_snapshot(snapshot_id: str, db: AsyncSession = Depends(get_session)):
    snapshot = await db.get(Snapshot, snapshot_id)
    if not snapshot:
        raise HTTPException(404, "Snapshot not found")
    await db.delete(snapshot)
    await db.commit()
