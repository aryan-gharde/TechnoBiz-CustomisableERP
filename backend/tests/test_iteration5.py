"""
Iteration 5 backend tests: Budgets CRUD (GET/POST/DELETE /api/finance/budgets)
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


@pytest.fixture(scope="module")
def auth():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    requests.post(f"{BASE_URL}/api/seed", timeout=30)
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": "demo@technobiz.com", "password": "demo123"}, timeout=15)
    assert r.status_code == 200, r.text
    token = r.json().get("token") or r.json().get("access_token")
    assert token, r.json()
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


class TestBudgets:
    def test_get_budgets_returns_list(self, auth):
        r = auth.get(f"{BASE_URL}/api/finance/budgets", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # seeded budgets should exist
        assert len(data) >= 1
        b0 = data[0]
        for k in ["id", "category", "budgeted", "period"]:
            assert k in b0, f"Missing field {k} in {b0}"

    def test_create_budget_and_persists(self, auth):
        payload = {
            "category": f"TEST_Cat_{int(time.time())}",
            "budgeted": 50000.0,
            "actual": 12345.5,
            "period": "Monthly",
        }
        r = auth.post(f"{BASE_URL}/api/finance/budgets", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["category"] == payload["category"]
        assert created["budgeted"] == payload["budgeted"]
        assert created["actual"] == payload["actual"]
        assert created["period"] == payload["period"]
        assert "id" in created and isinstance(created["id"], str)

        # Verify persistence via GET
        lst = auth.get(f"{BASE_URL}/api/finance/budgets").json()
        assert any(b.get("id") == created["id"] for b in lst), "created budget not found in list"

        # cleanup
        auth.delete(f"{BASE_URL}/api/finance/budgets/{created['id']}")

    def test_create_budget_without_actual_defaults_to_zero(self, auth):
        payload = {
            "category": f"TEST_NoActual_{int(time.time())}",
            "budgeted": 25000,
            "period": "Quarterly",
        }
        r = auth.post(f"{BASE_URL}/api/finance/budgets", json=payload, timeout=15)
        assert r.status_code == 200
        created = r.json()
        assert created.get("actual") in (0, 0.0)
        auth.delete(f"{BASE_URL}/api/finance/budgets/{created['id']}")

    def test_delete_budget_removes_it(self, auth):
        payload = {
            "category": f"TEST_Del_{int(time.time())}",
            "budgeted": 1000,
            "actual": 0,
            "period": "Monthly",
        }
        c = auth.post(f"{BASE_URL}/api/finance/budgets", json=payload).json()
        bid = c["id"]
        # ensure present
        assert any(b.get("id") == bid for b in auth.get(f"{BASE_URL}/api/finance/budgets").json())

        dr = auth.delete(f"{BASE_URL}/api/finance/budgets/{bid}", timeout=15)
        assert dr.status_code == 200
        assert dr.json().get("ok") is True

        # confirm removed
        after = auth.get(f"{BASE_URL}/api/finance/budgets").json()
        assert not any(b.get("id") == bid for b in after), "budget still present after delete"

    def test_create_budget_validation_rejects_missing_fields(self, auth):
        # missing budgeted
        r = auth.post(f"{BASE_URL}/api/finance/budgets",
                      json={"category": "X", "period": "Monthly"})
        assert r.status_code in (400, 422)
