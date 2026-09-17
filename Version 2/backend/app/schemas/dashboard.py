from pydantic import BaseModel


class DashboardSummaryOut(BaseModel):
    total_trips: int
    planned_trips: int
    active_trips: int
    completed_trips: int
    recent_trips: list
