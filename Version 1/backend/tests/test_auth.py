"""
Automated tests for the Phase 1 authentication system.

Run with (from backend/, after installing requirements.txt):
    pytest -v
"""


def test_register_new_user(client):
    response = client.post("/api/auth/register", json={
        "full_name": "Ada Lovelace",
        "email": "ada@example.com",
        "phone_number": "9876500000",
        "password": "Password123",
        "confirm_password": "Password123",
    })
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "ada@example.com"
    assert body["full_name"] == "Ada Lovelace"
    # Password hash must never be exposed through the API.
    assert "password" not in body
    assert "password_hash" not in body


def test_register_rejects_password_mismatch(client):
    response = client.post("/api/auth/register", json={
        "full_name": "Ada Lovelace",
        "email": "ada2@example.com",
        "phone_number": "9876500000",
        "password": "Password123",
        "confirm_password": "Password999",
    })
    assert response.status_code == 422


def test_register_rejects_weak_password(client):
    response = client.post("/api/auth/register", json={
        "full_name": "Ada Lovelace",
        "email": "ada3@example.com",
        "phone_number": "9876500000",
        "password": "weak",
        "confirm_password": "weak",
    })
    assert response.status_code == 422


def test_duplicate_registration_is_rejected(client, registered_user):
    response = client.post("/api/auth/register", json=registered_user)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()


def test_valid_login_succeeds(client, registered_user):
    response = client.post("/api/auth/login", json={
        "email": registered_user["email"],
        "password": registered_user["password"],
    })
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["user"]["email"] == registered_user["email"]


def test_login_with_invalid_password_is_rejected(client, registered_user):
    response = client.post("/api/auth/login", json={
        "email": registered_user["email"],
        "password": "WrongPassword123",
    })
    assert response.status_code == 401
    assert "password" in response.json()["detail"].lower()


def test_login_with_unknown_email_is_rejected(client):
    response = client.post("/api/auth/login", json={
        "email": "doesnotexist@example.com",
        "password": "Password123",
    })
    assert response.status_code == 404
    assert "no account found" in response.json()["detail"].lower()


def test_protected_endpoint_without_token_is_rejected(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_protected_endpoint_with_valid_token_succeeds(client, registered_user):
    login_response = client.post("/api/auth/login", json={
        "email": registered_user["email"],
        "password": registered_user["password"],
    })
    token = login_response.json()["access_token"]

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == registered_user["email"]


def test_protected_endpoint_with_garbage_token_is_rejected(client):
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401


def test_logout_endpoint_responds_successfully(client):
    response = client.post("/api/auth/logout")
    assert response.status_code == 200


def test_remember_me_grants_a_longer_lived_token(client, registered_user):
    import jose.jwt as jwt
    from app.config import settings

    short = client.post("/api/auth/login", json={
        "email": registered_user["email"], "password": registered_user["password"], "remember_me": False,
    }).json()["access_token"]
    long = client.post("/api/auth/login", json={
        "email": registered_user["email"], "password": registered_user["password"], "remember_me": True,
    }).json()["access_token"]

    short_exp = jwt.decode(short, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])["exp"]
    long_exp = jwt.decode(long, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])["exp"]
    assert long_exp > short_exp
