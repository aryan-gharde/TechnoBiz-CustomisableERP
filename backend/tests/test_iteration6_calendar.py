"""Iteration 6 — Global Calendar /api/calendar/events tests."""
import os
import pytest
import requests
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "http://localhost:8001"


@pytest.fixture(scope="module")
def auth_token():
    # Re-seed first to ensure data exists
    requests.post(f"{BASE_URL}/api/seed", timeout=30)
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "demo@technobiz.com", "password": "demo123"},
        timeout=15,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_client(auth_token):
    s = requests.Session()
    s.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
    })
    return s


# ---------- Calendar aggregation ----------
class TestCalendarEvents:
    def test_basic_aggregation_returns_events(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/calendar/events", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0, "expected aggregated events from seed data"

    def test_event_schema_fields(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/calendar/events", timeout=20)
        assert r.status_code == 200
        events = r.json()
        required = {"id", "type", "date", "title", "subtitle", "amount", "status", "link", "severity"}
        for e in events:
            missing = required - set(e.keys())
            assert not missing, f"event missing fields {missing}: {e}"
            # Date in YYYY-MM-DD
            assert len(e["date"]) == 10 and e["date"][4] == "-" and e["date"][7] == "-", e["date"]
            assert e["type"] in {"invoice", "payable", "approval", "po", "gst", "stock"}, e["type"]
            assert e["severity"] in {"danger", "warning", "info"}, e["severity"]

    def test_types_present(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/calendar/events", timeout=20)
        events = r.json()
        types_seen = {e["type"] for e in events}
        # gst is unconditionally appended; invoice/payable/po expected from seed
        assert "gst" in types_seen, types_seen
        # At least one of finance items
        assert types_seen & {"invoice", "payable", "po"}, types_seen

    def test_sorted_by_date_asc(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/calendar/events", timeout=20)
        events = r.json()
        dates = [e["date"] for e in events]
        assert dates == sorted(dates), "events must be sorted ascending by date"

    def test_date_window_tight_reduces_count(self, auth_client):
        # Get full set
        full = auth_client.get(f"{BASE_URL}/api/calendar/events", timeout=20).json()
        assert len(full) > 0
        # Tight window — single day matching one event date
        target_date = full[0]["date"]
        narrow = auth_client.get(
            f"{BASE_URL}/api/calendar/events",
            params={"date_from": target_date, "date_to": target_date},
            timeout=20,
        ).json()
        assert len(narrow) <= len(full)
        for e in narrow:
            assert e["date"] == target_date

    def test_date_window_future_returns_only_future(self, auth_client):
        # Pick a window 1 year out — should be much smaller (or empty)
        future_from = (datetime.utcnow() + timedelta(days=400)).strftime("%Y-%m-%d")
        future_to = (datetime.utcnow() + timedelta(days=500)).strftime("%Y-%m-%d")
        r = auth_client.get(
            f"{BASE_URL}/api/calendar/events",
            params={"date_from": future_from, "date_to": future_to},
            timeout=20,
        )
        assert r.status_code == 200
        for e in r.json():
            assert future_from <= e["date"] <= future_to

    def test_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/calendar/events", timeout=15)
        # Either 401 or 403 acceptable for unauthorized
        assert r.status_code in (401, 403), f"expected auth error, got {r.status_code}"


# ---------- Regression smoke ----------
class TestRegression:
    def test_budgets_list(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/finance/budgets", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_invoices_list(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/finance/invoices", timeout=15)
        assert r.status_code == 200
