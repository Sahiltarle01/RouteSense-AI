"""
Regression tests for the timestamp/timezone bug: every timestamp the API
returns must be an unambiguous UTC ISO-8601 string (ending in 'Z' or
carrying an explicit offset), never a bare naive string a browser's
`new Date(...)` could misread as local time.
"""
import re

UTC_TIMESTAMP_PATTERN = re.compile(r"(Z|[+-]\d{2}:\d{2})$")


def test_user_created_at_is_unambiguous_utc(client, registered_user, auth_headers):
    response = client.get("/api/profile", headers=auth_headers)
    assert response.status_code == 200
    created_at = response.json()["created_at"]
    assert UTC_TIMESTAMP_PATTERN.search(created_at), f"created_at '{created_at}' has no timezone marker"


def test_trip_timestamps_are_unambiguous_utc(client, auth_headers):
    response = client.post("/api/trips", json={
        "trip_name": "Timezone Check Trip",
        "origin": "Guwahati",
        "destination": "Shillong",
        "cargo_type": "medicine",
        "priority": "normal",
    }, headers=auth_headers)
    assert response.status_code == 201
    body = response.json()
    assert UTC_TIMESTAMP_PATTERN.search(body["created_at"]), f"created_at '{body['created_at']}' has no timezone marker"
    assert UTC_TIMESTAMP_PATTERN.search(body["updated_at"]), f"updated_at '{body['updated_at']}' has no timezone marker"


def test_updated_at_changes_after_status_update(client, auth_headers):
    created = client.post("/api/trips", json={
        "trip_name": "Update Check Trip",
        "origin": "Guwahati",
        "destination": "Dimapur",
        "cargo_type": "food",
        "priority": "normal",
    }, headers=auth_headers).json()

    response = client.put(f"/api/trips/{created['id']}/status", json={"status": "active"}, headers=auth_headers)
    assert response.status_code == 200
    updated = response.json()
    # updated_at must have moved forward from created_at, and both must
    # still be unambiguous UTC.
    assert UTC_TIMESTAMP_PATTERN.search(updated["updated_at"])
    assert updated["updated_at"] >= updated["created_at"]


def test_alert_created_at_is_unambiguous_utc(client, auth_headers):
    response = client.get("/api/alerts", headers=auth_headers)
    assert response.status_code == 200
    alerts = response.json()
    assert len(alerts) > 0
    for alert in alerts:
        assert UTC_TIMESTAMP_PATTERN.search(alert["created_at"]), f"alert created_at '{alert['created_at']}' has no timezone marker"


def test_dashboard_recent_trips_timestamps_are_unambiguous_utc(client, auth_headers):
    client.post("/api/trips", json={
        "trip_name": "Dashboard Timezone Check",
        "origin": "Guwahati",
        "destination": "Kohima",
        "cargo_type": "other",
        "priority": "normal",
    }, headers=auth_headers)

    response = client.get("/api/dashboard/summary", headers=auth_headers)
    assert response.status_code == 200
    recent = response.json()["recent_trips"]
    assert len(recent) > 0
    for trip in recent:
        assert UTC_TIMESTAMP_PATTERN.search(trip["created_at"]), (
            f"dashboard recent_trips created_at '{trip['created_at']}' has no timezone marker "
            "-- this is the raw dict path (not a Pydantic schema field), it's easy to "
            "regress this one independently of the schema-based fields above"
        )
