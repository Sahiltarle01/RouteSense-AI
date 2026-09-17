"""
Run with (from backend/, after installing requirements.txt):
    pytest -v
"""

VALID_TRIP = {
    "trip_name": "Medicine Delivery",
    "origin": "Guwahati",
    "destination": "Tawang",
    "cargo_type": "medicine",
    "priority": "critical",
    "notes": "Cold-chain sensitive",
}


def test_create_trip_while_authenticated(client, auth_headers):
    response = client.post("/api/trips", json=VALID_TRIP, headers=auth_headers)
    assert response.status_code == 201
    body = response.json()
    assert body["trip_name"] == "Medicine Delivery"
    assert body["status"] == "planned"


def test_create_trip_without_authentication_is_rejected(client):
    response = client.post("/api/trips", json=VALID_TRIP)
    assert response.status_code == 401


def test_get_users_trips_returns_only_their_own(client, auth_headers, other_user_auth_headers):
    client.post("/api/trips", json=VALID_TRIP, headers=auth_headers)
    client.post("/api/trips", json={**VALID_TRIP, "trip_name": "Other user's trip"}, headers=other_user_auth_headers)

    response = client.get("/api/trips", headers=auth_headers)
    assert response.status_code == 200
    trips = response.json()
    assert len(trips) == 1
    assert trips[0]["trip_name"] == "Medicine Delivery"


def test_user_cannot_access_another_users_trip(client, auth_headers, other_user_auth_headers):
    created = client.post("/api/trips", json=VALID_TRIP, headers=auth_headers).json()
    trip_id = created["id"]

    response = client.get(f"/api/trips/{trip_id}", headers=other_user_auth_headers)
    assert response.status_code == 404  # not 403 -- doesn't confirm the trip exists


def test_get_trip_details(client, auth_headers):
    created = client.post("/api/trips", json=VALID_TRIP, headers=auth_headers).json()
    response = client.get(f"/api/trips/{created['id']}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["destination"] == "Tawang"


def test_update_trip_status_valid_transition(client, auth_headers):
    created = client.post("/api/trips", json=VALID_TRIP, headers=auth_headers).json()
    response = client.put(f"/api/trips/{created['id']}/status", json={"status": "active"}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "active"


def test_invalid_status_transition_is_rejected(client, auth_headers):
    created = client.post("/api/trips", json=VALID_TRIP, headers=auth_headers).json()
    # Planned -> Completed is not an allowed transition (must go through Active).
    response = client.put(f"/api/trips/{created['id']}/status", json={"status": "completed"}, headers=auth_headers)
    assert response.status_code == 400


def test_delete_planned_trip(client, auth_headers):
    created = client.post("/api/trips", json=VALID_TRIP, headers=auth_headers).json()
    response = client.delete(f"/api/trips/{created['id']}", headers=auth_headers)
    assert response.status_code == 204

    get_response = client.get(f"/api/trips/{created['id']}", headers=auth_headers)
    assert get_response.status_code == 404


def test_cannot_delete_active_trip(client, auth_headers):
    created = client.post("/api/trips", json=VALID_TRIP, headers=auth_headers).json()
    client.put(f"/api/trips/{created['id']}/status", json={"status": "active"}, headers=auth_headers)

    response = client.delete(f"/api/trips/{created['id']}", headers=auth_headers)
    assert response.status_code == 400
