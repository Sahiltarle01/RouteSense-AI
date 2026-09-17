def test_list_alerts_requires_authentication(client):
    response = client.get("/api/alerts")
    assert response.status_code == 401


def test_list_alerts_returns_seeded_demo_alerts(client, auth_headers):
    response = client.get("/api/alerts", headers=auth_headers)
    assert response.status_code == 200
    alerts = response.json()
    assert len(alerts) > 0
    # Every Version 2 alert must be explicitly marked as demo data.
    assert all(a["is_demo"] is True for a in alerts)


def test_mark_alert_as_read(client, auth_headers):
    alerts = client.get("/api/alerts", headers=auth_headers).json()
    alert_id = alerts[0]["id"]

    response = client.put(f"/api/alerts/{alert_id}/read", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["is_read"] is True
