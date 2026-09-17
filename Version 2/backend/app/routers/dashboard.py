from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.trip import Trip, TripStatus
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryOut
from app.utils.security import get_current_user
from app.utils.time import serialize_utc

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryOut)
def dashboard_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    base_query = db.query(Trip).filter(Trip.user_id == current_user.id)

    total_trips = base_query.count()
    planned_trips = base_query.filter(Trip.status == TripStatus.PLANNED).count()
    active_trips = base_query.filter(Trip.status == TripStatus.ACTIVE).count()
    completed_trips = base_query.filter(Trip.status == TripStatus.COMPLETED).count()

    recent = base_query.order_by(Trip.created_at.desc()).limit(5).all()
    recent_trips = [
        {
            "id": t.id,
            "trip_name": t.trip_name,
            "origin": t.origin,
            "destination": t.destination,
            "priority": t.priority.value,
            "status": t.status.value,
            # recent_trips is a raw list (see schemas/dashboard.py), so
            # Pydantic will NOT apply UTCDateTime's serializer here --
            # this must be converted explicitly, or it reproduces the
            # exact same "no timezone marker" bug as the naive-datetime
            # default did.
            "created_at": serialize_utc(t.created_at),
        }
        for t in recent
    ]

    return DashboardSummaryOut(
        total_trips=total_trips,
        planned_trips=planned_trips,
        active_trips=active_trips,
        completed_trips=completed_trips,
        recent_trips=recent_trips,
    )
