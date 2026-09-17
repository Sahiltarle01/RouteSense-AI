"""
Application bootstrap only. All real logic lives in routers/services/models.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import user, trip, alert  # noqa: F401  (registers models before create_all)
from app.routers import auth, trips, alerts, profile, dashboard
from app.services.demo_alerts import ensure_demo_alerts

Base.metadata.create_all(bind=engine)

# Seed demo alerts once, at startup, if none exist yet.
_db = SessionLocal()
try:
    ensure_demo_alerts(_db)
finally:
    _db.close()

app = FastAPI(
    title="RouteSense AI API — Version 2",
    description="Trip management workspace for RouteSense AI",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
print(f"[RouteSense V2] CORS allowed origins: {settings.cors_origin_list} (+ any localhost/127.0.0.1 port)")

app.include_router(auth.router)
app.include_router(trips.router)
app.include_router(alerts.router)
app.include_router(profile.router)
app.include_router(dashboard.router)


@app.get("/api/health", tags=["system"])
def health_check():
    return {"status": "ok", "service": "RouteSense AI Backend — Version 2"}
