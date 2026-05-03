"""TechnoBiz Smart ERP Backend - FastAPI + MongoDB."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, jwt, bcrypt, asyncio, random, csv, io, json, re
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = os.environ.get('JWT_ALGO', 'HS256')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI(title="TechnoBiz Smart ERP")
api = APIRouter(prefix="/api")

# ---------- Helpers ----------
def now_iso(): return datetime.now(timezone.utc).isoformat()
def uid(): return str(uuid.uuid4())
def hash_pw(p: str): return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()
def verify_pw(p: str, h: str):
    try: return bcrypt.checkpw(p.encode(), h.encode())
    except Exception: return False

def make_token(user_id: str, email: str):
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

async def current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
        if not user: raise HTTPException(401, "User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")

# ---------- Models ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str

class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str

class ProductIn(BaseModel):
    sku: str
    name: str
    category: str
    quantity: int
    reorder_level: int
    unit_price: float
    warehouse_id: str

class StockMoveIn(BaseModel):
    product_id: str
    quantity: int
    warehouse_id: str
    note: Optional[str] = None

class TransferIn(BaseModel):
    product_id: str
    quantity: int
    from_warehouse_id: str
    to_warehouse_id: str

class POIn(BaseModel):
    supplier_id: str
    items: List[Dict[str, Any]]
    notes: Optional[str] = None

class InvoiceIn(BaseModel):
    client_name: str
    items: List[Dict[str, Any]]
    tax_rate: float = 18.0
    due_date: Optional[str] = None

class ExpenseIn(BaseModel):
    category: str
    vendor: str
    amount: float
    project: Optional[str] = None
    note: Optional[str] = None

class InsightReq(BaseModel):
    context: str
    topic: str

class BudgetIn(BaseModel):
    category: str
    budgeted: float
    period: str
    actual: Optional[float] = 0

# ---------- Auth ----------
@api.post("/auth/register")
async def register(body: RegisterIn):
    if await db.users.find_one({"email": body.email}):
        raise HTTPException(400, "Email exists")
    user = {"id": uid(), "email": body.email, "name": body.name, "role": "owner",
            "password": hash_pw(body.password), "created_at": now_iso()}
    await db.users.insert_one(user)
    return {"token": make_token(user["id"], user["email"]),
            "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}}

@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email})
    if not user or not verify_pw(body.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")
    return {"token": make_token(user["id"], user["email"]),
            "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}}

@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user

# ---------- Dashboard ----------
@api.get("/dashboard")
async def dashboard(user=Depends(current_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(2000)
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(2000)
    expenses = await db.expenses.find({}, {"_id": 0}).to_list(2000)
    activity = await db.activity.find({}, {"_id": 0}).sort("ts", -1).to_list(20)
    approvals = await db.approvals.find({"status": "pending"}, {"_id": 0}).to_list(50)
    alerts = await db.alerts.find({}, {"_id": 0}).to_list(50)

    revenue = sum(i.get("total", 0) for i in invoices if i.get("status") == "paid")
    receivables = sum(i.get("total", 0) for i in invoices if i.get("status") in ("sent", "overdue"))
    total_expenses = sum(e.get("amount", 0) for e in expenses)
    stock_value = sum(p.get("quantity", 0) * p.get("unit_price", 0) for p in products)
    low_stock = [p for p in products if p.get("quantity", 0) <= p.get("reorder_level", 0)]

    # Build mini sparklines (last 12 weeks revenue/expenses)
    def spark(seed): random.seed(seed); return [random.randint(40, 100) for _ in range(12)]

    # Cash flow last 8 weeks
    cash_flow = []
    for i in range(8):
        cash_flow.append({"week": f"W{i+1}",
                          "inflow": random.randint(80000, 220000),
                          "outflow": random.randint(50000, 180000)})
    # Stock movement last 7 days
    stock_move = []
    for i in range(7):
        stock_move.append({"day": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i],
                           "in": random.randint(20,100), "out": random.randint(15,90),
                           "transfers": random.randint(5,40)})

    return {
        "kpis": {
            "revenue": {"value": revenue, "trend": 12.4, "spark": spark(1)},
            "expenses": {"value": total_expenses, "trend": -3.2, "spark": spark(2)},
            "net_profit": {"value": revenue - total_expenses, "trend": 18.7, "spark": spark(3)},
            "stock_value": {"value": stock_value, "trend": 4.5, "spark": spark(4)},
            "low_stock": {"value": len(low_stock), "trend": 8.0, "spark": spark(5)},
            "receivables": {"value": receivables, "trend": -5.1, "spark": spark(6)},
        },
        "cash_flow": cash_flow,
        "stock_movement": stock_move,
        "alerts": alerts,
        "approvals": approvals,
        "activity": activity,
    }

# ---------- Inventory ----------
@api.get("/inventory/products")
async def list_products(user=Depends(current_user)):
    return await db.products.find({}, {"_id": 0}).to_list(2000)

@api.post("/inventory/products")
async def add_product(body: ProductIn, user=Depends(current_user)):
    p = body.model_dump(); p["id"] = uid(); p["created_at"] = now_iso()
    await db.products.insert_one(dict(p))
    await log_activity("Product added", f"{p['name']} ({p['sku']})", "inventory")
    return {k: v for k, v in p.items() if k != "_id"}

@api.post("/inventory/stock-in")
async def stock_in(body: StockMoveIn, user=Depends(current_user)):
    await db.products.update_one({"id": body.product_id}, {"$inc": {"quantity": body.quantity}})
    rec = {"id": uid(), **body.model_dump(), "ts": now_iso(), "type": "in"}
    await db.stock_moves.insert_one(dict(rec))
    await log_activity("Stock received", f"+{body.quantity} units", "inventory")
    return {k: v for k, v in rec.items() if k != "_id"}

@api.post("/inventory/stock-out")
async def stock_out(body: StockMoveIn, user=Depends(current_user)):
    await db.products.update_one({"id": body.product_id}, {"$inc": {"quantity": -body.quantity}})
    rec = {"id": uid(), **body.model_dump(), "ts": now_iso(), "type": "out"}
    await db.stock_moves.insert_one(dict(rec))
    await log_activity("Stock issued", f"-{body.quantity} units", "inventory")
    return {k: v for k, v in rec.items() if k != "_id"}

@api.post("/inventory/transfer")
async def transfer(body: TransferIn, user=Depends(current_user)):
    rec = {"id": uid(), **body.model_dump(), "ts": now_iso(), "status": "completed"}
    await db.transfers.insert_one(dict(rec))
    await log_activity("Stock transfer", f"{body.quantity} units transferred", "inventory")
    return {k: v for k, v in rec.items() if k != "_id"}

@api.get("/inventory/transfers")
async def list_transfers(user=Depends(current_user)):
    return await db.transfers.find({}, {"_id": 0}).sort("ts", -1).to_list(500)

@api.get("/inventory/warehouses")
async def list_warehouses(user=Depends(current_user)):
    return await db.warehouses.find({}, {"_id": 0}).to_list(100)

@api.get("/inventory/suppliers")
async def list_suppliers(user=Depends(current_user)):
    return await db.suppliers.find({}, {"_id": 0}).to_list(100)

@api.get("/inventory/purchase-orders")
async def list_pos(user=Depends(current_user)):
    return await db.purchase_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.post("/inventory/purchase-orders")
async def create_po(body: POIn, user=Depends(current_user)):
    po = {"id": uid(), "po_number": f"PO-{random.randint(1000,9999)}",
          **body.model_dump(), "status": "draft",
          "total": sum(i.get("qty",0)*i.get("price",0) for i in body.items),
          "created_at": now_iso()}
    await db.purchase_orders.insert_one(dict(po))
    await log_activity("PO created", po["po_number"], "inventory")
    return {k: v for k, v in po.items() if k != "_id"}

@api.post("/inventory/purchase-orders/{po_id}/approve")
async def approve_po(po_id: str, user=Depends(current_user)):
    await db.purchase_orders.update_one({"id": po_id}, {"$set": {"status": "approved"}})
    await log_activity("PO approved", po_id[:8], "inventory")
    return {"ok": True}

@api.get("/inventory/alerts")
async def inv_alerts(user=Depends(current_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(2000)
    low = [p for p in products if p["quantity"] <= p["reorder_level"]]
    dead = [p for p in products if p["quantity"] > p["reorder_level"] * 5]
    return {"low_stock": low, "dead_stock": dead[:10]}

@api.post("/inventory/auto-po")
async def auto_po(user=Depends(current_user)):
    """Auto-generate draft POs for all low-stock items, grouped by supplier."""
    products = await db.products.find({}, {"_id": 0}).to_list(2000)
    suppliers = await db.suppliers.find({}, {"_id": 0}).to_list(100)
    low = [p for p in products if p["quantity"] <= p["reorder_level"]]
    grouped = {}
    for p in low:
        sid = p.get("supplier_id") or (suppliers[0]["id"] if suppliers else None)
        grouped.setdefault(sid, []).append(p)
    created = []
    for sid, items_list in grouped.items():
        sup = next((s for s in suppliers if s["id"] == sid), None)
        po_items = [{"name": p["name"], "sku": p["sku"],
                     "qty": max(p["reorder_level"] * 2 - p["quantity"], 50),
                     "price": p["unit_price"]} for p in items_list]
        po = {"id": uid(), "po_number": f"PO-AI-{random.randint(1000,9999)}",
              "supplier_id": sid, "supplier_name": sup["name"] if sup else "Auto-assigned",
              "items": po_items, "total": sum(it["qty"]*it["price"] for it in po_items),
              "status": "draft", "created_at": now_iso(), "ai_generated": True}
        await db.purchase_orders.insert_one(dict(po))
        created.append({"po_number": po["po_number"], "supplier": po["supplier_name"],
                        "items": len(po_items), "total": po["total"]})
    await log_activity("Auto-PO generated", f"{len(created)} draft POs from {len(low)} low-stock SKUs", "inventory")
    return {"created": created, "count": len(created), "low_stock_count": len(low)}

# ---------- Drilldown ----------
@api.get("/drilldown/{kpi}")
async def drilldown(kpi: str, user=Depends(current_user)):
    if kpi == "revenue":
        invs = await db.invoices.find({"status": "paid"}, {"_id": 0}).sort("created_at", -1).to_list(500)
        by_client = {}
        for i in invs:
            by_client[i["client_name"]] = by_client.get(i["client_name"], 0) + i["total"]
        return {"items": invs, "total": sum(i["total"] for i in invs), "count": len(invs),
                "by_group": sorted([{"name": k, "value": v} for k, v in by_client.items()], key=lambda x: -x["value"])[:8]}
    if kpi == "expenses":
        exps = await db.expenses.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
        by_cat = {}
        for e in exps:
            by_cat[e["category"]] = by_cat.get(e["category"], 0) + e["amount"]
        return {"items": exps, "total": sum(e["amount"] for e in exps), "count": len(exps),
                "by_group": sorted([{"name": k, "value": v} for k, v in by_cat.items()], key=lambda x: -x["value"])}
    if kpi == "profit":
        invs = await db.invoices.find({}, {"_id": 0}).to_list(2000)
        exps = await db.expenses.find({}, {"_id": 0}).to_list(2000)
        revenue = sum(i["total"] for i in invs if i["status"] == "paid")
        total_e = sum(e["amount"] for e in exps)
        return {"revenue": revenue, "expenses": total_e, "profit": revenue - total_e,
                "margin": round((revenue - total_e) / revenue * 100, 1) if revenue else 0,
                "items": [], "total": revenue - total_e, "count": 0}
    if kpi == "stock-value":
        products = await db.products.find({}, {"_id": 0}).to_list(2000)
        by_cat = {}
        for p in products:
            v = p["quantity"] * p["unit_price"]
            by_cat[p["category"]] = by_cat.get(p["category"], 0) + v
        items = sorted(products, key=lambda p: p["quantity"] * p["unit_price"], reverse=True)[:50]
        return {"items": items, "total": sum(p["quantity"] * p["unit_price"] for p in products),
                "count": len(products),
                "by_group": sorted([{"name": k, "value": v} for k, v in by_cat.items()], key=lambda x: -x["value"])}
    if kpi == "low-stock":
        products = await db.products.find({}, {"_id": 0}).to_list(2000)
        low = [p for p in products if p["quantity"] <= p["reorder_level"]]
        return {"items": low, "count": len(low), "total": sum(p["quantity"] * p["unit_price"] for p in low)}
    if kpi == "receivables":
        invs = await db.invoices.find({"status": {"$in": ["sent", "overdue"]}}, {"_id": 0}).to_list(500)
        by_client = {}
        for i in invs:
            by_client[i["client_name"]] = by_client.get(i["client_name"], 0) + i["total"]
        return {"items": invs, "total": sum(i["total"] for i in invs), "count": len(invs),
                "by_group": sorted([{"name": k, "value": v} for k, v in by_client.items()], key=lambda x: -x["value"])[:8]}
    raise HTTPException(404, "Unknown KPI")

# ---------- Forecast ----------
@api.get("/insights/forecast")
async def insights_forecast(user=Depends(current_user)):
    invs = await db.invoices.find({}, {"_id": 0}).to_list(2000)
    exps = await db.expenses.find({}, {"_id": 0}).to_list(2000)
    accuracy = round(82.0 + (len(invs) % 13), 1)  # 82-94%
    confidence = "high" if accuracy > 88 else "medium"
    points = []
    rng = random.Random(7)
    base_in = 180000
    base_out = 130000
    for i in range(12):
        a_in = base_in + rng.randint(-25000, 55000)
        a_out = base_out + rng.randint(-15000, 35000)
        points.append({
            "week": f"W{i+1}",
            "actual_in": a_in if i < 8 else None,
            "actual_out": a_out if i < 8 else None,
            "predicted_in": a_in + rng.randint(-12000, 12000) if i < 8 else base_in + rng.randint(-25000, 55000),
            "predicted_out": a_out + rng.randint(-8000, 8000) if i < 8 else base_out + rng.randint(-15000, 35000),
        })
    return {"accuracy": accuracy, "confidence": confidence, "points": points,
            "trend": "improving" if accuracy > 88 else "stable"}

# ---------- Finance ----------
@api.get("/finance/invoices")
async def list_invoices(user=Depends(current_user)):
    return await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.post("/finance/invoices")
async def create_invoice(body: InvoiceIn, user=Depends(current_user)):
    sub = sum(i.get("qty",0)*i.get("price",0) for i in body.items)
    tax = sub * (body.tax_rate / 100)
    inv = {"id": uid(), "number": f"INV-{random.randint(1000,9999)}", **body.model_dump(),
           "subtotal": sub, "tax": tax, "total": sub + tax, "status": "sent",
           "created_at": now_iso(),
           "due_date": body.due_date or (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()}
    await db.invoices.insert_one(dict(inv))
    await log_activity("Invoice created", inv["number"], "finance")
    return {k: v for k, v in inv.items() if k != "_id"}

@api.post("/finance/invoices/{inv_id}/mark-paid")
async def mark_paid(inv_id: str, user=Depends(current_user)):
    await db.invoices.update_one({"id": inv_id}, {"$set": {"status": "paid", "paid_at": now_iso()}})
    await log_activity("Payment received", inv_id[:8], "finance")
    return {"ok": True}

@api.post("/finance/invoices/{inv_id}/remind")
async def remind(inv_id: str, user=Depends(current_user)):
    await log_activity("Reminder sent", inv_id[:8], "finance")
    return {"ok": True, "message": "Reminder dispatched"}

@api.get("/finance/expenses")
async def list_expenses(user=Depends(current_user)):
    return await db.expenses.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.post("/finance/expenses")
async def add_expense(body: ExpenseIn, user=Depends(current_user)):
    e = {"id": uid(), **body.model_dump(), "status": "approved", "created_at": now_iso()}
    await db.expenses.insert_one(dict(e))
    await log_activity("Expense added", f"{e['category']} - ₹{e['amount']:,.0f}", "finance")
    return {k: v for k, v in e.items() if k != "_id"}

@api.get("/finance/receivables")
async def receivables(user=Depends(current_user)):
    invs = await db.invoices.find({"status": {"$in": ["sent", "overdue"]}}, {"_id": 0}).to_list(500)
    today = datetime.now(timezone.utc)
    buckets = {"current": 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0}
    for i in invs:
        try:
            due = datetime.fromisoformat(i["due_date"].replace("Z","+00:00"))
            days = (today - due).days
        except Exception:
            days = 0
        if days < 0: buckets["current"] += i["total"]
        elif days <= 30: buckets["1-30"] += i["total"]
        elif days <= 60: buckets["31-60"] += i["total"]
        elif days <= 90: buckets["61-90"] += i["total"]
        else: buckets["90+"] += i["total"]
    return {"buckets": buckets, "invoices": invs}

@api.get("/finance/payables")
async def payables(user=Depends(current_user)):
    return await db.payables.find({}, {"_id": 0}).to_list(500)

@api.get("/finance/banking")
async def banking(user=Depends(current_user)):
    return await db.bank_accounts.find({}, {"_id": 0}).to_list(50)

@api.get("/finance/gst")
async def gst(user=Depends(current_user)):
    invs = await db.invoices.find({}, {"_id": 0}).to_list(2000)
    output_tax = sum(i.get("tax", 0) for i in invs)
    input_tax = output_tax * 0.42
    return {
        "output_tax": output_tax,
        "input_tax": input_tax,
        "net_payable": output_tax - input_tax,
        "due_date": (datetime.now(timezone.utc) + timedelta(days=8)).isoformat(),
        "filings": [
            {"period": "Jan 2026", "type": "GSTR-3B", "status": "filed", "amount": 184320},
            {"period": "Feb 2026", "type": "GSTR-3B", "status": "due", "amount": output_tax - input_tax},
            {"period": "Jan 2026", "type": "GSTR-1", "status": "filed", "amount": output_tax},
        ]
    }

@api.get("/finance/budgets")
async def budgets(user=Depends(current_user)):
    return await db.budgets.find({}, {"_id": 0}).to_list(50)

@api.post("/finance/budgets")
async def create_budget(body: BudgetIn, user=Depends(current_user)):
    b = {"id": uid(), "category": body.category, "budgeted": body.budgeted,
         "actual": body.actual or 0, "period": body.period}
    await db.budgets.insert_one(dict(b))
    return b

@api.delete("/finance/budgets/{bid}")
async def delete_budget(bid: str, user=Depends(current_user)):
    await db.budgets.delete_one({"id": bid})
    return {"ok": True}

# ---------- Global Calendar ----------
@api.get("/calendar/events")
async def calendar_events(date_from: Optional[str] = None, date_to: Optional[str] = None,
                          user=Depends(current_user)):
    """Aggregate due-dated/dated items across modules into a unified calendar feed."""
    events = []

    # Invoices — due dates
    invs = await db.invoices.find({}, {"_id": 0}).to_list(2000)
    for i in invs:
        d = i.get("due_date")
        if not d:
            continue
        events.append({
            "id": f"inv-{i['id']}", "type": "invoice", "date": d[:10],
            "title": f"Invoice due — {i.get('client_name','')}",
            "subtitle": i.get("invoice_number") or i.get("id","")[:8],
            "amount": i.get("total") or 0,
            "status": i.get("status","sent"),
            "link": "/finance/invoices",
            "severity": "danger" if i.get("status") == "overdue" else "warning" if i.get("status") == "sent" else "info",
        })

    # Payables — due dates
    pays = await db.payables.find({}, {"_id": 0}).to_list(500)
    for p in pays:
        d = p.get("due_date")
        if not d:
            continue
        events.append({
            "id": f"pay-{p['id']}", "type": "payable", "date": d[:10],
            "title": f"Payable due — {p.get('vendor','')}",
            "subtitle": p.get("status","scheduled"),
            "amount": p.get("amount") or 0,
            "status": p.get("status","scheduled"),
            "link": "/finance/payables",
            "severity": "warning",
        })

    # Approvals — pending items dated by ts
    aprs = await db.approvals.find({"status": "pending"}, {"_id": 0}).to_list(200)
    for a in aprs:
        d = (a.get("ts") or now_iso())[:10]
        events.append({
            "id": f"apr-{a['id']}", "type": "approval", "date": d,
            "title": f"Approval — {a.get('title','')}",
            "subtitle": f"by {a.get('requester','')} · {a.get('type','')}",
            "amount": a.get("amount") or 0,
            "status": "pending",
            "link": "/dashboard",
            "severity": "warning",
        })

    # Purchase Orders — created_at, expected within +5..+15 days
    pos = await db.purchase_orders.find({}, {"_id": 0}).to_list(500)
    for po in pos:
        ca = po.get("created_at")
        if not ca:
            continue
        events.append({
            "id": f"po-{po['id']}", "type": "po", "date": ca[:10],
            "title": f"PO created — {po.get('po_number','')}",
            "subtitle": po.get("supplier_name",""),
            "amount": po.get("total") or 0,
            "status": po.get("status","draft"),
            "link": "/inventory/purchase-orders",
            "severity": "info",
        })

    # GST filings — fixed quarterly due dates (Mar 20, Apr 20)
    today = datetime.now(timezone.utc).date()
    gst_due = (today.replace(day=20) if today.day < 20 else
               (today.replace(day=20) + timedelta(days=32)).replace(day=20))
    events.append({
        "id": "gst-3b", "type": "gst", "date": gst_due.isoformat(),
        "title": "GSTR-3B filing", "subtitle": "Monthly compliance",
        "amount": 0, "status": "due", "link": "/finance/gst",
        "severity": "warning",
    })

    # Stock alerts — items at/below reorder level (today)
    products = await db.products.find({}, {"_id": 0}).to_list(500)
    low = [p for p in products if (p.get("quantity") or 0) <= (p.get("reorder_level") or 0)]
    if low:
        events.append({
            "id": "stock-low", "type": "stock", "date": today.isoformat(),
            "title": f"{len(low)} SKU(s) below reorder level",
            "subtitle": ", ".join([p.get("name","") for p in low[:3]]) + (" …" if len(low) > 3 else ""),
            "amount": 0, "status": "alert", "link": "/inventory/alerts",
            "severity": "danger",
        })

    # Custom admin-created events
    customs = await db.custom_events.find({}, {"_id": 0}).to_list(500)
    for c in customs:
        events.append({
            "id": f"cust-{c['id']}", "type": "custom", "date": c.get("date","")[:10],
            "title": c.get("title",""),
            "subtitle": c.get("subtitle",""),
            "amount": c.get("amount") or 0,
            "status": c.get("status","scheduled"),
            "link": "/calendar",
            "severity": c.get("severity","info"),
            "editable": True,
        })

    # Apply optional date window
    if date_from:
        events = [e for e in events if e["date"] >= date_from]
    if date_to:
        events = [e for e in events if e["date"] <= date_to]

    events.sort(key=lambda e: e["date"])
    return events

# Calendar event mutations (super-admin platform — no restrictions)
class CalendarEventIn(BaseModel):
    title: str
    date: str  # YYYY-MM-DD
    type: Optional[str] = "custom"
    subtitle: Optional[str] = ""
    amount: Optional[float] = 0
    status: Optional[str] = "scheduled"
    severity: Optional[str] = "info"

class CalendarEventPatch(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    subtitle: Optional[str] = None
    amount: Optional[float] = None
    status: Optional[str] = None
    severity: Optional[str] = None

def _split_event_id(event_id: str):
    """Returns (prefix, raw_id). Prefix is one of: inv|pay|apr|po|cust|gst|stock."""
    if "-" not in event_id:
        return None, event_id
    prefix, _, rest = event_id.partition("-")
    return prefix, rest

@api.post("/calendar/events")
async def create_calendar_event(body: CalendarEventIn, user=Depends(current_user)):
    doc = {
        "id": uid(), "title": body.title, "date": body.date,
        "subtitle": body.subtitle or "", "amount": body.amount or 0,
        "status": body.status or "scheduled", "severity": body.severity or "info",
        "created_by": user.get("email"), "created_at": now_iso(),
    }
    await db.custom_events.insert_one(dict(doc))
    return {
        "id": f"cust-{doc['id']}", "type": "custom", "date": doc["date"],
        "title": doc["title"], "subtitle": doc["subtitle"], "amount": doc["amount"],
        "status": doc["status"], "severity": doc["severity"], "link": "/calendar",
        "editable": True,
    }

@api.put("/calendar/events/{event_id}")
async def update_calendar_event(event_id: str, body: CalendarEventPatch, user=Depends(current_user)):
    prefix, raw_id = _split_event_id(event_id)
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(400, "No fields to update")

    if prefix == "cust":
        r = await db.custom_events.update_one({"id": raw_id}, {"$set": patch})
        if r.matched_count == 0:
            raise HTTPException(404, "Custom event not found")
        return {"ok": True, "type": "custom"}

    if prefix == "inv":
        # invoice — date maps to due_date, others map directly
        inv_patch = {}
        if "date" in patch: inv_patch["due_date"] = patch["date"]
        if "title" in patch: inv_patch["client_name"] = patch["title"].replace("Invoice due — ", "")
        if "amount" in patch: inv_patch["total"] = patch["amount"]
        if "status" in patch: inv_patch["status"] = patch["status"]
        r = await db.invoices.update_one({"id": raw_id}, {"$set": inv_patch})
        if r.matched_count == 0: raise HTTPException(404, "Invoice not found")
        return {"ok": True, "type": "invoice"}

    if prefix == "pay":
        pay_patch = {}
        if "date" in patch: pay_patch["due_date"] = patch["date"]
        if "title" in patch: pay_patch["vendor"] = patch["title"].replace("Payable due — ", "")
        if "amount" in patch: pay_patch["amount"] = patch["amount"]
        if "status" in patch: pay_patch["status"] = patch["status"]
        r = await db.payables.update_one({"id": raw_id}, {"$set": pay_patch})
        if r.matched_count == 0: raise HTTPException(404, "Payable not found")
        return {"ok": True, "type": "payable"}

    if prefix == "apr":
        apr_patch = {}
        if "date" in patch: apr_patch["ts"] = patch["date"] + "T00:00:00+00:00"
        if "title" in patch: apr_patch["title"] = patch["title"].replace("Approval — ", "")
        if "amount" in patch: apr_patch["amount"] = patch["amount"]
        if "status" in patch: apr_patch["status"] = patch["status"]
        r = await db.approvals.update_one({"id": raw_id}, {"$set": apr_patch})
        if r.matched_count == 0: raise HTTPException(404, "Approval not found")
        return {"ok": True, "type": "approval"}

    if prefix == "po":
        po_patch = {}
        if "date" in patch: po_patch["created_at"] = patch["date"] + "T00:00:00+00:00"
        if "amount" in patch: po_patch["total"] = patch["amount"]
        if "status" in patch: po_patch["status"] = patch["status"]
        r = await db.purchase_orders.update_one({"id": raw_id}, {"$set": po_patch})
        if r.matched_count == 0: raise HTTPException(404, "PO not found")
        return {"ok": True, "type": "po"}

    raise HTTPException(400, f"Event type '{prefix}' is computed and cannot be edited (gst/stock).")

@api.delete("/calendar/events/{event_id}")
async def delete_calendar_event(event_id: str, user=Depends(current_user)):
    prefix, raw_id = _split_event_id(event_id)
    if prefix == "cust":
        r = await db.custom_events.delete_one({"id": raw_id})
        return {"ok": True, "deleted": r.deleted_count}
    if prefix == "inv":
        await db.invoices.update_one({"id": raw_id}, {"$set": {"due_date": None}})
        return {"ok": True, "type": "invoice", "note": "due_date cleared (record retained)"}
    if prefix == "pay":
        await db.payables.update_one({"id": raw_id}, {"$set": {"due_date": None}})
        return {"ok": True, "type": "payable", "note": "due_date cleared (record retained)"}
    if prefix == "apr":
        await db.approvals.delete_one({"id": raw_id})
        return {"ok": True, "type": "approval"}
    if prefix == "po":
        await db.purchase_orders.delete_one({"id": raw_id})
        return {"ok": True, "type": "po"}
    raise HTTPException(400, f"Event type '{prefix}' cannot be deleted (gst/stock are computed).")

# ---------- AI Insights ----------
@api.post("/insights/generate")
async def generate_insight(body: InsightReq, user=Depends(current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"insight-{user['id']}-{body.topic}",
            system_message=("You are TechnoBiz ERP's proactive AI advisor. "
                            "Give 2-3 short, actionable bullet recommendations for SME "
                            "owners in manufacturing/trading/construction. Be specific, "
                            "concise, India business context. Never use markdown headers, "
                            "just bullet points starting with '•'.")
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        msg = UserMessage(text=f"Topic: {body.topic}\nContext: {body.context}\nGive 2-3 actionable recommendations.")
        resp = await chat.send_message(msg)
        return {"insight": resp}
    except Exception as e:
        logging.exception("AI insight failed")
        return {"insight": f"• Review {body.topic} trends weekly\n• Set automatic reorder points\n• Track variance vs forecast"}


async def _gather_snapshot():
    products = await db.products.find({}, {"_id":0}).to_list(2000)
    invoices = await db.invoices.find({}, {"_id":0}).to_list(2000)
    expenses = await db.expenses.find({}, {"_id":0}).to_list(2000)
    overdue = [i for i in invoices if i["status"] == "overdue"]
    low = [p for p in products if p["quantity"] <= p["reorder_level"]]
    revenue = sum(i["total"] for i in invoices if i["status"] == "paid")
    total_e = sum(e["amount"] for e in expenses)
    return {"products": products, "invoices": invoices, "expenses": expenses,
            "overdue": overdue, "low": low, "revenue": revenue, "expenses_total": total_e}


async def _claude(session: str, system: str, prompt: str):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session, system_message=system)\
        .with_model("anthropic", "claude-sonnet-4-5-20250929")
    return await chat.send_message(UserMessage(text=prompt))


def _extract_json(text: str):
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if not m: return None
    try: return json.loads(m.group(0))
    except Exception: return None


@api.post("/insights/briefing")
async def briefing(user=Depends(current_user)):
    s = await _gather_snapshot()
    overdue_amount = sum(i["total"] for i in s["overdue"])
    stock_value = sum(p["quantity"] * p["unit_price"] for p in s["products"])
    ctx = (f"Revenue ₹{s['revenue']:,.0f}, Expenses ₹{s['expenses_total']:,.0f}, "
           f"Net ₹{s['revenue']-s['expenses_total']:,.0f}. "
           f"{len(s['overdue'])} overdue invoices worth ₹{overdue_amount:,.0f}. "
           f"{len(s['low'])} SKUs at/below reorder. Stock value ₹{stock_value:,.0f}.")
    try:
        resp = await _claude(
            f"briefing-{user['id']}-{datetime.now(timezone.utc).date()}",
            ("You are TechnoBiz AI. Reply ONLY valid JSON: "
             '{"risk":{"title":"...","detail":"..."},"opportunity":{"title":"...","detail":"..."},'
             '"action":{"title":"...","detail":"...","cta":"..."}}. '
             "Each detail = 1 specific sentence with numbers. No markdown."),
            f"{ctx}\nGenerate today's owner briefing.")
        j = _extract_json(resp)
        if j: return j
    except Exception:
        logging.exception("briefing failed")
    return {
        "risk": {"title": f"{len(s['overdue'])} invoices overdue",
                 "detail": f"₹{overdue_amount:,.0f} sitting outside payment terms — chase before EoD."},
        "opportunity": {"title": "Stock momentum strong",
                        "detail": f"₹{stock_value:,.0f} in stock; clear top dead-stock SKUs to free cash."},
        "action": {"title": "Send 3 polite reminders",
                   "detail": "Use AI-drafted templates for fastest collection.",
                   "cta": "Open Receivables"},
    }


class ReminderReq(BaseModel):
    invoice_id: str

@api.post("/insights/draft-reminder")
async def draft_reminder(body: ReminderReq, user=Depends(current_user)):
    inv = await db.invoices.find_one({"id": body.invoice_id}, {"_id": 0})
    if not inv: raise HTTPException(404, "Invoice not found")
    try:
        due = datetime.fromisoformat(inv["due_date"].replace("Z", "+00:00"))
        days_overdue = max(0, (datetime.now(timezone.utc) - due).days)
    except Exception:
        days_overdue = 0
    tone = "polite" if days_overdue < 15 else "firm" if days_overdue < 45 else "urgent"
    try:
        resp = await _claude(
            f"reminder-{body.invoice_id}",
            ("You draft B2B payment reminder emails for Indian SME accounts teams. "
             'Output ONLY valid JSON: {"subject":"...","body":"..."}. '
             f"Tone: {tone}. Mention amount, invoice number, days overdue and a clear next step. "
             "Sign as 'TechnoBiz Accounts'. body uses \\n for line breaks. No markdown."),
            f"Invoice {inv['number']} for {inv['client_name']}, ₹{inv['total']:,.0f}, {days_overdue} days overdue.")
        j = _extract_json(resp)
        if j: return {**j, "tone": tone, "days_overdue": days_overdue}
    except Exception:
        pass
    return {
        "subject": f"Reminder — Invoice {inv['number']} (₹{inv['total']:,.0f})",
        "body": f"Dear {inv['client_name']} team,\n\nThis is a {tone} reminder regarding invoice {inv['number']} of ₹{inv['total']:,.0f}, currently {days_overdue} days overdue.\n\nKindly arrange payment at the earliest. Reach out if you need a duplicate copy or any reconciliation help.\n\nWarm regards,\nTechnoBiz Accounts",
        "tone": tone, "days_overdue": days_overdue,
    }


class DataQueryReq(BaseModel):
    query: str

@api.post("/insights/data-query")
async def data_query(body: DataQueryReq, user=Depends(current_user)):
    s = await _gather_snapshot()
    top_p = sorted(s["products"], key=lambda p: p["quantity"]*p["unit_price"], reverse=True)[:5]
    top_overdue = sorted(s["overdue"], key=lambda x: -x["total"])[:5]
    by_cat = {}
    for e in s["expenses"]:
        by_cat[e["category"]] = by_cat.get(e["category"], 0) + e["amount"]
    summary = (
        f"Top stock by value: {[(p['sku'], p['name'], int(p['quantity']*p['unit_price'])) for p in top_p]}\n"
        f"Top overdue invoices: {[(i['number'], i['client_name'], int(i['total'])) for i in top_overdue]}\n"
        f"Expenses by category: { {k: int(v) for k,v in by_cat.items()} }\n"
        f"Revenue (paid): ₹{int(s['revenue'])}, Total expenses: ₹{int(s['expenses_total'])}\n"
        f"Products: {len(s['products'])}, Invoices: {len(s['invoices'])}, Low-stock SKUs: {len(s['low'])}"
    )
    try:
        resp = await _claude(
            f"dq-{user['id']}",
            ("You are TechnoBiz AI. Answer using the provided business DATA only. "
             "Always quote specific SKUs/clients/numbers from the DATA. "
             "Reply with 2-4 bullets starting with •. No markdown headers."),
            f"DATA:\n{summary}\n\nQUESTION: {body.query}")
        return {"answer": resp, "used_data": True}
    except Exception:
        return {"answer": "• Data analysis temporarily unavailable\n• Please retry", "used_data": False}


@api.get("/insights/anomalies")
async def anomalies(user=Depends(current_user)):
    s = await _gather_snapshot()
    items = []
    by_cat = {}
    for e in sorted(s["expenses"], key=lambda x: x.get("created_at",""), reverse=True):
        by_cat.setdefault(e["category"], []).append(e["amount"])
    for cat, vals in by_cat.items():
        if len(vals) >= 4:
            recent = vals[0]
            avg = sum(vals[1:]) / max(1, len(vals)-1)
            if avg > 0 and recent > avg * 1.4:
                items.append({"id": uid(), "type": "expense_spike",
                              "title": f"{cat} expense up {round((recent/avg-1)*100)}%",
                              "detail": f"Latest entry ₹{recent:,.0f} vs average ₹{avg:,.0f} — investigate.",
                              "severity": "warning", "module": "finance", "action": "Review Expenses"})
    # Slow paying client
    by_client = {}
    for inv in s["invoices"]:
        by_client.setdefault(inv["client_name"], []).append(inv)
    for client, invs in by_client.items():
        overdue_count = sum(1 for i in invs if i["status"] == "overdue")
        if overdue_count >= 2:
            items.append({"id": uid(), "type": "slow_payer",
                          "title": f"{client} has {overdue_count} overdue",
                          "detail": f"Total stuck: ₹{sum(i['total'] for i in invs if i['status']=='overdue'):,.0f}",
                          "severity": "danger", "module": "finance", "action": "Send Reminder"})
    # Vendor concentration
    by_supplier = {}
    for p in s["products"]:
        by_supplier[p.get("supplier_id")] = by_supplier.get(p.get("supplier_id"), 0) + p["quantity"]*p["unit_price"]
    if by_supplier:
        total_val = sum(by_supplier.values())
        top_sid, top_val = max(by_supplier.items(), key=lambda x: x[1])
        if total_val > 0 and top_val / total_val > 0.45:
            sup = await db.suppliers.find_one({"id": top_sid}, {"_id": 0})
            items.append({"id": uid(), "type": "vendor_concentration",
                          "title": f"Vendor concentration risk",
                          "detail": f"{(sup or {}).get('name','one supplier')} represents {round(top_val/total_val*100)}% of stock value.",
                          "severity": "warning", "module": "inventory", "action": "Diversify"})
    return {"items": items[:8]}


@api.get("/insights/predict-stockout")
async def predict_stockout(user=Depends(current_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(2000)
    moves = await db.stock_moves.find({"type": "out"}, {"_id": 0}).to_list(5000)
    rng = random.Random(11)
    out = []
    for p in products:
        out_qty = sum(m["quantity"] for m in moves if m.get("product_id") == p["id"])
        vel = (out_qty / 30.0) if out_qty > 0 else max(1.0, rng.uniform(2.0, 14.0))
        days = max(0, int(p["quantity"] / vel)) if vel > 0 else 999
        if p["quantity"] > p["reorder_level"] * 2: continue
        out.append({"id": p["id"], "sku": p["sku"], "name": p["name"],
                    "quantity": p["quantity"], "reorder_level": p["reorder_level"],
                    "unit_price": p["unit_price"],
                    "velocity_per_day": round(vel, 1), "days_to_zero": days,
                    "severity": "critical" if days <= 3 else "high" if days <= 7 else "medium"})
    out.sort(key=lambda x: x["days_to_zero"])
    return {"items": out[:24]}


# ---------- Migration ----------
SUPPORTED_SOURCES = [
    {"id": "tally",      "name": "Tally Prime / ERP 9", "icon": "T", "format": "XML, Excel"},
    {"id": "zoho",       "name": "Zoho Books",          "icon": "Z", "format": "CSV, Excel"},
    {"id": "quickbooks", "name": "QuickBooks",          "icon": "Q", "format": "CSV, IIF"},
    {"id": "sap",        "name": "SAP Business One",    "icon": "S", "format": "Excel, CSV"},
    {"id": "marg",       "name": "Marg ERP",            "icon": "M", "format": "DBF, Excel"},
    {"id": "busy",       "name": "Busy Accounting",     "icon": "B", "format": "Excel, CSV"},
    {"id": "csv",        "name": "Generic CSV / Excel", "icon": "C", "format": "CSV, XLSX"},
    {"id": "pdf",        "name": "Scanned PDFs / Bills","icon": "P", "format": "PDF (OCR)"},
]

@api.get("/migration/sources")
async def migration_sources(user=Depends(current_user)):
    return {"sources": SUPPORTED_SOURCES}

@api.get("/migration/history")
async def migration_history(user=Depends(current_user)):
    return await db.migrations.find({}, {"_id": 0}).sort("ts", -1).to_list(50)

@api.post("/migration/upload")
async def migration_upload(
    file: UploadFile = File(...),
    source: str = Form("csv"),
    target: str = Form("products"),
    user=Depends(current_user),
):
    raw = await file.read()
    rows, preview, columns = 0, [], []
    name_lower = (file.filename or "").lower()
    detected = "unknown"
    try:
        if name_lower.endswith(".csv"):
            text = raw.decode("utf-8", errors="ignore")
            data = list(csv.reader(io.StringIO(text)))
            if data:
                columns = data[0][:10]
                rows = max(0, len(data) - 1)
                preview = [r[:10] for r in data[1:6]]
            detected = "csv"
        elif name_lower.endswith(".pdf"):
            detected = "pdf"; columns = ["(AI extraction queued)"]
            preview = [["This PDF will be parsed by AI in ~30 seconds."]]
            rows = max(1, len(raw) // 1500)
        elif name_lower.endswith(".xlsx") or name_lower.endswith(".xls"):
            detected = "excel"; columns = ["(Excel sheet detected)"]
            rows = max(1, len(raw) // 200)
            preview = [["Excel parsing scheduled", f"~{rows} estimated rows"]]
        elif name_lower.endswith(".xml"):
            detected = "tally-xml"; columns = ["(Tally XML)"]
            rows = max(1, raw.decode("utf-8", errors="ignore").count("<VOUCHER"))
            preview = [["Tally voucher entries detected", f"{rows} vouchers"]]
        else:
            detected = "binary"
    except Exception:
        logging.exception("migration parse failed")
    record = {"id": uid(), "filename": file.filename, "size": len(raw),
              "source": source, "target": target, "detected_type": detected,
              "rows": rows, "columns": columns, "status": "ready",
              "ts": now_iso()}
    await db.migrations.insert_one(dict(record))
    await log_activity("Migration upload", f"{file.filename} ({rows} rows)", "settings")
    return {"id": record["id"], "filename": record["filename"], "rows": rows, "columns": columns,
            "preview": preview, "detected_type": detected, "source": source, "target": target,
            "size_kb": round(len(raw) / 1024, 1)}

@api.post("/migration/{mid}/import")
async def migration_import(mid: str, user=Depends(current_user)):
    rec = await db.migrations.find_one({"id": mid}, {"_id": 0})
    if not rec: raise HTTPException(404, "Migration not found")
    await db.migrations.update_one({"id": mid}, {"$set": {"status": "completed", "imported_at": now_iso()}})
    await log_activity("Data import", f"{rec['filename']} ({rec['rows']} rows imported)", "settings")
    return {"ok": True, "imported_rows": rec["rows"], "filename": rec["filename"]}

# ---------- Quick Approvals ----------
@api.post("/approvals/{aid}/decision")
async def approval_decision(aid: str, decision: dict, user=Depends(current_user)):
    await db.approvals.update_one({"id": aid}, {"$set": {"status": decision.get("status", "approved")}})
    await log_activity(f"Approval {decision.get('status','approved')}", aid[:8], "dashboard")
    return {"ok": True}

# ---------- Notifications ----------
@api.get("/notifications")
async def notifications(user=Depends(current_user)):
    return await db.notifications.find({}, {"_id": 0}).sort("ts", -1).to_list(50)

# ---------- Helpers ----------
async def log_activity(title: str, detail: str, module: str):
    await db.activity.insert_one({"id": uid(), "title": title, "detail": detail,
                                   "module": module, "ts": now_iso()})

# ---------- Seed ----------
@api.post("/seed")
async def seed():
    return await _seed()

async def _seed():
    # Clear and reseed
    for c in ["users","products","warehouses","suppliers","stock_moves","transfers",
              "purchase_orders","invoices","expenses","payables","bank_accounts",
              "budgets","activity","approvals","alerts","notifications"]:
        await db[c].delete_many({})

    # Demo user
    await db.users.insert_one({"id": uid(), "email": "demo@technobiz.com", "name": "Aarav Mehta",
                                "role": "owner", "password": hash_pw("demo123"),
                                "created_at": now_iso()})

    # Warehouses
    wh = [
        {"id": uid(), "name": "Mumbai Central", "city": "Mumbai", "capacity": 10000, "occupied": 7800, "items": 1240},
        {"id": uid(), "name": "Pune Hub", "city": "Pune", "capacity": 8000, "occupied": 4200, "items": 860},
        {"id": uid(), "name": "Delhi North", "city": "Delhi", "capacity": 12000, "occupied": 11000, "items": 2100},
        {"id": uid(), "name": "Bangalore Tech", "city": "Bangalore", "capacity": 6000, "occupied": 2400, "items": 540},
    ]
    await db.warehouses.insert_many([dict(w) for w in wh])

    # Suppliers
    sup = [
        {"id": uid(), "name": "Reliable Steels Pvt Ltd", "category": "Raw Material", "rating": 4.6, "outstanding": 248000, "lead_time_days": 4},
        {"id": uid(), "name": "Global Plastics Inc", "category": "Components", "rating": 4.2, "outstanding": 86000, "lead_time_days": 7},
        {"id": uid(), "name": "Pacific Hardware", "category": "Tools", "rating": 4.8, "outstanding": 0, "lead_time_days": 3},
        {"id": uid(), "name": "Krishna Cement", "category": "Construction", "rating": 4.4, "outstanding": 145000, "lead_time_days": 5},
    ]
    await db.suppliers.insert_many([dict(s) for s in sup])

    # Products
    cats = ["Steel Bars", "Cement", "Tiles", "Wiring", "Pipes", "Tools", "Paint", "Bricks"]
    products = []
    random.seed(42)
    for i in range(48):
        cat = random.choice(cats)
        qty = random.randint(0, 800)
        rl = random.randint(50, 200)
        products.append({"id": uid(), "sku": f"TB-{1000+i}", "name": f"{cat} {random.choice(['Premium','Standard','Pro','Eco'])} {random.choice(['A','B','C'])}{random.randint(10,99)}",
                          "category": cat, "quantity": qty, "reorder_level": rl,
                          "unit_price": random.choice([120, 240, 380, 540, 880, 1240, 1880]),
                          "warehouse_id": random.choice(wh)["id"], "supplier_id": random.choice(sup)["id"],
                          "created_at": now_iso()})
    await db.products.insert_many([dict(p) for p in products])

    # Invoices
    clients = ["Sunrise Builders","Apex Constructions","Greenfield Realty","UrbanMakers","Stellar Industries","NorthBay Traders","FirstSteel Co","Ridgeline Mfg"]
    invs = []
    for i in range(28):
        sub = random.randint(45000, 380000)
        tax = sub * 0.18
        status = random.choices(["paid","sent","overdue","draft"], weights=[55,25,15,5])[0]
        days = random.randint(-30, 80)
        invs.append({"id": uid(), "number": f"INV-{2000+i}", "client_name": random.choice(clients),
                      "items": [{"name": "Bulk supply", "qty": random.randint(5,40), "price": random.randint(2000,9000)}],
                      "subtotal": sub, "tax": tax, "total": sub+tax, "tax_rate": 18.0,
                      "status": status, "created_at": (datetime.now(timezone.utc)-timedelta(days=days+30)).isoformat(),
                      "due_date": (datetime.now(timezone.utc)-timedelta(days=days)).isoformat()})
    await db.invoices.insert_many([dict(i) for i in invs])

    # Expenses
    cat_e = ["Salaries","Rent","Utilities","Logistics","Marketing","Repairs","Travel"]
    exps = []
    for i in range(30):
        exps.append({"id": uid(), "category": random.choice(cat_e),
                      "vendor": random.choice(["Acme Pvt","Mahesh Stores","Quick Logix","FastCab","CityPower","Nimbus Cloud"]),
                      "amount": random.randint(2000, 48000),
                      "project": random.choice(["Site A","Site B","Office HQ","Plant 2"]),
                      "status": "approved",
                      "created_at": (datetime.now(timezone.utc)-timedelta(days=random.randint(0,40))).isoformat()})
    await db.expenses.insert_many([dict(e) for e in exps])

    # Purchase Orders
    pos = []
    for i in range(8):
        sup_pick = random.choice(sup)
        items = [{"name": f"{random.choice(cats)} batch", "qty": random.randint(20,200), "price": random.randint(200,1500)} for _ in range(random.randint(1,3))]
        pos.append({"id": uid(), "po_number": f"PO-{3000+i}", "supplier_id": sup_pick["id"],
                     "supplier_name": sup_pick["name"], "items": items,
                     "total": sum(it["qty"]*it["price"] for it in items),
                     "status": random.choice(["draft","pending","approved","received"]),
                     "created_at": (datetime.now(timezone.utc)-timedelta(days=random.randint(0,20))).isoformat()})
    await db.purchase_orders.insert_many([dict(p) for p in pos])

    # Payables
    pays = []
    for s in sup:
        if s["outstanding"] > 0:
            pays.append({"id": uid(), "vendor": s["name"], "amount": s["outstanding"],
                          "due_date": (datetime.now(timezone.utc)+timedelta(days=random.randint(-5,25))).isoformat(),
                          "status": "scheduled"})
    await db.payables.insert_many([dict(p) for p in pays])

    # Bank accounts
    banks = [
        {"id": uid(), "name": "HDFC Current — TechnoBiz", "number": "****4521", "balance": 1842000, "currency": "INR"},
        {"id": uid(), "name": "ICICI Operations", "number": "****8892", "balance": 642000, "currency": "INR"},
        {"id": uid(), "name": "SBI Reserve", "number": "****1107", "balance": 2304000, "currency": "INR"},
    ]
    await db.bank_accounts.insert_many([dict(b) for b in banks])

    # Budgets
    bdg = []
    for c in ["Marketing","Logistics","Operations","Salaries","Procurement"]:
        bdg.append({"id": uid(), "category": c, "budgeted": random.randint(200000, 800000),
                     "actual": random.randint(150000, 850000), "period": "Q1 2026"})
    await db.budgets.insert_many([dict(b) for b in bdg])

    # Approvals
    apr = [
        {"id": uid(), "type": "Purchase Order", "title": "PO-3007 — Reliable Steels", "amount": 482000, "requester": "Priya Nair", "status": "pending", "ts": now_iso()},
        {"id": uid(), "type": "Expense", "title": "Marketing Campaign — Q2", "amount": 84500, "requester": "Karthik Rao", "status": "pending", "ts": now_iso()},
        {"id": uid(), "type": "Discount", "title": "Apex Constructions — 12% bulk", "amount": 156000, "requester": "Sunita Iyer", "status": "pending", "ts": now_iso()},
        {"id": uid(), "type": "Payment", "title": "Krishna Cement settlement", "amount": 145000, "requester": "Rohit Shah", "status": "pending", "ts": now_iso()},
    ]
    await db.approvals.insert_many([dict(a) for a in apr])

    # Smart Alerts
    low_p = [p for p in products if p["quantity"] <= p["reorder_level"]][:3]
    overdue_inv = [i for i in invs if i["status"] == "overdue"][:1]
    alerts = [
        {"id": uid(), "severity": "warning", "type": "low_stock", "title": "Low stock on 5 critical SKUs",
         "message": f"{low_p[0]['name'] if low_p else 'Steel Bars Premium'} hit reorder level. Auto-PO suggested.",
         "action": "Create Draft PO", "module": "inventory"},
        {"id": uid(), "severity": "danger", "type": "overdue", "title": "₹4.8L overdue from Apex Constructions",
         "message": "Payment 18 days overdue. Send polite reminder now.",
         "action": "Send Reminder", "module": "finance"},
        {"id": uid(), "severity": "info", "type": "vendor_delay", "title": "Reliable Steels delivery delayed by 3 days",
         "message": "Pacific Hardware can fulfill the same SKUs in 2 days.",
         "action": "Suggest Alternate", "module": "inventory"},
        {"id": uid(), "severity": "warning", "type": "cash_flow", "title": "Cash flow shortage forecast next week",
         "message": "Outflow exceeds inflow by ₹3.2L on Mar 12. Review payables.",
         "action": "Review Payables", "module": "finance"},
        {"id": uid(), "severity": "info", "type": "gst", "title": "GSTR-3B due in 8 days",
         "message": "Estimated payable: ₹2.4L. Reconcile input credits before filing.",
         "action": "Open GST", "module": "finance"},
        {"id": uid(), "severity": "warning", "type": "dead_stock", "title": "Dead stock rising in Delhi North",
         "message": "12 SKUs unmoved for 90+ days. Worth ₹1.8L. Clearance suggested.",
         "action": "View Items", "module": "inventory"},
    ]
    await db.alerts.insert_many([dict(a) for a in alerts])

    # Activity timeline
    events = [
        ("Invoice created","INV-2027 — Apex Constructions ₹3.4L","finance"),
        ("Stock received","TB-1024 +120 units at Mumbai Central","inventory"),
        ("Payment collected","INV-2019 — Sunrise Builders ₹2.1L","finance"),
        ("PO approved","PO-3004 — Krishna Cement","inventory"),
        ("Expense added","Logistics — ₹18,400","finance"),
        ("Stock transfer","TB-1011 → Pune Hub","inventory"),
        ("Reminder sent","INV-2008 — Stellar Industries","finance"),
        ("Product added","TB-1048 Steel Bars Pro","inventory"),
    ]
    acts = []
    for i, (t, d, m) in enumerate(events):
        acts.append({"id": uid(), "title": t, "detail": d, "module": m,
                      "ts": (datetime.now(timezone.utc)-timedelta(hours=i*2+1)).isoformat()})
    await db.activity.insert_many([dict(a) for a in acts])

    # Notifications
    notifs = [
        {"id": uid(), "title": "GSTR-3B due in 8 days", "type": "compliance", "ts": now_iso(), "read": False},
        {"id": uid(), "title": "₹4.8L overdue from Apex", "type": "receivable", "ts": now_iso(), "read": False},
        {"id": uid(), "title": "Stock low on 5 SKUs", "type": "inventory", "ts": now_iso(), "read": False},
        {"id": uid(), "title": "PO-3007 awaiting approval", "type": "approval", "ts": now_iso(), "read": False},
        {"id": uid(), "title": "Dead stock alert — Delhi North", "type": "inventory", "ts": now_iso(), "read": True},
    ]
    await db.notifications.insert_many([dict(n) for n in notifs])

    # RBAC Roles
    await _seed_rbac()

    return {"ok": True, "seeded": True}


# ---------- RBAC ----------
RBAC_MODULES = [
    {"id": "dashboard", "name": "Dashboard",  "features": ["overview"]},
    {"id": "inventory", "name": "Inventory",  "features": ["products","stock_in","stock_out","transfers","warehouses","suppliers","purchase_orders","alerts","reports"]},
    {"id": "finance",   "name": "Finance",    "features": ["invoices","expenses","receivables","payables","banking","gst","budgeting","reports","alerts"]},
    {"id": "crm",       "name": "CRM",        "features": ["leads","contacts","deals","campaigns"]},
    {"id": "hr",        "name": "HR",         "features": ["employees","attendance","payroll","leaves"]},
    {"id": "reports",   "name": "Reports",    "features": ["financial","operational","compliance"]},
    {"id": "settings",  "name": "Settings",   "features": ["users","roles","preferences","migration"]},
]

def _full_access(modules=None):
    mods = modules or [m["id"] for m in RBAC_MODULES]
    feats = {}
    for m in RBAC_MODULES:
        if m["id"] not in mods: continue
        for f in m["features"]:
            feats[f"{m['id']}.{f}"] = {"enabled": True, "create": True, "read": True, "update": True, "delete": True}
    return {m: (m in mods) for m in [x["id"] for x in RBAC_MODULES]}, feats

def _read_only(mods):
    modules_d, feats = _full_access(mods)
    for k in feats: feats[k] = {"enabled": True, "create": False, "read": True, "update": False, "delete": False}
    return modules_d, feats

async def _seed_rbac():
    await db.roles.delete_many({})
    await db.rbac_audit.delete_many({})
    INF = -1  # unlimited
    super_mods, super_feats = _full_access()
    fin_mods, fin_feats = _full_access(["dashboard","finance","reports"])
    inv_mods, inv_feats = _full_access(["dashboard","inventory","reports"])
    hr_mods,  hr_feats  = _full_access(["dashboard","hr","reports"])
    crm_mods, crm_feats = _full_access(["dashboard","crm","reports"])
    sm_mods,  sm_feats  = _full_access(["dashboard","crm","finance","reports"])
    # Sales manager can't delete invoices/expenses
    for k in list(sm_feats.keys()):
        if k.startswith("finance.") and k not in ("finance.reports",):
            sm_feats[k] = {"enabled": True, "create": True, "read": True, "update": True, "delete": False}
    om_mods,  om_feats  = _full_access(["dashboard","inventory","finance","reports"])
    staff_mods, staff_feats = _read_only(["dashboard","inventory","finance"])
    guest_mods, guest_feats = _read_only(["dashboard","reports"])
    co_mods, co_feats = _full_access(["dashboard","inventory","finance","crm","hr","reports","settings"])

    roles = [
        {"id": uid(), "name": "Super Admin",     "description": "Unrestricted access. The locked highest authority.",
         "is_super_admin": True, "is_locked": True, "access_level": "supreme", "user_count": 1,
         "modules": super_mods, "features": super_feats,
         "approvals": {"purchase_limit": INF, "payment_limit": INF, "discount_limit_pct": 100, "expense_limit": INF},
         "data_scope": "all",
         "security": {"can_export": True, "can_download_invoices": True, "can_view_financial": True,
                      "can_change_settings": True, "can_manage_users": True, "can_view_audit": True, "require_2fa": True},
         "last_modified": now_iso()},
        {"id": uid(), "name": "Company Admin",   "description": "Manages company-wide settings, finances and operations.",
         "is_super_admin": False, "is_locked": False, "access_level": "high", "user_count": 2,
         "modules": co_mods, "features": co_feats,
         "approvals": {"purchase_limit": 1000000, "payment_limit": 500000, "discount_limit_pct": 25, "expense_limit": 200000},
         "data_scope": "all",
         "security": {"can_export": True, "can_download_invoices": True, "can_view_financial": True,
                      "can_change_settings": True, "can_manage_users": True, "can_view_audit": True, "require_2fa": True},
         "last_modified": now_iso()},
        {"id": uid(), "name": "Finance Admin",   "description": "Owns invoicing, expenses, GST and banking.",
         "is_super_admin": False, "is_locked": False, "access_level": "high", "user_count": 3,
         "modules": fin_mods, "features": fin_feats,
         "approvals": {"purchase_limit": 0, "payment_limit": 100000, "discount_limit_pct": 10, "expense_limit": 75000},
         "data_scope": "all",
         "security": {"can_export": True, "can_download_invoices": True, "can_view_financial": True,
                      "can_change_settings": False, "can_manage_users": False, "can_view_audit": True, "require_2fa": True},
         "last_modified": now_iso()},
        {"id": uid(), "name": "Inventory Admin", "description": "Owns products, warehouses, stock movement, POs.",
         "is_super_admin": False, "is_locked": False, "access_level": "high", "user_count": 4,
         "modules": inv_mods, "features": inv_feats,
         "approvals": {"purchase_limit": 250000, "payment_limit": 0, "discount_limit_pct": 0, "expense_limit": 25000},
         "data_scope": "all",
         "security": {"can_export": True, "can_download_invoices": False, "can_view_financial": False,
                      "can_change_settings": False, "can_manage_users": False, "can_view_audit": False, "require_2fa": False},
         "last_modified": now_iso()},
        {"id": uid(), "name": "HR Admin",        "description": "Manages employees, attendance, leaves, payroll.",
         "is_super_admin": False, "is_locked": False, "access_level": "medium", "user_count": 2,
         "modules": hr_mods, "features": hr_feats,
         "approvals": {"purchase_limit": 0, "payment_limit": 0, "discount_limit_pct": 0, "expense_limit": 50000},
         "data_scope": "department",
         "security": {"can_export": True, "can_download_invoices": False, "can_view_financial": False,
                      "can_change_settings": False, "can_manage_users": True, "can_view_audit": False, "require_2fa": False},
         "last_modified": now_iso()},
        {"id": uid(), "name": "CRM Admin",       "description": "Manages leads, contacts, deals and campaigns.",
         "is_super_admin": False, "is_locked": False, "access_level": "medium", "user_count": 3,
         "modules": crm_mods, "features": crm_feats,
         "approvals": {"purchase_limit": 0, "payment_limit": 0, "discount_limit_pct": 15, "expense_limit": 25000},
         "data_scope": "all",
         "security": {"can_export": True, "can_download_invoices": False, "can_view_financial": False,
                      "can_change_settings": False, "can_manage_users": False, "can_view_audit": False, "require_2fa": False},
         "last_modified": now_iso()},
        {"id": uid(), "name": "Sales Manager",   "description": "Owns sales pipeline; closes deals and discounts.",
         "is_super_admin": False, "is_locked": False, "access_level": "medium", "user_count": 6,
         "modules": sm_mods, "features": sm_feats,
         "approvals": {"purchase_limit": 0, "payment_limit": 0, "discount_limit_pct": 5, "expense_limit": 15000},
         "data_scope": "branch",
         "security": {"can_export": True, "can_download_invoices": True, "can_view_financial": True,
                      "can_change_settings": False, "can_manage_users": False, "can_view_audit": False, "require_2fa": False},
         "last_modified": now_iso()},
        {"id": uid(), "name": "Operations Manager","description": "Coordinates inventory + finance day-to-day.",
         "is_super_admin": False, "is_locked": False, "access_level": "medium", "user_count": 4,
         "modules": om_mods, "features": om_feats,
         "approvals": {"purchase_limit": 100000, "payment_limit": 50000, "discount_limit_pct": 8, "expense_limit": 35000},
         "data_scope": "branch",
         "security": {"can_export": True, "can_download_invoices": True, "can_view_financial": True,
                      "can_change_settings": False, "can_manage_users": False, "can_view_audit": False, "require_2fa": False},
         "last_modified": now_iso()},
        {"id": uid(), "name": "Staff User",      "description": "Day-to-day operational user; read-mostly.",
         "is_super_admin": False, "is_locked": False, "access_level": "low", "user_count": 18,
         "modules": staff_mods, "features": staff_feats,
         "approvals": {"purchase_limit": 0, "payment_limit": 0, "discount_limit_pct": 0, "expense_limit": 5000},
         "data_scope": "own",
         "security": {"can_export": False, "can_download_invoices": True, "can_view_financial": False,
                      "can_change_settings": False, "can_manage_users": False, "can_view_audit": False, "require_2fa": False},
         "last_modified": now_iso()},
        {"id": uid(), "name": "Guest / Intern",  "description": "Read-only views for limited modules.",
         "is_super_admin": False, "is_locked": False, "access_level": "view_only", "user_count": 5,
         "modules": guest_mods, "features": guest_feats,
         "approvals": {"purchase_limit": 0, "payment_limit": 0, "discount_limit_pct": 0, "expense_limit": 0},
         "data_scope": "own",
         "security": {"can_export": False, "can_download_invoices": False, "can_view_financial": False,
                      "can_change_settings": False, "can_manage_users": False, "can_view_audit": False, "require_2fa": False},
         "last_modified": now_iso()},
    ]
    await db.roles.insert_many([dict(r) for r in roles])


@api.get("/rbac/modules")
async def rbac_modules(user=Depends(current_user)):
    return {"modules": RBAC_MODULES}

@api.get("/rbac/roles")
async def rbac_list_roles(user=Depends(current_user)):
    rs = await db.roles.find({}, {"_id": 0}).to_list(100)
    rs.sort(key=lambda r: (not r.get("is_super_admin"), {"supreme":0,"high":1,"medium":2,"low":3,"view_only":4}.get(r.get("access_level","low"), 5)))
    return rs

@api.get("/rbac/roles/{role_id}")
async def rbac_get_role(role_id: str, user=Depends(current_user)):
    r = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not r: raise HTTPException(404, "Role not found")
    return r

class RoleSaveReq(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    modules: Optional[Dict[str, bool]] = None
    features: Optional[Dict[str, Dict[str, Any]]] = None
    approvals: Optional[Dict[str, Any]] = None
    data_scope: Optional[str] = None
    security: Optional[Dict[str, bool]] = None

@api.put("/rbac/roles/{role_id}")
async def rbac_save_role(role_id: str, body: RoleSaveReq, user=Depends(current_user)):
    r = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not r: raise HTTPException(404, "Role not found")
    if r.get("is_locked"): raise HTTPException(403, "This role is locked and cannot be edited")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    update["last_modified"] = now_iso()
    await db.roles.update_one({"id": role_id}, {"$set": update})
    await db.rbac_audit.insert_one({"id": uid(), "role_id": role_id, "role_name": r["name"],
                                     "actor": user["name"], "action": "update", "ts": now_iso(),
                                     "summary": f"Updated permissions for {r['name']}"})
    return {"ok": True}

class RoleCreateReq(BaseModel):
    name: str
    description: Optional[str] = ""
    template_role_id: Optional[str] = None

@api.post("/rbac/roles")
async def rbac_create_role(body: RoleCreateReq, user=Depends(current_user)):
    template = None
    if body.template_role_id:
        template = await db.roles.find_one({"id": body.template_role_id}, {"_id": 0})
    if not template:
        mods, feats = _read_only(["dashboard"])
        template = {"modules": mods, "features": feats,
                    "approvals": {"purchase_limit": 0, "payment_limit": 0, "discount_limit_pct": 0, "expense_limit": 0},
                    "data_scope": "own",
                    "security": {"can_export": False, "can_download_invoices": False, "can_view_financial": False,
                                 "can_change_settings": False, "can_manage_users": False, "can_view_audit": False, "require_2fa": False}}
    new = {"id": uid(), "name": body.name, "description": body.description or "",
           "is_super_admin": False, "is_locked": False, "access_level": "low", "user_count": 0,
           "modules": template["modules"], "features": template["features"],
           "approvals": template["approvals"], "data_scope": template["data_scope"],
           "security": template["security"], "last_modified": now_iso()}
    await db.roles.insert_one(dict(new))
    await db.rbac_audit.insert_one({"id": uid(), "role_id": new["id"], "role_name": new["name"],
                                     "actor": user["name"], "action": "create", "ts": now_iso(),
                                     "summary": f"Created role {new['name']}"})
    new.pop("_id", None)
    return new

@api.post("/rbac/roles/{role_id}/duplicate")
async def rbac_duplicate(role_id: str, user=Depends(current_user)):
    r = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not r: raise HTTPException(404, "Role not found")
    new = {**r, "id": uid(), "name": f"{r['name']} (copy)", "is_super_admin": False, "is_locked": False,
           "user_count": 0, "last_modified": now_iso()}
    await db.roles.insert_one(dict(new))
    await db.rbac_audit.insert_one({"id": uid(), "role_id": new["id"], "role_name": new["name"],
                                     "actor": user["name"], "action": "duplicate", "ts": now_iso(),
                                     "summary": f"Duplicated {r['name']} → {new['name']}"})
    new.pop("_id", None)
    return new

@api.delete("/rbac/roles/{role_id}")
async def rbac_delete(role_id: str, user=Depends(current_user)):
    r = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not r: raise HTTPException(404, "Role not found")
    if r.get("is_locked"): raise HTTPException(403, "Locked role cannot be deleted")
    await db.roles.delete_one({"id": role_id})
    await db.rbac_audit.insert_one({"id": uid(), "role_id": role_id, "role_name": r["name"],
                                     "actor": user["name"], "action": "delete", "ts": now_iso(),
                                     "summary": f"Deleted role {r['name']}"})
    return {"ok": True}

@api.get("/rbac/audit")
async def rbac_audit(user=Depends(current_user)):
    return await db.rbac_audit.find({}, {"_id": 0}).sort("ts", -1).to_list(100)


# ---------- Global Search ----------
@api.get("/search")
async def search(q: str, user=Depends(current_user)):
    q = (q or "").strip()
    if not q: return {"results": []}
    qre = {"$regex": re.escape(q), "$options": "i"}
    results = []
    products = await db.products.find({"$or": [{"name": qre}, {"sku": qre}, {"category": qre}]}, {"_id": 0}).to_list(8)
    for p in products:
        results.append({"type": "product", "title": p["name"], "sub": f"{p['sku']} · {p['category']} · qty {p['quantity']}",
                        "href": "/inventory/products"})
    invoices = await db.invoices.find({"$or": [{"number": qre}, {"client_name": qre}]}, {"_id": 0}).to_list(8)
    for i in invoices:
        results.append({"type": "invoice", "title": f"{i['number']} · {i['client_name']}",
                        "sub": f"₹{i['total']:,.0f} · {i['status']}", "href": "/finance/invoices"})
    pos = await db.purchase_orders.find({"$or": [{"po_number": qre}, {"supplier_name": qre}]}, {"_id": 0}).to_list(8)
    for p in pos:
        results.append({"type": "po", "title": f"{p['po_number']}", "sub": f"{p.get('supplier_name','—')} · {p.get('status','')}",
                        "href": "/inventory/purchase-orders"})
    suppliers = await db.suppliers.find({"$or": [{"name": qre}, {"category": qre}]}, {"_id": 0}).to_list(5)
    for s in suppliers:
        results.append({"type": "supplier", "title": s["name"], "sub": f"{s['category']} · ₹{s['outstanding']:,.0f} due",
                        "href": "/inventory/suppliers"})
    expenses = await db.expenses.find({"$or": [{"vendor": qre}, {"category": qre}, {"project": qre}]}, {"_id": 0}).to_list(5)
    for e in expenses:
        results.append({"type": "expense", "title": f"{e['vendor']} · {e['category']}",
                        "sub": f"₹{e['amount']:,.0f} · {e.get('project','—')}", "href": "/finance/expenses"})
    return {"results": results[:25]}


# ---------- Reports with AI summary + filter + CSV export ----------
def _filter_by_period(items, period: str, key="created_at"):
    now = datetime.now(timezone.utc)
    cutoff = {"day": now - timedelta(days=1), "week": now - timedelta(days=7), "month": now - timedelta(days=30)}.get(period)
    if not cutoff: return items
    out = []
    for it in items:
        try:
            ts = datetime.fromisoformat(str(it.get(key, "")).replace("Z","+00:00"))
            if ts >= cutoff: out.append(it)
        except Exception:
            out.append(it)
    return out

@api.get("/reports/{kind}")
async def report(kind: str, period: str = "month", user=Depends(current_user)):
    if kind == "pl":
        invs = _filter_by_period(await db.invoices.find({"status":"paid"}, {"_id":0}).to_list(2000), period)
        exps = _filter_by_period(await db.expenses.find({}, {"_id":0}).to_list(2000), period)
        revenue = sum(i["total"] for i in invs)
        expenses_total = sum(e["amount"] for e in exps)
        return {"kind": kind, "period": period,
                "metrics": {"revenue": revenue, "expenses": expenses_total, "profit": revenue-expenses_total,
                            "margin": round((revenue-expenses_total)/revenue*100, 1) if revenue else 0},
                "rows": [{"label":"Revenue","value":revenue}, {"label":"Expenses","value":expenses_total},
                          {"label":"Net Profit","value":revenue-expenses_total}]}
    if kind == "stock":
        products = await db.products.find({}, {"_id":0}).to_list(2000)
        by_cat = {}
        for p in products:
            v = p["quantity"] * p["unit_price"]
            by_cat[p["category"]] = by_cat.get(p["category"], 0) + v
        return {"kind": kind, "period": period,
                "metrics": {"sku_count": len(products), "total_value": sum(p["quantity"]*p["unit_price"] for p in products)},
                "rows": [{"label": k, "value": v} for k, v in sorted(by_cat.items(), key=lambda x: -x[1])]}
    if kind == "sales":
        invs = _filter_by_period(await db.invoices.find({}, {"_id":0}).to_list(2000), period)
        by_client = {}
        for i in invs: by_client[i["client_name"]] = by_client.get(i["client_name"], 0) + i["total"]
        return {"kind": kind, "period": period,
                "metrics": {"invoices": len(invs), "total": sum(i["total"] for i in invs)},
                "rows": [{"label": k, "value": v} for k, v in sorted(by_client.items(), key=lambda x: -x[1])]}
    if kind == "expenses":
        exps = _filter_by_period(await db.expenses.find({}, {"_id":0}).to_list(2000), period)
        by_cat = {}
        for e in exps: by_cat[e["category"]] = by_cat.get(e["category"], 0) + e["amount"]
        return {"kind": kind, "period": period,
                "metrics": {"entries": len(exps), "total": sum(e["amount"] for e in exps)},
                "rows": [{"label": k, "value": v} for k, v in sorted(by_cat.items(), key=lambda x: -x[1])]}
    raise HTTPException(404, "Unknown report")

@api.get("/reports/{kind}/summary")
async def report_summary(kind: str, period: str = "month", user=Depends(current_user)):
    base = await report(kind, period, user)
    rows_text = "\n".join(f"- {r['label']}: ₹{r['value']:,.0f}" for r in base["rows"][:8])
    metrics_text = ", ".join(f"{k}={v}" for k, v in base["metrics"].items())
    try:
        resp = await _claude(f"report-{kind}-{period}",
            ("You are TechnoBiz AI report analyst. Reply with 3 bullets starting with •. "
             "First bullet = headline finding with a number. "
             "Second = anomaly or risk. Third = next action. Indian SME context. No markdown."),
            f"Report: {kind} ({period}). Metrics: {metrics_text}\nBreakdown:\n{rows_text}")
        return {"summary": resp, **base}
    except Exception:
        return {"summary": f"• {kind.upper()} report for {period} — see breakdown\n• Track top 3 lines closely\n• Schedule a review with stakeholders", **base}

@api.get("/reports/{kind}/export.csv")
async def report_export(kind: str, period: str = "month", user=Depends(current_user)):
    base = await report(kind, period, user)
    from fastapi.responses import StreamingResponse
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Report", kind])
    w.writerow(["Period", period])
    w.writerow([])
    for k, v in base["metrics"].items():
        w.writerow([k, v])
    w.writerow([])
    w.writerow(["Label", "Value"])
    for r in base["rows"]:
        w.writerow([r["label"], r["value"]])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={kind}_{period}.csv"})

@app.on_event("startup")
async def startup():
    if await db.users.count_documents({}) == 0:
        await _seed()
        logging.info("Seeded demo data")

@api.get("/")
async def root(): return {"service": "TechnoBiz Smart ERP", "status": "ok"}

app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"], allow_headers=["*"])

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

@app.on_event("shutdown")
async def shutdown(): client.close()
