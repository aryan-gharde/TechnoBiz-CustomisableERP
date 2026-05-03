import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import { ArrowLeft, TrendingUp, Wallet, Boxes, AlertTriangle, CreditCard, Receipt } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

const META = {
  revenue:       { title: "Revenue Detail",        subtitle: "Paid invoices broken down by client.",          icon: Receipt,        accent: "blue",    module: "finance" },
  expenses:      { title: "Expenses Detail",       subtitle: "Cost breakdown by category and vendor.",         icon: Wallet,         accent: "rose",    module: "finance" },
  profit:        { title: "Net Profit Detail",     subtitle: "Margin, revenue, and expense composition.",      icon: TrendingUp,     accent: "indigo",  module: "finance" },
  "stock-value": { title: "Stock Value Detail",    subtitle: "Inventory value distribution by category.",     icon: Boxes,          accent: "emerald", module: "inventory" },
  "low-stock":   { title: "Low Stock Items",       subtitle: "Items at or below reorder level — act now.",    icon: AlertTriangle,  accent: "rose",    module: "inventory" },
  receivables:   { title: "Receivables Detail",    subtitle: "Outstanding invoices grouped by client.",       icon: CreditCard,     accent: "blue",    module: "finance" },
};

const PALETTE = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#f43f5e","#3b82f6","#a855f7"];

export default function Drilldown() {
  const { kpi } = useParams();
  const nav = useNavigate();
  const meta = META[kpi] || META.revenue;
  const Icon = meta.icon;
  const [data, setData] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-module", meta.module);
    api.get(`/drilldown/${kpi}`).then(r => setData(r.data));
  }, [kpi, meta.module]);

  if (!data) return <div className="text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="space-y-7" data-testid={`drilldown-${kpi}`}>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/dashboard" className="hover:text-indigo-600 transition flex items-center gap-1" data-testid="drilldown-back">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>
      </div>

      <PageHeader title={meta.title} subtitle={meta.subtitle}
        actions={<>
          <Btn variant="ghost" data-testid="drilldown-export">Export CSV</Btn>
          <Pill tone="accent">{data.count ?? 0} records</Pill>
        </>} />

      {/* Top summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total" value={formatINR(data.total ?? 0)} icon={Icon} />
        {kpi === "profit" && (
          <>
            <SummaryCard label="Revenue" value={formatINR(data.revenue)} />
            <SummaryCard label="Expenses" value={formatINR(data.expenses)} />
            <SummaryCard label="Margin %" value={`${data.margin}%`} isText />
          </>
        )}
        {kpi !== "profit" && data.count !== undefined && (
          <SummaryCard label="Records" value={data.count} isText />
        )}
        {kpi !== "profit" && data.by_group && (
          <SummaryCard label="Top group" value={data.by_group[0]?.name || "—"} isText />
        )}
        {kpi !== "profit" && data.by_group && (
          <SummaryCard label="Top contribution" value={formatINR(data.by_group[0]?.value || 0)} />
        )}
      </div>

      {/* Distribution chart */}
      {data.by_group && data.by_group.length > 0 && (
        <Section title={`Distribution by ${kpi === "expenses" ? "Category" : kpi === "stock-value" ? "Category" : "Client"}`}>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data.by_group} layout="vertical" margin={{left: 20, right: 20}}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v)=>`₹${(v/100000).toFixed(0)}L`} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={140} />
                <Tooltip contentStyle={{borderRadius: 12, border: "1px solid #e2e8f0"}} formatter={(v)=>formatINR(v)} />
                <Bar dataKey="value" radius={[0,8,8,0]}>
                  {data.by_group.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* Items table */}
      {data.items && data.items.length > 0 && (
        <Section title="Records">
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] tracking-[0.12em] uppercase text-slate-400 border-b border-slate-200">
                  {tableCols(kpi).map(c => <th key={c.k} className={`py-2.5 font-semibold ${c.right ? "text-right" : "text-left"}`}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.items.slice(0, 50).map((item, i) => (
                  <tr key={item.id || i} data-testid={`drill-row-${i}`}
                    onClick={()=>handleRowClick(kpi, item, nav)}
                    className="border-b border-slate-100 hover:bg-slate-50/60 cursor-pointer">
                    {tableCols(kpi).map(c => (
                      <td key={c.k} className={`py-3 ${c.right ? "text-right font-mono-tab" : ""}`}>
                        {c.render ? c.render(item) : item[c.k]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

const SummaryCard = ({ label, value, icon: Icon, isText }) => (
  <div className="card-premium rounded-2xl p-5">
    <div className="flex items-center gap-2.5 mb-3">
      {Icon && <div className="h-9 w-9 rounded-xl grid place-items-center" style={{background: "hsla(var(--m-accent),0.12)", color: "hsl(var(--m-accent))"}}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </div>}
      <div className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500">{label}</div>
    </div>
    <div className={`font-display ${isText ? "text-lg" : "text-2xl"} font-semibold text-slate-900 ${isText ? "" : "font-mono-tab"} truncate`}>{value}</div>
  </div>
);

const tableCols = (kpi) => {
  if (kpi === "revenue" || kpi === "receivables") return [
    { k: "number", label: "Invoice" },
    { k: "client_name", label: "Client" },
    { k: "status", label: "Status", render: (i) => <Pill tone={i.status==="paid"?"success":i.status==="overdue"?"danger":"warning"}>{i.status}</Pill> },
    { k: "due_date", label: "Due", render: (i) => i.due_date ? new Date(i.due_date).toLocaleDateString() : "—" },
    { k: "total", label: "Amount", right: true, render: (i) => formatINR(i.total) },
  ];
  if (kpi === "expenses") return [
    { k: "category", label: "Category", render: (e) => <Pill tone="accent">{e.category}</Pill> },
    { k: "vendor", label: "Vendor" },
    { k: "project", label: "Project" },
    { k: "created_at", label: "Date", render: (e) => new Date(e.created_at).toLocaleDateString() },
    { k: "amount", label: "Amount", right: true, render: (e) => formatINR(e.amount) },
  ];
  if (kpi === "stock-value" || kpi === "low-stock") return [
    { k: "sku", label: "SKU" },
    { k: "name", label: "Product" },
    { k: "category", label: "Category", render: (p) => <Pill>{p.category}</Pill> },
    { k: "quantity", label: "Qty", right: true },
    { k: "value", label: "Value", right: true, render: (p) => formatINR(p.quantity * p.unit_price) },
  ];
  return [];
};

const handleRowClick = (kpi, item, nav) => {
  if (kpi === "revenue" || kpi === "receivables") nav("/finance/invoices");
  else if (kpi === "expenses") nav("/finance/expenses");
  else if (kpi === "stock-value" || kpi === "low-stock") nav("/inventory/products");
};
