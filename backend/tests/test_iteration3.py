"""TechnoBiz Smart ERP — Iteration 3 backend tests.

Covers new endpoints:
  /api/insights/briefing, /api/insights/draft-reminder, /api/insights/data-query,
  /api/insights/anomalies, /api/insights/predict-stockout,
  /api/migration/sources, /api/migration/upload, /api/migration/history,
  /api/migration/{mid}/import.

Run: pytest /app/backend/tests/test_iteration3.py -v --tb=short \
     --junitxml=/app/test_reports/pytest/iteration3_results.xml
"""
import os
import io
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
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def hdrs(session):
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=30)
    if r.status_code != 200:
        session.post(f"{API}/seed", timeout=60)
        r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def auth_only(hdrs):
    """Header without Content-Type (for multipart uploads)."""
    return {"Authorization": hdrs["Authorization"]}


# ---------- /api/insights/briefing ----------
class TestBriefing:
    def test_briefing_shape(self, session, hdrs):
        r = session.post(f"{API}/insights/briefing", headers=hdrs, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("risk", "opportunity", "action"):
            assert k in d, f"missing key {k}"
            assert "title" in d[k] and "detail" in d[k]
            assert isinstance(d[k]["title"], str) and len(d[k]["title"]) > 0
            assert len(d[k]["title"]) <= 80, f"{k} title too long: {len(d[k]['title'])}"
            assert isinstance(d[k]["detail"], str) and len(d[k]["detail"]) > 0
        assert "cta" in d["action"] and isinstance(d["action"]["cta"], str)

    def test_briefing_unauth(self, session):
        r = session.post(f"{API}/insights/briefing", timeout=20)
        assert r.status_code == 401


# ---------- /api/insights/draft-reminder ----------
class TestDraftReminder:
    def test_draft_reminder_valid_invoice(self, session, hdrs):
        invs = session.get(f"{API}/finance/invoices", headers=hdrs, timeout=20).json()
        # Prefer an overdue invoice for richer days_overdue
        overdue = [i for i in invs if i.get("status") == "overdue"]
        target = overdue[0] if overdue else invs[0]
        r = session.post(f"{API}/insights/draft-reminder", headers=hdrs,
                         json={"invoice_id": target["id"]}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "subject" in d and isinstance(d["subject"], str) and len(d["subject"]) > 0
        assert "body" in d and isinstance(d["body"], str) and len(d["body"]) > 10
        assert d.get("tone") in ("polite", "firm", "urgent"), f"unexpected tone {d.get('tone')}"
        assert "days_overdue" in d and isinstance(d["days_overdue"], int)
        assert d["days_overdue"] >= 0

    def test_draft_reminder_unknown_invoice_404(self, session, hdrs):
        r = session.post(f"{API}/insights/draft-reminder", headers=hdrs,
                         json={"invoice_id": "non-existent-xyz"}, timeout=30)
        assert r.status_code == 404


# ---------- /api/insights/data-query ----------
class TestDataQuery:
    def test_data_query_returns_answer(self, session, hdrs):
        r = session.post(f"{API}/insights/data-query", headers=hdrs,
                         json={"query": "Which clients have the most overdue payments?"},
                         timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "answer" in d and isinstance(d["answer"], str) and len(d["answer"]) > 5
        assert "used_data" in d and isinstance(d["used_data"], bool)
        # When AI succeeds the answer should contain at least one bullet
        if d["used_data"]:
            assert "•" in d["answer"], "expected bullet (•) in answer"


# ---------- /api/insights/anomalies ----------
class TestAnomalies:
    def test_anomalies_shape(self, session, hdrs):
        r = session.get(f"{API}/insights/anomalies", headers=hdrs, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "items" in d and isinstance(d["items"], list)
        for it in d["items"]:
            for k in ("id", "type", "title", "detail", "severity", "module", "action"):
                assert k in it, f"missing {k} in anomaly item"
            assert it["severity"] in ("warning", "danger", "info", "critical", "high", "medium")


# ---------- /api/insights/predict-stockout ----------
class TestPredictStockout:
    def test_predict_stockout_shape(self, session, hdrs):
        r = session.get(f"{API}/insights/predict-stockout", headers=hdrs, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "items" in d and isinstance(d["items"], list)
        for it in d["items"]:
            for k in ("sku", "quantity", "velocity_per_day", "days_to_zero", "severity"):
                assert k in it, f"missing {k} in stockout item"
            assert isinstance(it["quantity"], (int, float))
            assert isinstance(it["velocity_per_day"], (int, float))
            assert isinstance(it["days_to_zero"], int)
            assert it["severity"] in ("critical", "high", "medium")


# ---------- /api/migration/sources ----------
class TestMigrationSources:
    def test_sources_returns_8(self, session, hdrs):
        r = session.get(f"{API}/migration/sources", headers=hdrs, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "sources" in d and isinstance(d["sources"], list)
        ids = {s["id"] for s in d["sources"]}
        expected = {"tally", "zoho", "quickbooks", "sap", "marg", "busy", "csv", "pdf"}
        assert expected.issubset(ids), f"missing ids: {expected - ids}"
        assert len(d["sources"]) == 8


# ---------- /api/migration/upload + /import + history ----------
class TestMigrationUploadFlow:
    @pytest.fixture(scope="class")
    def csv_file_path(self, tmp_path_factory):
        p = tmp_path_factory.mktemp("mig") / "TEST_products.csv"
        rows = [
            "sku,name,quantity,unit_price",
            "TEST_S001,TEST Steel Rod,100,250",
            "TEST_S002,TEST Cement Bag,200,400",
            "TEST_S003,TEST PVC Pipe,150,180",
            "TEST_S004,TEST TMT Bar,75,520",
        ]
        p.write_text("\n".join(rows), encoding="utf-8")
        return str(p)

    def test_upload_csv_then_import(self, session, auth_only, csv_file_path):
        # ----- Upload (use plain requests; session has Content-Type:json which breaks multipart) -----
        with open(csv_file_path, "rb") as fh:
            files = {"file": ("TEST_products.csv", fh, "text/csv")}
            data = {"source": "csv", "target": "products"}
            r = requests.post(f"{API}/migration/upload", headers=auth_only,
                              files=files, data=data, timeout=30)
        assert r.status_code == 200, r.text
        up = r.json()
        assert "id" in up and isinstance(up["id"], str)
        assert up["rows"] >= 1, f"expected rows>=1 got {up['rows']}"
        # CSV with 4 data rows
        assert up["rows"] == 4
        assert isinstance(up["columns"], list) and len(up["columns"]) >= 1
        assert "sku" in up["columns"]
        assert up["detected_type"] == "csv"
        assert up["source"] == "csv"
        assert up["target"] == "products"
        mid = up["id"]

        # ----- History contains entry, sorted by ts desc -----
        hist = session.get(f"{API}/migration/history",
                           headers={"Authorization": auth_only["Authorization"]},
                           timeout=20).json()
        assert isinstance(hist, list) and len(hist) >= 1
        ids = [h["id"] for h in hist]
        assert mid in ids
        # Sorted desc by ts
        ts_list = [h.get("ts", "") for h in hist]
        assert ts_list == sorted(ts_list, reverse=True), "history not sorted by ts desc"

        # ----- Import -----
        r = session.post(f"{API}/migration/{mid}/import",
                         headers={"Authorization": auth_only["Authorization"]},
                         timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is True
        assert d.get("imported_rows") == up["rows"]
        assert d.get("filename") == "TEST_products.csv"

        # ----- Verify status changed to completed -----
        hist2 = session.get(f"{API}/migration/history",
                            headers={"Authorization": auth_only["Authorization"]},
                            timeout=20).json()
        match = [h for h in hist2 if h["id"] == mid]
        assert len(match) == 1
        assert match[0]["status"] == "completed"
        assert "imported_at" in match[0]

    def test_import_unknown_id_returns_404(self, session, hdrs):
        r = session.post(f"{API}/migration/non-existent-mid/import",
                         headers=hdrs, timeout=20)
        assert r.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
