"""
Test fixtures: every test gets a fresh, isolated in-memory SQLite database
via dependency override, so tests never touch the real routesense.db file
and never leak state between tests.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def registered_user(client):
    payload = {
        "full_name": "Test User",
        "email": "testuser@example.com",
        "phone_number": "9876543210",
        "password": "Password123",
        "confirm_password": "Password123",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    return payload
