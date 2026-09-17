from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.trip import Trip, TripStatus, ALLOWED_STATUS_TRANSITIONS
from app.models.user import User
from app.schemas.trip import TripCreateRequest, TripOut, TripStatusUpdateRequest
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/trips", tags=["trips"])


def _get_owned_trip_or_404(trip_id: int, current_user: User, db: Session) -> Trip:
    """
    Fetches a trip and verifies it belongs to the authenticated user.
    Deliberately returns 404 (not 403) for a trip owned by someone else --
    this avoids confirming to a caller that a given trip ID exists at all
    for a user they don't have access to.
    """
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return trip


@router.post("", response_model=TripOut, status_code=status.HTTP_201_CREATED)
def create_trip(
    payload: TripCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # user_id always comes from the authenticated token, never from the
    # request body -- the client cannot create a trip on someone else's
    # behalf by sending a different id.
    trip = Trip(
        user_id=current_user.id,
        trip_name=payload.trip_name,
        origin=payload.origin,
        destination=payload.destination,
        cargo_type=payload.cargo_type,
        priority=payload.priority,
        notes=payload.notes,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


@router.get("", response_model=list[TripOut])
def list_my_trips(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(Trip)
        .filter(Trip.user_id == current_user.id)
        .order_by(Trip.created_at.desc())
        .all()
    )


@router.get("/{trip_id}", response_model=TripOut)
def get_trip(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _get_owned_trip_or_404(trip_id, current_user, db)


@router.put("/{trip_id}/status", response_model=TripOut)
def update_trip_status(
    trip_id: int,
    payload: TripStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = _get_owned_trip_or_404(trip_id, current_user, db)

    allowed_next = ALLOWED_STATUS_TRANSITIONS.get(trip.status, set())
    if payload.status not in allowed_next:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change status from {trip.status.value} to {payload.status.value}",
        )

    trip.status = payload.status
    db.commit()
    db.refresh(trip)
    return trip


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = _get_owned_trip_or_404(trip_id, current_user, db)

    # Deletion only makes sense for trips that never really happened
    # (Planned, never started) or were explicitly Cancelled. Active and
    # Completed trips are real operational history and should not be
    # destroyable -- that's what Cancel (a status change) is for.
    if trip.status not in (TripStatus.PLANNED, TripStatus.CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete a trip with status '{trip.status.value}'. Cancel it first if needed.",
        )

    db.delete(trip)
    db.commit()
    return None
