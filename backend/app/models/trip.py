import enum
from app.utils.time import utc_now

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import relationship

from app.database import Base


class CargoType(str, enum.Enum):
    MEDICINE = "medicine"
    FOOD = "food"
    EMERGENCY_SUPPLIES = "emergency_supplies"
    RELIEF_MATERIALS = "relief_materials"
    GENERAL_ESSENTIAL_GOODS = "general_essential_goods"
    OTHER = "other"


class TripPriority(str, enum.Enum):
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class TripStatus(str, enum.Enum):
    PLANNED = "planned"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# Allowed transitions, enforced server-side (not just in the UI) per spec.
ALLOWED_STATUS_TRANSITIONS = {
    TripStatus.PLANNED: {TripStatus.ACTIVE, TripStatus.CANCELLED},
    TripStatus.ACTIVE: {TripStatus.COMPLETED, TripStatus.CANCELLED},
    TripStatus.COMPLETED: set(),
    TripStatus.CANCELLED: set(),
}


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    trip_name = Column(String(150), nullable=False)
    origin = Column(String(120), nullable=False)
    destination = Column(String(120), nullable=False)
    cargo_type = Column(SAEnum(CargoType), nullable=False)
    priority = Column(SAEnum(TripPriority), nullable=False, default=TripPriority.NORMAL)
    status = Column(SAEnum(TripStatus), nullable=False, default=TripStatus.PLANNED)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    owner = relationship("User")
