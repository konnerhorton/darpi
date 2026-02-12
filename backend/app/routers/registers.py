from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import Register
from app.schemas import RegisterCreate, RegisterOut, RegisterUpdate

router = APIRouter(tags=["registers"])


@router.post("/registers", response_model=RegisterOut, status_code=201)
async def create_register(body: RegisterCreate, db: AsyncSession = Depends(get_session)):
    reg = Register(name=body.name, description=body.description)
    db.add(reg)
    await db.commit()
    await db.refresh(reg)
    return reg


@router.get("/registers", response_model=list[RegisterOut])
async def list_registers(db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Register).order_by(Register.created_at))
    return result.scalars().all()


@router.get("/registers/{register_id}", response_model=RegisterOut)
async def get_register(register_id: str, db: AsyncSession = Depends(get_session)):
    reg = await db.get(Register, register_id)
    if not reg:
        raise HTTPException(404, "Register not found")
    return reg


@router.patch("/registers/{register_id}", response_model=RegisterOut)
async def update_register(register_id: str, body: RegisterUpdate, db: AsyncSession = Depends(get_session)):
    reg = await db.get(Register, register_id)
    if not reg:
        raise HTTPException(404, "Register not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(reg, field, value)
    await db.commit()
    await db.refresh(reg)
    return reg


@router.delete("/registers/{register_id}", status_code=204)
async def delete_register(register_id: str, db: AsyncSession = Depends(get_session)):
    reg = await db.get(Register, register_id)
    if not reg:
        raise HTTPException(404, "Register not found")
    await db.delete(reg)
    await db.commit()
