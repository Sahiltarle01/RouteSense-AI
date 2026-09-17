from app.utils.time import utc_now

from sqlalchemy import Column, Integer, String, DateTime

from app.database import Base


class User(Base):
    """
    A single, flat user type for Phase 1 -- RouteSense is a customer-facing
    product, not an internal ops tool, so there is no role field to
    misconfigure or escalate. If a staff/admin surface is needed later,
    it should be a deliberate, separate addition -- not bolted onto this
    model.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(180), unique=True, index=True, nullable=False)
    phone_number = Column(String(20), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
