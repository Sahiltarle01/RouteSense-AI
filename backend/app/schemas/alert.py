from datetime import datetime

from pydantic import BaseModel

from app.models.alert import AlertSeverity, AlertType
from app.utils.time import UTCDateTime


class AlertOut(BaseModel):
    id: int
    title: str
    description: str
    alert_type: AlertType
    severity: AlertSeverity
    location: str
    is_read: bool
    is_demo: bool
    created_at: UTCDateTime

    class Config:
        from_attributes = True
