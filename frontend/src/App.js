import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Login from "@/pages/Login";
import AppShell from "@/components/AppShell";
import Dashboard from "@/pages/Dashboard";
import InvOverview from "@/pages/inventory/Overview";
import Products from "@/pages/inventory/Products";
import StockIn from "@/pages/inventory/StockIn";
import StockOut from "@/pages/inventory/StockOut";
import Transfers from "@/pages/inventory/Transfers";
import Warehouses from "@/pages/inventory/Warehouses";
import Suppliers from "@/pages/inventory/Suppliers";
import PurchaseOrders from "@/pages/inventory/PurchaseOrders";
import InvAlerts from "@/pages/inventory/Alerts";
import InvReports from "@/pages/inventory/Reports";
import FinOverview from "@/pages/finance/Overview";
import Invoices from "@/pages/finance/Invoices";
import Expenses from "@/pages/finance/Expenses";
import Receivables from "@/pages/finance/Receivables";
import Payables from "@/pages/finance/Payables";
import Banking from "@/pages/finance/Banking";
import GST from "@/pages/finance/GST";
import Budgeting from "@/pages/finance/Budgeting";
import FinReports from "@/pages/finance/Reports";
import FinAlerts from "@/pages/finance/Alerts";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Drilldown from "@/pages/Drilldown";
import Migration from "@/pages/Migration";
import AccessControl from "@/pages/AccessControl";
import Calendar from "@/pages/Calendar";

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-slate-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><AppShell /></Protected>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        <Route path="inventory" element={<InvOverview />} />
        <Route path="inventory/products" element={<Products />} />
        <Route path="inventory/stock-in" element={<StockIn />} />
        <Route path="inventory/stock-out" element={<StockOut />} />
        <Route path="inventory/transfers" element={<Transfers />} />
        <Route path="inventory/warehouses" element={<Warehouses />} />
        <Route path="inventory/suppliers" element={<Suppliers />} />
        <Route path="inventory/purchase-orders" element={<PurchaseOrders />} />
        <Route path="inventory/alerts" element={<InvAlerts />} />
        <Route path="inventory/reports" element={<InvReports />} />

        <Route path="finance" element={<FinOverview />} />
        <Route path="finance/invoices" element={<Invoices />} />
        <Route path="finance/expenses" element={<Expenses />} />
        <Route path="finance/receivables" element={<Receivables />} />
        <Route path="finance/payables" element={<Payables />} />
        <Route path="finance/banking" element={<Banking />} />
        <Route path="finance/gst" element={<GST />} />
        <Route path="finance/budgeting" element={<Budgeting />} />
        <Route path="finance/reports" element={<FinReports />} />
        <Route path="finance/alerts" element={<FinAlerts />} />

        <Route path="reports" element={<Reports />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/migration" element={<Migration />} />
        <Route path="settings/access-control" element={<AccessControl />} />
        <Route path="drilldown/:kpi" element={<Drilldown />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster position="top-right" richColors closeButton />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}
