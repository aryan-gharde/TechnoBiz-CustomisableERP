# TechnoBiz Smart ERP — Product Requirements (Living Doc)

## Original Problem Statement
Build a fully interactive, premium prototype for **TechnoBiz Smart ERP** focused on Finance + Inventory modules. Must feel like a next-generation business operating platform — proactive, modern, premium SaaS, glassmorphism (selective), purple brand identity with module-tinted accents.

## Architecture
- **Backend:** FastAPI + MongoDB + JWT auth (bcrypt) + Claude Sonnet 4.5 (via Emergent Universal LLM Key) for proactive insights.
- **Frontend:** React 19 + React Router + Tailwind + Recharts + cmdk + sonner + shadcn/ui + lucide-react + framer-motion (loaded).
- **Auth:** demo@technobiz.com / demo123 (seeded automatically).

## User Personas
- Owners (Aarav)
- Accountants
- Store Managers
- Sales Teams
- Operations Managers

## What's Implemented (Feb 2026)
### Backend
- /api/auth/(login|register|me) — JWT + bcrypt
- /api/dashboard — KPIs, cash flow, stock movement, alerts, approvals, activity
- /api/inventory/* — products, stock-in, stock-out, transfers, warehouses, suppliers, purchase-orders, alerts
- /api/finance/* — invoices, expenses, receivables (aging buckets), payables, banking, gst, budgets
- /api/insights/generate — Claude Sonnet 4.5 proactive AI insights (verified live)
- /api/notifications, /api/approvals/{id}/decision
- Seed: 48 products, 4 warehouses, 4 suppliers, 28 invoices, 30 expenses, 8 POs, 6 alerts, 8 activity, 5 notifications, 4 approvals.
- Test suite: 23/23 passing — /app/backend/tests/backend_test.py

### Frontend
- Login (split-screen brand panel + form) — demo@technobiz.com / demo123
- AppShell with glass top nav, dynamic sidebar per module, FAB (mobile), ⌘K command palette, notification drawer, profile menu
- **Light + Dark mode toggle** (premium purple, not cyberpunk) — persisted in localStorage
- Dashboard: 6 KPI cards w/ sparklines, workflow shortcut row, Cash Flow + Stock Movement charts, Smart Alerts grid (with "Ask AI" inline Claude insights), Pending Approvals (approve/reject), Recent Activity timeline
- Inventory: Overview, Products (CRUD + filters), Stock In, Stock Out, Transfers, Warehouses (occupancy bars), Suppliers, Purchase Orders (kanban), Alerts (low/dead), Reports (charts)
- Finance: Overview, Invoices (CRUD + line items), Expenses (CRUD + bill upload UI), Receivables (aging buckets + reminders), Payables, Banking, GST (filing summary), Budgeting (vs actual bars), Reports, Alerts
- Reports hub, Settings

### Visual Identity
- Purple core brand with module-tinted CSS variables
- Light theme, glassmorphism on Top Nav / Sidebar / Search Modal / Notification Drawer / FAB
- Outfit + Inter fonts, soft shadows, hover lift, magnetic CTA glow, sparklines, bento grids

## Backlog (P1)
- ~~Drill-down detail pages (KPI click → filtered list)~~ ✅ done in iter 2
- CRM, HR modules
- ~~Mobile-first refinements (bottom-nav, swipe approvals)~~ ✅ done in iter 2
- ~~Advanced AI: forecast accuracy %, recommended POs auto-generation~~ ✅ done in iter 2
- Real GSTR-3B PDF export
- Multi-currency

## Iteration 2 (Feb 2026)
- **Drill-down pages**, **AI Forecast Badge + Auto-PO**, **Mobile BottomNav + SwipeApproval**.

## Iteration 3 (Feb 2026)
- **Daily AI Briefing** (`/api/insights/briefing` + `BriefingCard`) — Risk / Opportunity / Action card on Dashboard, refreshable.
- **AI-drafted reminders** (`/api/insights/draft-reminder` + `ReminderDraftModal`) on Receivables — tone-aware (polite/firm/urgent), editable, sendable.
- **Conversational data queries** — `AskAIModal` now hits `/api/insights/data-query` which feeds Claude a snapshot of real products/invoices/expenses so answers cite specific SKUs/clients/numbers.
- **Anomaly detection** (`/api/insights/anomalies`) — expense spikes, slow-paying clients, vendor concentration.
- **Predictive stockout forecast** (`/api/insights/predict-stockout`) — days-to-zero per SKU with severity, shown on Inventory Alerts.
- **Month-end checklist** (`MonthEndChecklist`) on Finance Overview — 6 tasks, AI-tagged auto-run for 3.
- **Data Migration screen** (`/settings/migration`) — accepts CSV / XLSX / PDF / XML / IIF from Tally / Zoho / QuickBooks / SAP / Marg / Busy / Generic / Scanned PDFs. Upload → AI-detected preview → Run Import → history.
- Backend regression: 44/44 (23 + 11 + 10) passing.

## Backlog (P2)
- Audit trail per record
- Role-based access for Owner/Accountant/Manager
- 2FA / SSO
- Webhooks for Tally/Zoho integrations

## Iteration 4 (Feb 2026)
- **RBAC Settings** — `/settings/access-control` with role directory, module/feature/CRUD/approvals/scope/security tabs, audit log, role create/duplicate/delete; backend `/api/rbac/*`.
- **Global Search** — `CommandPalette` (⌘K) across products / invoices / expenses / clients / suppliers.
- **AI-summarised Reports** — `/api/reports/{kind}/summary` + Reports.jsx with Claude-generated narrative.

## Iteration 5 (May 2026)
- **Budgeting CRUD** — `POST/DELETE /api/finance/budgets`; Budgeting.jsx now has summary KPI tiles, "New Budget" modal (category incl. custom 'Other', period, budgeted, actual), hover-revealed delete.
- **Settings Profile + Company** — two new editable sections persisted to `localStorage` (`tb_profile`, `tb_company`); essential personal + company details (GSTIN, PAN, registration #, address, etc.).
- **Reports — professional template + edit insights + Download PDF** — cover header (logo, company, period, generated, prepared-by, GSTIN), executive summary (locally editable + reset), key metrics tiles, bar + pie chart side-by-side, detailed breakdown table, signature/footer block. `Download PDF` triggers `window.print` against `#tb-report-doc` with a scoped `@media print` stylesheet.
- **Alignment polish** — TopNav search/quick-add, AlertCard action/Ask-AI, Btn primitive standardised on `inline-flex items-center gap-1.5` with `leading-none whitespace-nowrap`.
- **Mobile layout** — PageHeader stacks `flex-col sm:flex-row`, modals respect viewport width, dashboard KPI grid keeps spacing on small screens.
- Tests: backend 5/5 in `/app/backend/tests/test_iteration5.py`; frontend Playwright validated by testing agent (iteration_5.json) — 100% pass.

## Iteration 6 (Feb 2026)
- **Global Calendar** — `GET /api/calendar/events` aggregates invoices (due_date), payables (due_date), pending approvals (ts), purchase orders (created_at), GST filings (computed), and low-stock alerts into a unified feed (with `?date_from`/`?date_to` filters). New `/calendar` page renders a custom 6×7 month grid with filter chips per type, prev/today/next navigation, day-click → details panel, and Upcoming Events list. Calendar tab wired into TopNav, Sidebar, BottomNav (replaces Reports on mobile), and dynamic accent (purple).
- **Notifications & Workflow Preferences in Settings** — localStorage-persisted: 8 topics × 3 channels (email / in-app / push) toggle matrix; workflow defaults (approval threshold, payment terms, reminder cadence, digest time, auto-remind overdue, auto-PO low stock, weekly summary).
- Tests: backend 9/9 in `/app/backend/tests/test_iteration6_calendar.py`; frontend 100% via testing agent (iteration_6.json).

## Backlog (P1 next)
- Modular refactor of `server.py` (~1300 lines → `core/`, `auth/`, `inventory/`, `finance/`, `calendar/`)
- Wire workflow preferences (approval threshold, auto-PO, weekly summary) into actual backend behaviour
