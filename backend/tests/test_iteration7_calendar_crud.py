"""Iteration 7 — Calendar CRUD (POST/PUT/DELETE /api/calendar/events).

Covers: super-admin custom event create/update/delete, aggregated event
mutation (inv/pay/apr/po), and rejection of computed types (gst/stock).
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "http://localhost:8001"
API = f"{BASE_URL}/api"

CRED = {"email": "demo@technobiz.com", "password": "demo123"}


@pytest.fixture(scope="module")
def auth_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json=CRED, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"login failed: {r.status_code} {r.text}")
    token = r.json().get("token") or r.json().get("access_token")
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# ---------- helpers ----------
def _get_events(client):
    r = client.get(f"{API}/calendar/events", timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


def _find_event(events, ev_id):
    return next((e for e in events if e["id"] == ev_id), None)


# ---------- POST: create custom event ----------
class TestCreateCustomEvent:
    def test_create_returns_cust_prefix_and_appears_in_get(self, auth_client):
        payload = {
            "title": f"TEST_{uuid.uuid4().hex[:8]} board meeting",
            "date": "2026-06-15",
            "subtitle": "Q2 review",
            "amount": 12345.5,
            "status": "scheduled",
            "severity": "info",
        }
        r = auth_client.post(f"{API}/calendar/events", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        # Data assertions
        assert body["id"].startswith("cust-"), body
        assert body["type"] == "custom"
        assert body["title"] == payload["title"]
        assert body["date"] == payload["date"]
        assert body["amount"] == payload["amount"]
        assert body.get("editable") is True

        # Verify persisted via GET
        evs = _get_events(auth_client)
        found = _find_event(evs, body["id"])
        assert found is not None, f"Created event not in GET feed: {body['id']}"
        assert found["type"] == "custom"
        assert found["editable"] is True

        # Cleanup
        d = auth_client.delete(f"{API}/calendar/events/{body['id']}", timeout=15)
        assert d.status_code == 200


# ---------- GET: includes custom events with editable flag ----------
class TestGetIncludesCustom:
    def test_get_returns_custom_with_editable_flag(self, auth_client):
        payload = {"title": "TEST_get_includes", "date": "2026-07-01"}
        r = auth_client.post(f"{API}/calendar/events", json=payload, timeout=15)
        assert r.status_code == 200
        ev_id = r.json()["id"]

        try:
            evs = _get_events(auth_client)
            ev = _find_event(evs, ev_id)
            assert ev is not None
            assert ev["type"] == "custom"
            assert ev["editable"] is True
            # severity default
            assert ev["severity"] == "info"
        finally:
            auth_client.delete(f"{API}/calendar/events/{ev_id}", timeout=15)


# ---------- PUT: custom event update + GET verify ----------
class TestUpdateCustomEvent:
    def test_update_custom_persists(self, auth_client):
        c = auth_client.post(
            f"{API}/calendar/events",
            json={"title": "TEST_update_orig", "date": "2026-08-10", "amount": 100},
            timeout=15,
        )
        assert c.status_code == 200
        ev_id = c.json()["id"]
        try:
            u = auth_client.put(
                f"{API}/calendar/events/{ev_id}",
                json={"title": "TEST_update_new", "date": "2026-08-12", "amount": 999.99},
                timeout=15,
            )
            assert u.status_code == 200, u.text
            assert u.json().get("ok") is True

            # Verify via GET
            evs = _get_events(auth_client)
            ev = _find_event(evs, ev_id)
            assert ev is not None
            assert ev["title"] == "TEST_update_new"
            assert ev["date"] == "2026-08-12"
            assert ev["amount"] == 999.99
        finally:
            auth_client.delete(f"{API}/calendar/events/{ev_id}", timeout=15)

    def test_update_nonexistent_custom_returns_404(self, auth_client):
        u = auth_client.put(
            f"{API}/calendar/events/cust-doesnotexist123",
            json={"title": "x"},
            timeout=15,
        )
        assert u.status_code == 404


# ---------- PUT: gst/stock rejection (400) ----------
class TestComputedRejection:
    @pytest.mark.parametrize("ev_id", ["gst-3b", "stock-low"])
    def test_put_computed_rejected_with_400(self, auth_client, ev_id):
        r = auth_client.put(
            f"{API}/calendar/events/{ev_id}",
            json={"title": "should fail"},
            timeout=15,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        body = r.json()
        detail = body.get("detail", "")
        assert "computed" in detail.lower(), f"detail missing 'computed': {detail}"

    @pytest.mark.parametrize("ev_id", ["gst-3b", "stock-low"])
    def test_delete_computed_rejected_with_400(self, auth_client, ev_id):
        r = auth_client.delete(f"{API}/calendar/events/{ev_id}", timeout=15)
        assert r.status_code == 400
        assert "computed" in r.json().get("detail", "").lower()


# ---------- PUT: invoice/payable/approval/po update + GET verify ----------
class TestUpdateAggregated:
    def test_update_invoice_via_calendar(self, auth_client):
        evs = _get_events(auth_client)
        inv_ev = next((e for e in evs if e["id"].startswith("inv-")), None)
        if not inv_ev:
            pytest.skip("no invoice events seeded")
        new_date = "2026-12-25"
        r = auth_client.put(
            f"{API}/calendar/events/{inv_ev['id']}",
            json={"date": new_date},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        # Verify via GET
        evs2 = _get_events(auth_client)
        updated = _find_event(evs2, inv_ev["id"])
        assert updated is not None
        assert updated["date"] == new_date
        # Restore
        auth_client.put(
            f"{API}/calendar/events/{inv_ev['id']}",
            json={"date": inv_ev["date"]},
            timeout=15,
        )

    def test_update_payable_via_calendar(self, auth_client):
        evs = _get_events(auth_client)
        pay_ev = next((e for e in evs if e["id"].startswith("pay-")), None)
        if not pay_ev:
            pytest.skip("no payable events seeded")
        new_date = "2026-11-11"
        r = auth_client.put(
            f"{API}/calendar/events/{pay_ev['id']}",
            json={"date": new_date},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        evs2 = _get_events(auth_client)
        updated = _find_event(evs2, pay_ev["id"])
        assert updated is not None and updated["date"] == new_date
        auth_client.put(
            f"{API}/calendar/events/{pay_ev['id']}",
            json={"date": pay_ev["date"]},
            timeout=15,
        )

    def test_update_approval_via_calendar(self, auth_client):
        evs = _get_events(auth_client)
        apr_ev = next((e for e in evs if e["id"].startswith("apr-")), None)
        if not apr_ev:
            pytest.skip("no approval events seeded")
        new_date = "2026-10-05"
        r = auth_client.put(
            f"{API}/calendar/events/{apr_ev['id']}",
            json={"date": new_date},
            timeout=15,
        )
        assert r.status_code == 200, r.text

    def test_update_po_via_calendar(self, auth_client):
        evs = _get_events(auth_client)
        po_ev = next((e for e in evs if e["id"].startswith("po-")), None)
        if not po_ev:
            pytest.skip("no PO events seeded")
        new_date = "2026-09-09"
        r = auth_client.put(
            f"{API}/calendar/events/{po_ev['id']}",
            json={"date": new_date},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        evs2 = _get_events(auth_client)
        updated = _find_event(evs2, po_ev["id"])
        assert updated is not None and updated["date"] == new_date


# ---------- DELETE behaviors ----------
class TestDelete:
    def test_delete_custom_removes(self, auth_client):
        c = auth_client.post(
            f"{API}/calendar/events",
            json={"title": "TEST_delete_me", "date": "2026-06-01"},
            timeout=15,
        )
        ev_id = c.json()["id"]
        d = auth_client.delete(f"{API}/calendar/events/{ev_id}", timeout=15)
        assert d.status_code == 200
        assert d.json().get("ok") is True
        # Verify gone
        evs = _get_events(auth_client)
        assert _find_event(evs, ev_id) is None

    def test_delete_invoice_clears_due_date_only(self, auth_client):
        # Use seed/reseed first to ensure clean state — reseed nukes users so re-login
        auth_client.post(f"{API}/seed", timeout=30)
        rl = auth_client.post(f"{API}/auth/login", json=CRED, timeout=15)
        if rl.status_code == 200:
            tok = rl.json().get("token") or rl.json().get("access_token")
            auth_client.headers.update({"Authorization": f"Bearer {tok}"})
        evs = _get_events(auth_client)
        inv_ev = next((e for e in evs if e["id"].startswith("inv-")), None)
        if not inv_ev:
            pytest.skip("no invoice events seeded")
        raw_id = inv_ev["id"][4:]  # strip "inv-"
        d = auth_client.delete(f"{API}/calendar/events/{inv_ev['id']}", timeout=15)
        assert d.status_code == 200
        assert d.json().get("ok") is True
        # Verify invoice record retained: GET /api/finance/invoices contains id
        r = auth_client.get(f"{API}/finance/invoices", timeout=15)
        if r.status_code == 200:
            invs = r.json()
            assert any(i.get("id") == raw_id for i in invs), \
                "invoice record should be retained after calendar delete"

    def test_delete_unauth_returns_401(self):
        s = requests.Session()
        r = s.delete(f"{API}/calendar/events/cust-anything", timeout=15)
        assert r.status_code in (401, 403)


# ---------- AUTH ----------
class TestAuthGuard:
    def test_post_requires_auth(self):
        s = requests.Session()
        r = s.post(
            f"{API}/calendar/events",
            json={"title": "x", "date": "2026-01-01"},
            timeout=15,
        )
        assert r.status_code in (401, 403)

    def test_put_requires_auth(self):
        s = requests.Session()
        r = s.put(
            f"{API}/calendar/events/cust-x",
            json={"title": "x"},
            timeout=15,
        )
        assert r.status_code in (401, 403)
