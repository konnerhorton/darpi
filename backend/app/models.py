import uuid
from datetime import datetime, timezone

from sqlalchemy import ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Register(Base):
    __tablename__ = "registers"

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(default=_now)
    updated_at: Mapped[datetime] = mapped_column(default=_now, onupdate=_now)

    risks: Mapped[list["Risk"]] = relationship(back_populates="register", cascade="all, delete-orphan")
    mitigations: Mapped[list["Mitigation"]] = relationship(back_populates="register", cascade="all, delete-orphan")
    snapshots: Mapped[list["Snapshot"]] = relationship(back_populates="register", cascade="all, delete-orphan")


class Risk(Base):
    __tablename__ = "risks"
    __table_args__ = (UniqueConstraint("register_id", "display_id"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=_uuid)
    register_id: Mapped[str] = mapped_column(ForeignKey("registers.id", ondelete="CASCADE"))
    display_id: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False, default="")
    description: Mapped[str | None] = mapped_column(Text, default=None)
    category: Mapped[str | None] = mapped_column(Text, default=None)
    probability: Mapped[float | None] = mapped_column(default=None)
    cost_single: Mapped[float | None] = mapped_column(default=None)
    cost_min: Mapped[float | None] = mapped_column(default=None)
    cost_expected: Mapped[float | None] = mapped_column(default=None)
    cost_max: Mapped[float | None] = mapped_column(default=None)
    notes: Mapped[str | None] = mapped_column(Text, default=None)
    sort_order: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(default=_now)
    updated_at: Mapped[datetime] = mapped_column(default=_now, onupdate=_now)

    register: Mapped["Register"] = relationship(back_populates="risks")
    comments: Mapped[list["CellComment"]] = relationship(back_populates="risk", cascade="all, delete-orphan")
    risk_mitigations: Mapped[list["RiskMitigation"]] = relationship(back_populates="risk", cascade="all, delete-orphan")


class Mitigation(Base):
    __tablename__ = "mitigations"
    __table_args__ = (UniqueConstraint("register_id", "display_id"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=_uuid)
    register_id: Mapped[str] = mapped_column(ForeignKey("registers.id", ondelete="CASCADE"))
    display_id: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False, default="")
    description: Mapped[str | None] = mapped_column(Text, default=None)
    notes: Mapped[str | None] = mapped_column(Text, default=None)
    sort_order: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(default=_now)
    updated_at: Mapped[datetime] = mapped_column(default=_now, onupdate=_now)

    register: Mapped["Register"] = relationship(back_populates="mitigations")
    risk_mitigations: Mapped[list["RiskMitigation"]] = relationship(back_populates="mitigation", cascade="all, delete-orphan")
    comments: Mapped[list["CellComment"]] = relationship(back_populates="mitigation", cascade="all, delete-orphan")


class RiskMitigation(Base):
    __tablename__ = "risk_mitigations"
    __table_args__ = (UniqueConstraint("risk_id", "mitigation_id"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=_uuid)
    risk_id: Mapped[str] = mapped_column(ForeignKey("risks.id", ondelete="CASCADE"))
    mitigation_id: Mapped[str] = mapped_column(ForeignKey("mitigations.id", ondelete="CASCADE"))
    notes: Mapped[str | None] = mapped_column(Text, default=None)

    risk: Mapped["Risk"] = relationship(back_populates="risk_mitigations")
    mitigation: Mapped["Mitigation"] = relationship(back_populates="risk_mitigations")


class CellComment(Base):
    __tablename__ = "cell_comments"

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=_uuid)
    risk_id: Mapped[str | None] = mapped_column(ForeignKey("risks.id", ondelete="CASCADE"), nullable=True)
    mitigation_id: Mapped[str | None] = mapped_column(ForeignKey("mitigations.id", ondelete="CASCADE"), nullable=True)
    column_key: Mapped[str] = mapped_column(Text, nullable=False)
    author_name: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    proposed_value: Mapped[str | None] = mapped_column(Text, default=None)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(default=_now)

    risk: Mapped["Risk | None"] = relationship(back_populates="comments")
    mitigation: Mapped["Mitigation | None"] = relationship(back_populates="comments")


class Snapshot(Base):
    __tablename__ = "snapshots"

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=_uuid)
    register_id: Mapped[str] = mapped_column(ForeignKey("registers.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    aggregate_expected_cost: Mapped[float | None] = mapped_column(default=None)
    aggregate_mean: Mapped[float | None] = mapped_column(default=None)
    aggregate_std_dev: Mapped[float | None] = mapped_column(default=None)
    aggregate_p10: Mapped[float | None] = mapped_column(default=None)
    aggregate_p20: Mapped[float | None] = mapped_column(default=None)
    aggregate_p30: Mapped[float | None] = mapped_column(default=None)
    aggregate_p40: Mapped[float | None] = mapped_column(default=None)
    aggregate_p50: Mapped[float | None] = mapped_column(default=None)
    aggregate_p60: Mapped[float | None] = mapped_column(default=None)
    aggregate_p70: Mapped[float | None] = mapped_column(default=None)
    aggregate_p80: Mapped[float | None] = mapped_column(default=None)
    aggregate_p90: Mapped[float | None] = mapped_column(default=None)
    aggregate_p95: Mapped[float | None] = mapped_column(default=None)
    risk_count: Mapped[int | None] = mapped_column(default=None)
    data: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=_now)

    register: Mapped["Register"] = relationship(back_populates="snapshots")
