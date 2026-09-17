"""
SQLAlchemy engine + session management. SQLite for local development;
swapping to PostgreSQL only requires changing DATABASE_URL in .env.
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings


def _resolve_database_url(url: str) -> str:
    """Anchors a relative SQLite path to backend/ instead of the process's
    current working directory, so seeding and serving can never point at
    two different files depending on where each was launched from."""
    prefix = "sqlite:///"
    if url.startswith(prefix) and not url.startswith("sqlite:////"):
        relative_path = url[len(prefix):]
        if not os.path.isabs(relative_path):
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            absolute_path = os.path.normpath(os.path.join(backend_dir, relative_path))
            return f"{prefix}{absolute_path}"
    return url


DATABASE_URL = _resolve_database_url(settings.database_url)
print(f"[RouteSense V2] Using database: {DATABASE_URL}")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
