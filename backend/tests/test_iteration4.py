"""
Iteration 4 tests: RBAC, Global Search upgrade, Reports (AI summary + CSV export).
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
    # Ensure seed is fresh (so we have 10 RBAC roles)
    requests.post(f"{BASE_URL}/api/seed", timeout=30)
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": "demo@technobiz.com", "password": "demo123"}, timeout=15)
    assert r.status_code == 200, r.text
    token = r.json().get("token") or r.json().get("access_token")
    assert token, r.json()
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# ---------- RBAC ----------
class TestRBAC:
    def test_list_roles_returns_10_sorted(self, auth):
        r = auth.get(f"{BASE_URL}/api/rbac/roles", timeout=15)
        assert r.status_code == 200
        roles = r.json()
        assert isinstance(roles, list)
        assert len(roles) == 10, f"Expected 10 seeded roles, got {len(roles)}"
        assert roles[0]["name"] == "Super Admin"
        assert roles[0].get("is_super_admin") is True
        assert roles[0].get("is_locked") is True
        # structural fields
        needed = {"id", "name", "access_level", "user_count", "modules", "features",
                  "approvals", "data_scope", "security", "last_modified"}
        assert needed.issubset(set(roles[0].keys()))

    def test_get_role_by_id(self, auth):
        roles = auth.get(f"{BASE_URL}/api/rbac/roles").json()
        rid = roles[1]["id"]
        r = auth.get(f"{BASE_URL}/api/rbac/roles/{rid}")
        assert r.status_code == 200
        assert r.json()["id"] == rid
        # 404 unknown
        r404 = auth.get(f"{BASE_URL}/api/rbac/roles/does-not-exist")
        assert r404.status_code == 404

    def test_modules_endpoint(self, auth):
        r = auth.get(f"{BASE_URL}/api/rbac/modules")
        assert r.status_code == 200
        data = r.json()
        mods = data.get("modules") if isinstance(data, dict) else data
        ids = [m["id"] for m in mods]
        for expected in ["dashboard","inventory","finance","crm","hr","reports","settings"]:
            assert expected in ids
        for m in mods:
            assert isinstance(m.get("features"), list) and len(m["features"]) >= 1

    def test_update_role_non_locked_ok(self, auth):
        roles = auth.get(f"{BASE_URL}/api/rbac/roles").json()
        target = next(r for r in roles if not r.get("is_locked"))
        body = {"description": "TEST_updated_" + str(int(time.time()))}
        r = auth.put(f"{BASE_URL}/api/rbac/roles/{target['id']}", json=body)
        assert r.status_code == 200, r.text
        # Verify persistence
        again = auth.get(f"{BASE_URL}/api/rbac/roles/{target['id']}").json()
        assert again["description"] == body["description"]

    def test_update_locked_super_admin_forbidden(self, auth):
        roles = auth.get(f"{BASE_URL}/api/rbac/roles").json()
        sa = next(r for r in roles if r.get("is_locked"))
        r = auth.put(f"{BASE_URL}/api/rbac/roles/{sa['id']}", json={"description": "hack"})
        assert r.status_code == 403

    def test_create_role_blank(self, auth):
        name = f"TEST_Blank_{int(time.time())}"
        r = auth.post(f"{BASE_URL}/api/rbac/roles", json={"name": name})
        assert r.status_code == 200
        created = r.json()
        assert created["name"] == name
        assert created.get("is_locked") is False
        # cleanup
        auth.delete(f"{BASE_URL}/api/rbac/roles/{created['id']}")

    def test_create_role_from_template(self, auth):
        roles = auth.get(f"{BASE_URL}/api/rbac/roles").json()
        tmpl = next(r for r in roles if r["name"] == "Finance Admin")
        name = f"TEST_Tmpl_{int(time.time())}"
        r = auth.post(f"{BASE_URL}/api/rbac/roles",
                      json={"name": name, "template_role_id": tmpl["id"]})
        assert r.status_code == 200, r.text
        created = r.json()
        # template copied the finance module flag
        assert created["modules"].get("finance") is True
        auth.delete(f"{BASE_URL}/api/rbac/roles/{created['id']}")

    def test_duplicate_role(self, auth):
        roles = auth.get(f"{BASE_URL}/api/rbac/roles").json()
        orig = next(r for r in roles if r["name"] == "CRM Admin")
        r = auth.post(f"{BASE_URL}/api/rbac/roles/{orig['id']}/duplicate")
        assert r.status_code == 200
        dup = r.json()
        assert dup["name"] == f"{orig['name']} (copy)"
        assert dup.get("is_locked") is False
        auth.delete(f"{BASE_URL}/api/rbac/roles/{dup['id']}")

    def test_delete_role_locked_forbidden(self, auth):
        roles = auth.get(f"{BASE_URL}/api/rbac/roles").json()
        sa = next(r for r in roles if r.get("is_locked"))
        r = auth.delete(f"{BASE_URL}/api/rbac/roles/{sa['id']}")
        assert r.status_code == 403

    def test_delete_non_locked_ok(self, auth):
        name = f"TEST_Del_{int(time.time())}"
        created = auth.post(f"{BASE_URL}/api/rbac/roles", json={"name": name}).json()
        r = auth.delete(f"{BASE_URL}/api/rbac/roles/{created['id']}")
        assert r.status_code == 200
        g = auth.get(f"{BASE_URL}/api/rbac/roles/{created['id']}")
        assert g.status_code == 404

    def test_audit_log(self, auth):
        # Trigger an audit entry first
        name = f"TEST_Audit_{int(time.time())}"
        created = auth.post(f"{BASE_URL}/api/rbac/roles", json={"name": name}).json()
        r = auth.get(f"{BASE_URL}/api/rbac/audit")
        assert r.status_code == 200
        entries = r.json()
        assert isinstance(entries, list) and len(entries) > 0
        top = entries[0]
        for k in ["role_name", "action", "actor", "ts", "summary"]:
            assert k in top
        auth.delete(f"{BASE_URL}/api/rbac/roles/{created['id']}")


# ---------- Global Search ----------
class TestSearch:
    def test_search_apex_mixed(self, auth):
        r = auth.get(f"{BASE_URL}/api/search", params={"q": "Apex"}, timeout=15)
        assert r.status_code == 200
        results = r.json().get("results", [])
        assert len(results) > 0
        types = {x["type"] for x in results}
        # Apex Constructions is a client name => should at least match invoices
        assert "invoice" in types
        for item in results:
            assert {"type", "title", "sub", "href"}.issubset(item.keys())

    def test_search_empty_query(self, auth):
        r = auth.get(f"{BASE_URL}/api/search", params={"q": ""})
        assert r.status_code == 200
        assert r.json()["results"] == []


# ---------- Reports ----------
class TestReports:
    @pytest.mark.parametrize("kind", ["pl", "sales", "expenses", "stock"])
    @pytest.mark.parametrize("period", ["day", "week", "month", "all"])
    def test_report_base(self, auth, kind, period):
        r = auth.get(f"{BASE_URL}/api/reports/{kind}", params={"period": period}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["kind"] == kind
        assert d["period"] == period
        assert "metrics" in d and isinstance(d["metrics"], dict)
        assert "rows" in d and isinstance(d["rows"], list)

    def test_report_unknown_kind(self, auth):
        r = auth.get(f"{BASE_URL}/api/reports/unknown", params={"period": "month"})
        assert r.status_code == 404

    @pytest.mark.parametrize("kind", ["pl", "sales", "expenses", "stock"])
    def test_report_summary_has_bullets(self, auth, kind):
        r = auth.get(f"{BASE_URL}/api/reports/{kind}/summary",
                     params={"period": "month"}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "summary" in d and isinstance(d["summary"], str) and len(d["summary"]) > 5
        assert "•" in d["summary"]
        # base fields preserved
        assert "metrics" in d and "rows" in d

    def test_report_export_csv(self, auth):
        r = auth.get(f"{BASE_URL}/api/reports/pl/export.csv",
                     params={"period": "month"}, timeout=15)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        cd = r.headers.get("content-disposition", "")
        assert "attachment" in cd and ".csv" in cd
        body = r.text
        assert "Report" in body
        assert "pl" in body
