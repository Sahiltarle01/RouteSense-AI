def test_get_profile_requires_authentication(client):
    response = client.get("/api/profile")
    assert response.status_code == 401


def test_get_profile_returns_current_user(client, auth_headers, registered_user):
    response = client.get("/api/profile", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == registered_user["email"]
    assert "password" not in body
    assert "password_hash" not in body


def test_update_profile_name_and_phone(client, auth_headers):
    response = client.put("/api/profile", json={
        "full_name": "Updated Name",
        "phone_number": "9000000000",
    }, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["full_name"] == "Updated Name"
    assert body["phone_number"] == "9000000000"


def test_update_password_requires_correct_current_password(client, auth_headers):
    response = client.put("/api/profile", json={
        "current_password": "WrongCurrentPassword1",
        "new_password": "NewPassword123",
    }, headers=auth_headers)
    assert response.status_code == 400


def test_update_password_succeeds_with_correct_current_password(client, auth_headers, registered_user):
    response = client.put("/api/profile", json={
        "current_password": registered_user["password"],
        "new_password": "NewPassword123",
    }, headers=auth_headers)
    assert response.status_code == 200

    # Old password should no longer work; new one should.
    login_old = client.post("/api/auth/login", json={
        "email": registered_user["email"], "password": registered_user["password"],
    })
    assert login_old.status_code == 401

    login_new = client.post("/api/auth/login", json={
        "email": registered_user["email"], "password": "NewPassword123",
    })
    assert login_new.status_code == 200
