from datetime import datetime

from pydantic import BaseModel, Field

from app.models.trip import CargoType, TripPriority, TripStatus
from app.utils.time import UTCDateTime


class TripCreateRequest(BaseModel):
    trip_name: str = Field(min_length=2, max_length=150)
    origin: str = Field(min_length=1, max_length=120)
    destination: str = Field(min_length=1, max_length=120)
    cargo_type: CargoType
    priority: TripPriority = TripPriority.NORMAL
    notes: str | None = Field(default=None, max_length=2000)


class TripStatusUpdateRequest(BaseModel):
    status: TripStatus


class TripOut(BaseModel):
    id: int
    trip_name: str
    origin: str
    destination: str
    cargo_type: CargoType
    priority: TripPriority
    status: TripStatus
    notes: str | None
    created_at: UTCDateTime
    updated_at: UTCDateTime

    class Config:
        from_attributes = True
