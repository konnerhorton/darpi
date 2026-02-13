from datetime import datetime

from pydantic import BaseModel


# --- Register ---

class RegisterCreate(BaseModel):
    name: str
    description: str | None = None


class RegisterUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class RegisterOut(BaseModel):
    id: str
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Risk ---

class RiskCreate(BaseModel):
    title: str = ""
    description: str | None = None
    category: str | None = None
    probability: float | None = None
    cost_single: float | None = None
    cost_min: float | None = None
    cost_expected: float | None = None
    cost_max: float | None = None
    notes: str | None = None


class RiskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    probability: float | None = None
    cost_single: float | None = None
    cost_min: float | None = None
    cost_expected: float | None = None
    cost_max: float | None = None
    notes: str | None = None
    sort_order: int | None = None


class RiskOut(BaseModel):
    id: str
    register_id: str
    display_id: str
    title: str
    description: str | None
    category: str | None
    probability: float | None
    cost_single: float | None
    cost_min: float | None
    cost_expected: float | None
    cost_max: float | None
    notes: str | None
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReorderItem(BaseModel):
    id: str
    sort_order: int


class ReorderRequest(BaseModel):
    items: list[ReorderItem]


# --- Comments ---

class CommentCreate(BaseModel):
    column_key: str
    author_name: str
    content: str
    proposed_value: str | None = None


class CommentOut(BaseModel):
    id: str
    risk_id: str
    column_key: str
    author_name: str
    content: str
    proposed_value: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
