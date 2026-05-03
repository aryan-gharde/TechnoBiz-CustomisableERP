"""TechnoBiz Smart ERP — Backend API regression tests.

Covers Auth, Dashboard, Inventory, Finance, AI Insights, Approvals, Notifications.
Run: pytest /app/backend/tests/backend_test.py -v --tb=short \
     --junitxml=/app/test_reports/pytest/pytest_results.xml
"""
import os
import time
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@technobiz.com"
DEMO_PASSWORD = "demo123"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth(session):
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=20)
    if r.status_code != 200:
        # Try seeding then re-login
        session.post(f"{API}/seed", timeout=60)
        r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    return {"token": data["token"], "user": data["user"]}


@pytest.fixture(scope="session")
def hdrs(auth):
    return {"Authorization": f"Bearer {auth['token']}", "Content-Type": "application/json"}


# ---------- Auth ----------
class TestAuth:
    def test_root(self, session):
        r = session.get(f"{API}/", timeout=20)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_login_success(self, session):
        r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and isinstance(d["token"], str) and len(d["token"]) > 10
        assert d["user"]["email"] == DEMO_EMAIL

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"}, timeout=20)
        assert r.status_code == 401

    def test_me_with_token(self, session, hdrs):
        r = session.get(f"{API}/auth/me", headers=hdrs, timeout=20)
        assert r.status_code == 200
        assert r.json()["email"] == DEMO_EMAIL

    def test_me_without_token(self, session):
        r = session.get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 401


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard_payload(self, session, hdrs):
        r = session.get(f"{API}/dashboard", headers=hdrs, timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ("revenue", "expenses", "net_profit", "stock_value", "low_stock", "receivables"):
            assert k in d["kpis"], f"missing kpi {k}"
            kpi = d["kpis"][k]
            assert "value" in kpi and "trend" in kpi and "spark" in kpi
            assert isinstance(kpi["spark"], list) and len(kpi["spark"]) == 12
        assert len(d["cash_flow"]) == 8
        assert len(d["stock_movement"]) == 7
        assert len(d["alerts"]) >= 4
        assert isinstance(d["approvals"], list)
        assert isinstance(d["activity"], list)


# ---------- Inventory ----------
class TestInventory:
    def test_list_products(self, session, hdrs):
        r = session.get(f"{API}/inventory/products", headers=hdrs, timeout=20)
        assert r.status_code == 200
        prods = r.json()
        assert isinstance(prods, list) and len(prods) >= 40

    def test_warehouses(self, session, hdrs):
        r = session.get(f"{API}/inventory/warehouses", headers=hdrs, timeout=20)
        assert r.status_code == 200 and len(r.json()) == 4

    def test_suppliers(self, session, hdrs):
        r = session.get(f"{API}/inventory/suppliers", headers=hdrs, timeout=20)
        assert r.status_code == 200 and len(r.json()) == 4

    def test_alerts(self, session, hdrs):
        r = session.get(f"{API}/inventory/alerts", headers=hdrs, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "low_stock" in d and "dead_stock" in d
        assert isinstance(d["low_stock"], list) and isinstance(d["dead_stock"], list)

    def test_create_product_persist_and_stock_moves(self, session, hdrs):
        wh = session.get(f"{API}/inventory/warehouses", headers=hdrs, timeout=20).json()
        payload = {
            "sku": f"TEST_SKU_{int(time.time())}",
            "name": "TEST_Product Alpha",
            "category": "Steel Bars",
            "quantity": 50,
            "reorder_level": 20,
            "unit_price": 999.0,
            "warehouse_id": wh[0]["id"],
        }
        r = session.post(f"{API}/inventory/products", headers=hdrs, json=payload, timeout=20)
        assert r.status_code == 200, r.text
        prod = r.json()
        assert prod["sku"] == payload["sku"]
        assert "id" in prod
        pid = prod["id"]

        # GET to verify persistence
        prods = session.get(f"{API}/inventory/products", headers=hdrs, timeout=20).json()
        match = [p for p in prods if p["id"] == pid]
        assert len(match) == 1
        assert match[0]["quantity"] == 50

        # Stock-in
        r = session.post(f"{API}/inventory/stock-in", headers=hdrs,
                         json={"product_id": pid, "quantity": 25, "warehouse_id": wh[0]["id"]}, timeout=20)
        assert r.status_code == 200
        prods = session.get(f"{API}/inventory/products", headers=hdrs, timeout=20).json()
        after_in = [p for p in prods if p["id"] == pid][0]
        assert after_in["quantity"] == 75, f"expected 75 got {after_in['quantity']}"

        # Stock-out
        r = session.post(f"{API}/inventory/stock-out", headers=hdrs,
                         json={"product_id": pid, "quantity": 10, "warehouse_id": wh[0]["id"]}, timeout=20)
        assert r.status_code == 200
        prods = session.get(f"{API}/inventory/products", headers=hdrs, timeout=20).json()
        after_out = [p for p in prods if p["id"] == pid][0]
        assert after_out["quantity"] == 65

        # Transfer
        r = session.post(f"{API}/inventory/transfer", headers=hdrs,
                         json={"product_id": pid, "quantity": 5,
                               "from_warehouse_id": wh[0]["id"], "to_warehouse_id": wh[1]["id"]}, timeout=20)
        assert r.status_code == 200
        rec = r.json()
        assert rec["status"] == "completed"

    def test_purchase_orders_flow(self, session, hdrs):
        # List
        r = session.get(f"{API}/inventory/purchase-orders", headers=hdrs, timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

        sup = session.get(f"{API}/inventory/suppliers", headers=hdrs, timeout=20).json()
        # Create
        payload = {"supplier_id": sup[0]["id"],
                   "items": [{"name": "Steel batch", "qty": 50, "price": 200},
                             {"name": "Cement batch", "qty": 30, "price": 500}],
                   "notes": "TEST_PO"}
        r = session.post(f"{API}/inventory/purchase-orders", headers=hdrs, json=payload, timeout=20)
        assert r.status_code == 200
        po = r.json()
        assert po["status"] == "draft"
        assert po["total"] == 50 * 200 + 30 * 500

        # Approve
        r = session.post(f"{API}/inventory/purchase-orders/{po['id']}/approve", headers=hdrs, timeout=20)
        assert r.status_code == 200 and r.json()["ok"] is True

        # Verify status changed
        pos = session.get(f"{API}/inventory/purchase-orders", headers=hdrs, timeout=20).json()
        approved = [p for p in pos if p["id"] == po["id"]][0]
        assert approved["status"] == "approved"


# ---------- Finance ----------
class TestFinance:
    def test_list_invoices(self, session, hdrs):
        r = session.get(f"{API}/finance/invoices", headers=hdrs, timeout=20)
        assert r.status_code == 200
        invs = r.json()
        assert isinstance(invs, list) and len(invs) >= 20

    def test_create_invoice_and_mark_paid_and_remind(self, session, hdrs):
        payload = {
            "client_name": "TEST_Client",
            "items": [{"name": "Item A", "qty": 5, "price": 1000},
                      {"name": "Item B", "qty": 2, "price": 500}],
            "tax_rate": 18.0,
        }
        r = session.post(f"{API}/finance/invoices", headers=hdrs, json=payload, timeout=20)
        assert r.status_code == 200
        inv = r.json()
        assert inv["subtotal"] == 5000 + 1000
        assert round(inv["tax"], 2) == round(6000 * 0.18, 2)
        assert round(inv["total"], 2) == round(6000 * 1.18, 2)
        assert inv["status"] == "sent"
        iid = inv["id"]

        # Remind
        r = session.post(f"{API}/finance/invoices/{iid}/remind", headers=hdrs, timeout=20)
        assert r.status_code == 200 and r.json()["ok"] is True

        # Mark paid
        r = session.post(f"{API}/finance/invoices/{iid}/mark-paid", headers=hdrs, timeout=20)
        assert r.status_code == 200

        # Verify
        invs = session.get(f"{API}/finance/invoices", headers=hdrs, timeout=20).json()
        matched = [i for i in invs if i["id"] == iid][0]
        assert matched["status"] == "paid"

    def test_expenses(self, session, hdrs):
        r = session.get(f"{API}/finance/expenses", headers=hdrs, timeout=20)
        assert r.status_code == 200
        before = len(r.json())
        payload = {"category": "Marketing", "vendor": "TEST_Vendor",
                   "amount": 12345.0, "project": "Site A", "note": "TEST"}
        r = session.post(f"{API}/finance/expenses", headers=hdrs, json=payload, timeout=20)
        assert r.status_code == 200
        e = r.json()
        assert e["amount"] == 12345.0
        # Verify persistence
        after = session.get(f"{API}/finance/expenses", headers=hdrs, timeout=20).json()
        assert len(after) == before + 1

    def test_receivables(self, session, hdrs):
        r = session.get(f"{API}/finance/receivables", headers=hdrs, timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("current", "1-30", "31-60", "61-90", "90+"):
            assert k in d["buckets"]
        assert isinstance(d["invoices"], list)

    def test_payables(self, session, hdrs):
        r = session.get(f"{API}/finance/payables", headers=hdrs, timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_banking(self, session, hdrs):
        r = session.get(f"{API}/finance/banking", headers=hdrs, timeout=20)
        assert r.status_code == 200
        assert len(r.json()) == 3

    def test_gst(self, session, hdrs):
        r = session.get(f"{API}/finance/gst", headers=hdrs, timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("output_tax", "input_tax", "net_payable", "filings"):
            assert k in d
        assert len(d["filings"]) >= 1

    def test_budgets(self, session, hdrs):
        r = session.get(f"{API}/finance/budgets", headers=hdrs, timeout=20)
        assert r.status_code == 200
        b = r.json()
        assert isinstance(b, list) and len(b) >= 1
        assert "category" in b[0] and "budgeted" in b[0] and "actual" in b[0]


# ---------- AI / Approvals / Notifications ----------
class TestMisc:
    def test_ai_insights_returns_string(self, session, hdrs):
        r = session.post(f"{API}/insights/generate", headers=hdrs,
                         json={"topic": "cash flow", "context": "Outflow > inflow next week by 3.2L"},
                         timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert "insight" in d and isinstance(d["insight"], str) and len(d["insight"]) > 5

    def test_approvals_decision(self, session, hdrs):
        d = session.get(f"{API}/dashboard", headers=hdrs, timeout=30).json()
        approvals = d.get("approvals", [])
        if not approvals:
            pytest.skip("no pending approvals")
        aid = approvals[0]["id"]
        r = session.post(f"{API}/approvals/{aid}/decision", headers=hdrs,
                         json={"status": "approved"}, timeout=20)
        assert r.status_code == 200 and r.json()["ok"] is True
        # Verify removed from pending
        d2 = session.get(f"{API}/dashboard", headers=hdrs, timeout=30).json()
        assert aid not in [a["id"] for a in d2["approvals"]]

    def test_notifications(self, session, hdrs):
        r = session.get(f"{API}/notifications", headers=hdrs, timeout=20)
        assert r.status_code == 200
        assert len(r.json()) == 5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
