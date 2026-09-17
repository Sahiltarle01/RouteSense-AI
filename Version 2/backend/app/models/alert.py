import enum
from app.utils.time import utc_now

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Enum as SAEnum

from app.database import Base


class AlertSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertType(str, enum.Enum):
    HEAVY_RAINFALL = "heavy_rainfall"
    ROAD_BLOCKAGE = "road_blockage"
    LANDSLIDE_RISK = "landslide_risk"
    FLOOD_RISK = "flood_risk"
    ROUTE_DELAY = "route_delay"


class Alert(Base):
    """
    Version 2 alerts are DEMO/SIMULATED data seeded at startup -- there is
    no live weather/incident feed wired in yet (that's Version 4+). The
    `is_demo` flag exists so the API/UI never has to guess: it's always
    explicit which alerts are real vs simulated, even after real alerts
    are added in a future version.
    """
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    alert_type = Column(SAEnum(AlertType), nullable=False)
    severity = Column(SAEnum(AlertSeverity), nullable=False)
    location = Column(String(120), nullable=False)
    is_read = Column(Boolean, default=False)
    is_demo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now)
