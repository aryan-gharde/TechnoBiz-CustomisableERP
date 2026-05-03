import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight,
  Warehouse, Truck, ClipboardList, Bell, BarChart3, Receipt, Wallet,
  CreditCard, Landmark, Calculator, Target, FileText, AlertTriangle,
  ChevronLeft, ChevronRight, Settings as SettingsIcon
} from "lucide-react";

const items = {
  dashboard: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  ],
  inventory: [
    { to: "/inventory", icon: LayoutDashboard, label: "Overview", end: true },
    { to: "/inventory/products", icon: Package, label: "Products" },
    { to: "/inventory/stock-in", icon: ArrowDownToLine, label: "Stock In" },
    { to: "/inventory/stock-out", icon: ArrowUpFromLine, label: "Stock Out" },
    { to: "/inventory/transfers", icon: ArrowLeftRight, label: "Transfers" },
    { to: "/inventory/warehouses", icon: Warehouse, label: "Warehouses" },
    { to: "/inventory/suppliers", icon: Truck, label: "Suppliers" },
    { to: "/inventory/purchase-orders", icon: ClipboardList, label: "Purchase Orders" },
    { to: "/inventory/alerts", icon: Bell, label: "Alerts" },
    { to: "/inventory/reports", icon: BarChart3, label: "Reports" },
  ],
  finance: [
    { to: "/finance", icon: LayoutDashboard, label: "Overview", end: true },
    { to: "/finance/invoices", icon: Receipt, label: "Invoices" },
    { to: "/finance/expenses", icon: Wallet, label: "Expenses" },
    { to: "/finance/receivables", icon: CreditCard, label: "Receivables" },
    { to: "/finance/payables", icon: Landmark, label: "Payables" },
    { to: "/finance/banking", icon: Landmark, label: "Banking" },
    { to: "/finance/gst", icon: Calculator, label: "GST & Compliance" },
    { to: "/finance/budgeting", icon: Target, label: "Budgeting" },
    { to: "/finance/reports", icon: BarChart3, label: "Reports" },
    { to: "/finance/alerts", icon: AlertTriangle, label: "Alerts" },
  ],
  reports: [{ to: "/reports", icon: FileText, label: "All Reports" }],
  calendar: [{ to: "/calendar", icon: LayoutDashboard, label: "Month View" }],
  settings: [{ to: "/settings", icon: SettingsIcon, label: "Settings" }],
};

const moduleTitles = {
  dashboard: "Command Center",
  inventory: "Inventory",
  finance: "Finance",
  reports: "Reports",
  calendar: "Calendar",
  settings: "Settings",
};

export default function Sidebar({ module, collapsed, onToggle }) {
  const list = items[module] || items.dashboard;
  return (
    <aside data-testid="sidebar" className={`glass border-r border-white/50 dark:border-indigo-500/15 transition-all duration-300 ${collapsed ? "w-[72px]" : "w-[252px]"} hidden md:flex flex-col sticky top-16 h-[calc(100vh-64px)]`}>
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        {!collapsed && <div className="text-[10px] tracking-[0.18em] uppercase font-semibold text-slate-400 dark:text-slate-500">{moduleTitles[module]}</div>}
        <button onClick={onToggle} data-testid="sidebar-toggle"
          className="h-7 w-7 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 transition">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="px-3 flex-1 overflow-y-auto scroll-hidden">
        {list.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} data-testid={`nav-${label.toLowerCase().replace(/\s+/g,"-")}`}
            className={({ isActive }) =>
              `group flex items-center gap-3 my-0.5 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all ${
                isActive ? "sidebar-pill-active" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/70 dark:hover:bg-slate-800/40"
              }`}>
            <Icon className="h-[18px] w-[18px] flex-none" strokeWidth={1.8} />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>
      {!collapsed && (
        <div className="m-3 p-3 rounded-xl border border-slate-200 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40">
          <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Need help?</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Press ⌘K to search anywhere</div>
        </div>
      )}
    </aside>
  );
}
