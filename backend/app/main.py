"""
Application bootstrap only. All real logic lives in routers/services/models.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.models import user  # noqa: F401  (ensures model is registered before create_all)
from app.routers import auth

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RouteSense AI API",
    description="Smart logistics and accessibility platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
print(f"[RouteSense] CORS allowed origins: {settings.cors_origin_list} (+ any localhost/127.0.0.1 port)")

app.include_router(auth.router)


@app.get("/api/health", tags=["system"])
def health_check():
    return {"status": "ok", "service": "RouteSense AI Backend"}
