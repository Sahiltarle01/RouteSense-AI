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
from app.services.demo_alerts import ensure_demo_alerts


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    # main.py seeds demo alerts once against the REAL production engine at
    # import time -- that seeding never touches this fresh in-memory test
    # database, so we repeat it here against the test engine directly.
    # Without this, every alert test would see an empty table and fail for
    # a reason that has nothing to do with the alerts feature itself.
    seed_session = TestingSessionLocal()
    try:
        ensure_demo_alerts(seed_session)
    finally:
        seed_session.close()

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


@pytest.fixture()
def auth_headers(client, registered_user):
    """Logs in the registered_user fixture and returns a ready-to-use
    Authorization header, so trip/alert/profile tests don't each have to
    repeat the login boilerplate."""
    response = client.post("/api/auth/login", json={
        "email": registered_user["email"],
        "password": registered_user["password"],
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def other_user_auth_headers(client):
    """A second, distinct user -- used to verify one user can never see
    or modify another user's trips."""
    payload = {
        "full_name": "Other User",
        "email": "otheruser@example.com",
        "phone_number": "9123456780",
        "password": "Password123",
        "confirm_password": "Password123",
    }
    reg = client.post("/api/auth/register", json=payload)
    assert reg.status_code == 201

    login = client.post("/api/auth/login", json={"email": payload["email"], "password": payload["password"]})
    assert login.status_code == 200
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
