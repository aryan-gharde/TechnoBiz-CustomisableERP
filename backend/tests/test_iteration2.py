"""TechnoBiz Smart ERP — Iteration 2 backend tests.

Covers new endpoints: /api/insights/forecast, /api/inventory/auto-po, /api/drilldown/{kpi}.
"""
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@technobiz.com"
DEMO_PASSWORD = "demo123"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def hdrs(session):
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=20)
    if r.status_code != 200:
        session.post(f"{API}/seed", timeout=60)
        r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=20)
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['token']}", "Content-Type": "application/json"}


# ---------- Forecast ----------
class TestForecast:
    def test_forecast_shape(self, session, hdrs):
        r = session.get(f"{API}/insights/forecast", headers=hdrs, timeout=20)
        assert r.status_code == 200
        d = r.json()
        # accuracy 80..100
        assert isinstance(d["accuracy"], (int, float))
        assert 80 <= d["accuracy"] <= 100, f"accuracy {d['accuracy']} out of range"
        assert d["confidence"] in ("high", "medium")
        assert d["trend"] in ("improving", "stable", "declining")
        # 12 points
        assert isinstance(d["points"], list) and len(d["points"]) == 12
        for p in d["points"]:
            assert "week" in p
            for key in ("actual_in", "actual_out", "predicted_in", "predicted_out"):
                assert key in p

    def test_forecast_unauth(self, session):
        r = session.get(f"{API}/insights/forecast", timeout=20)
        assert r.status_code == 401


# ---------- Auto-PO ----------
class TestAutoPO:
    def test_auto_po_creates_drafts(self, session, hdrs):
        # Snapshot existing PO count
        before = session.get(f"{API}/inventory/purchase-orders", headers=hdrs, timeout=20).json()
        alerts = session.get(f"{API}/inventory/alerts", headers=hdrs, timeout=20).json()
        low_count = len(alerts["low_stock"])

        r = session.post(f"{API}/inventory/auto-po", headers=hdrs, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "count" in d and "low_stock_count" in d and "created" in d
        assert d["low_stock_count"] == low_count
        if low_count == 0:
            assert d["count"] == 0
            return
        assert d["count"] >= 1
        for c in d["created"]:
            assert "po_number" in c and c["po_number"].startswith("PO-AI-")
            assert "supplier" in c
            assert "items" in c and isinstance(c["items"], int)
            assert "total" in c

        # Verify persistence in purchase-orders list
        after = session.get(f"{API}/inventory/purchase-orders", headers=hdrs, timeout=20).json()
        assert len(after) >= len(before) + d["count"]
        ai_pos = [p for p in after if p.get("po_number", "").startswith("PO-AI-")]
        assert len(ai_pos) >= d["count"]
        # All AI POs must be drafts
        for p in ai_pos:
            assert p["status"] == "draft"


# ---------- Drilldown ----------
class TestDrilldown:
    @pytest.mark.parametrize("kpi", ["revenue", "expenses", "stock-value", "low-stock", "receivables"])
    def test_drilldown_with_items_and_groups(self, session, hdrs, kpi):
        r = session.get(f"{API}/drilldown/{kpi}", headers=hdrs, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "total" in d and "count" in d and "items" in d
        assert isinstance(d["items"], list)
        assert isinstance(d["count"], int)
        if kpi != "low-stock":
            assert "by_group" in d
            assert isinstance(d["by_group"], list)

    def test_drilldown_profit(self, session, hdrs):
        r = session.get(f"{API}/drilldown/profit", headers=hdrs, timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("revenue", "expenses", "profit", "margin"):
            assert k in d
            assert isinstance(d[k], (int, float))

    def test_drilldown_unknown_returns_404(self, session, hdrs):
        r = session.get(f"{API}/drilldown/unknown-xyz", headers=hdrs, timeout=20)
        assert r.status_code == 404

    def test_drilldown_unauth(self, session):
        r = session.get(f"{API}/drilldown/revenue", timeout=20)
        assert r.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
