import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Wallet, Receipt, TrendingUp, Boxes, AlertTriangle, CreditCard, Check, X, Plus, ArrowRight, Sparkles } from "lucide-react";
import { api, formatINR } from "@/lib/api";
import { toast } from "sonner";
import KpiCard from "@/components/KpiCard";
import AlertCard from "@/components/AlertCard";
import SwipeApproval from "@/components/SwipeApproval";
import ForecastBadge from "@/components/ForecastBadge";
import AskAIModal from "@/components/AskAIModal";
import BriefingCard from "@/components/BriefingCard";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";

const workflows = [
  { id: "raise-invoice", label: "Raise Invoice", to: "/finance/invoices?new=1", icon: Receipt },
  { id: "receive-material", label: "Receive Material", to: "/inventory/stock-in?new=1", icon: Boxes },
  { id: "collect-payment", label: "Collect Payment", to: "/finance/receivables", icon: CreditCard },
  { id: "create-po", label: "Create Purchase Order", to: "/inventory/purchase-orders?new=1", icon: Plus },
  { id: "approve-expense", label: "Approve Expense", to: "/finance/expenses", icon: Check },
  { id: "transfer-stock", label: "Transfer Stock", to: "/inventory/transfers?new=1", icon: ArrowRight },
];

export default function Dashboard() {
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => { api.get("/dashboard").then(r=>setD(r.data)); }, []);

  const handleApproval = async (a, status) => {
    await api.post(`/approvals/${a.id}/decision`, { status });
    toast.success(`${a.title} ${status}`);
    api.get("/dashboard").then(r=>setD(r.data));
  };

  const handleAlertAction = (a) => {
    if (a.type === "low_stock") nav("/inventory/purchase-orders?new=1");
    else if (a.type === "overdue") nav("/finance/receivables");
    else if (a.type === "vendor_delay") nav("/inventory/suppliers");
    else if (a.type === "cash_flow") nav("/finance/payables");
    else if (a.type === "gst") nav("/finance/gst");
    else if (a.type === "dead_stock") nav("/inventory/alerts");
  };

  if (!d) return <div className="text-slate-400 text-sm">Loading dashboard…</div>;

  const k = d.kpis;

  return (
    <div className="space-y-7">
      <PageHeader
        title="Good morning, Aarav"
        subtitle="Here's what your business needs from you today."
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            <ForecastBadge />
            <Btn variant="ghost" onClick={()=>toast.success("Report exported")} data-testid="export-btn">Export</Btn>
            <Btn data-testid="ask-ai-btn" onClick={()=>setAiOpen(true)}><Sparkles className="inline h-3.5 w-3.5 mr-1" />Ask AI</Btn>
          </div>
        } />

      {/* Workflow shortcuts */}
      <div className="flex items-center gap-2 overflow-x-auto scroll-hidden pb-1" data-testid="workflow-row">
        {workflows.map(w => (
          <button key={w.id} data-testid={`wf-${w.id}`} onClick={()=>nav(w.to)}
            className="flex-none flex items-center gap-2 h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm transition text-sm font-medium text-slate-700">
            <w.icon className="h-4 w-4 text-indigo-600" />
            {w.label}
          </button>
        ))}
      </div>

      {/* Daily AI Briefing */}
      <BriefingCard />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard id="revenue" label="Revenue" value={k.revenue.value} trend={k.revenue.trend} spark={k.revenue.spark} icon={TrendingUp} glass onClick={()=>nav("/drilldown/revenue")} />
        <KpiCard id="expenses" label="Expenses" value={k.expenses.value} trend={k.expenses.trend} spark={k.expenses.spark} icon={Wallet} onClick={()=>nav("/drilldown/expenses")} />
        <KpiCard id="profit" label="Net Profit" value={k.net_profit.value} trend={k.net_profit.trend} spark={k.net_profit.spark} icon={TrendingUp} onClick={()=>nav("/drilldown/profit")} />
        <KpiCard id="stock-value" label="Stock Value" value={k.stock_value.value} trend={k.stock_value.trend} spark={k.stock_value.spark} icon={Boxes} onClick={()=>nav("/drilldown/stock-value")} />
        <KpiCard id="low-stock" label="Low Stock" value={k.low_stock.value} trend={k.low_stock.trend} spark={k.low_stock.spark} icon={AlertTriangle} isCount onClick={()=>nav("/drilldown/low-stock")} />
        <KpiCard id="receivables" label="Receivables" value={k.receivables.value} trend={k.receivables.trend} spark={k.receivables.spark} icon={CreditCard} onClick={()=>nav("/drilldown/receivables")} />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Section title="Cash Flow Overview" className="lg:col-span-2"
          action={<Pill tone="info">Last 8 weeks</Pill>}>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={d.cash_flow}>
                <defs>
                  <linearGradient id="ci" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="co" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v)=>`₹${(v/1000).toFixed(0)}K`} tickLine={false} axisLine={false} width={50} />
                <Tooltip contentStyle={{borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12}} formatter={(v)=>formatINR(v)} />
                <Legend wrapperStyle={{fontSize: 12}} />
                <Area type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2} fill="url(#ci)" />
                <Area type="monotone" dataKey="outflow" stroke="#f43f5e" strokeWidth={2} fill="url(#co)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Stock Movement" action={<Pill tone="accent">7 days</Pill>}>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={d.stock_movement}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12}} />
                <Legend wrapperStyle={{fontSize: 11}} />
                <Bar dataKey="in" stackId="a" fill="#10b981" radius={[0,0,0,0]} />
                <Bar dataKey="out" stackId="a" fill="#6366f1" radius={[0,0,0,0]} />
                <Bar dataKey="transfers" stackId="a" fill="#a78bfa" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* Smart Alerts + Approvals + Activity */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Section title="Smart Alerts Center" className="lg:col-span-2"
          action={<Pill tone="warning">{d.alerts.length} active</Pill>}>
          <div className="grid sm:grid-cols-2 gap-3 items-start auto-rows-min" data-testid="alerts-grid">
            {d.alerts.map(a => <AlertCard key={a.id} alert={a} onAction={handleAlertAction} />)}
          </div>
        </Section>

        <div className="space-y-5">
          <Section title="Pending Approvals" action={<Pill tone="warning">{d.approvals.length}</Pill>}>
            <div className="text-[11px] text-slate-400 mb-2 md:hidden">Swipe right to approve · left to reject</div>
            <div className="space-y-2.5">
              {d.approvals.map(a => (
                <SwipeApproval key={a.id} testId={`approval-${a.id.slice(0,6)}`}
                  onApprove={() => handleApproval(a, "approved")}
                  onReject={() => handleApproval(a, "rejected")}>
                  <div className="rounded-xl border border-slate-200 p-3 bg-white dark:bg-slate-900/50">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Pill tone="default">{a.type}</Pill>
                      <span className="text-xs font-mono-tab text-slate-700 font-semibold">{formatINR(a.amount)}</span>
                    </div>
                    <div className="text-[13px] font-medium text-slate-900">{a.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">by {a.requester}</div>
                    <div className="hidden md:flex gap-2 mt-2.5">
                      <Btn variant="primary" data-testid="approval-approve" onClick={(e)=>{e.stopPropagation(); handleApproval(a, "approved");}}><Check className="inline h-3.5 w-3.5 mr-1" />Approve</Btn>
                      <Btn variant="ghost" data-testid="approval-reject" onClick={(e)=>{e.stopPropagation(); handleApproval(a, "rejected");}}><X className="inline h-3.5 w-3.5 mr-1" />Reject</Btn>
                    </div>
                  </div>
                </SwipeApproval>
              ))}
            </div>
          </Section>

          <Section title="Recent Activity">
            <div className="space-y-3">
              {d.activity.slice(0,7).map((a,i) => (
                <div key={a.id} className="flex gap-3 text-[13px]">
                  <div className="mt-1 h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900">{a.title}</div>
                    <div className="text-slate-500 text-[12px] truncate">{a.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
      <AskAIModal open={aiOpen} onClose={()=>setAiOpen(false)} />
    </div>
  );
}
