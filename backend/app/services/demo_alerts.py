"""
Seeds a fixed set of DEMO alerts on startup if none exist yet. Version 2
has no live weather/incident feed -- these are explicitly simulated
(is_demo=True) so the API/UI never has to pretend otherwise. Replacing
this with a real feed in a later version is a matter of adding a new
ingestion path, not changing this shape.
"""
from sqlalchemy.orm import Session

from app.models.alert import Alert, AlertSeverity, AlertType

_DEMO_ALERTS = [
    {
        "title": "Demo Alert — Heavy rainfall may affect selected routes",
        "description": "Simulated data: sustained heavy rainfall has been modeled along hill routes near Shillong. Expect potential delays if traveling this corridor.",
        "alert_type": AlertType.HEAVY_RAINFALL,
        "severity": AlertSeverity.MEDIUM,
        "location": "Shillong, Meghalaya",
    },
    {
        "title": "Demo Alert — Landslide risk on mountain corridor",
        "description": "Simulated data: terrain and rainfall modeling suggests elevated landslide risk near Tawang. This is not a live geological survey feed.",
        "alert_type": AlertType.LANDSLIDE_RISK,
        "severity": AlertSeverity.HIGH,
        "location": "Tawang, Arunachal Pradesh",
    },
    {
        "title": "Demo Alert — Road blockage reported",
        "description": "Simulated data: a road segment near Dimapur is modeled as blocked. Real field-reported incidents arrive in a future version.",
        "alert_type": AlertType.ROAD_BLOCKAGE,
        "severity": AlertSeverity.CRITICAL,
        "location": "Dimapur, Nagaland",
    },
    {
        "title": "Demo Alert — Route delay expected",
        "description": "Simulated data: general road conditions suggest longer-than-usual travel time between Guwahati and Tezpur.",
        "alert_type": AlertType.ROUTE_DELAY,
        "severity": AlertSeverity.LOW,
        "location": "Guwahati – Tezpur corridor",
    },
]


def ensure_demo_alerts(db: Session) -> None:
    if db.query(Alert).count() > 0:
        return  # Don't reseed/duplicate on every restart.

    for data in _DEMO_ALERTS:
        db.add(Alert(is_demo=True, **data))
    db.commit()
