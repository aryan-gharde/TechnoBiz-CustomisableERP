import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import { Receipt, Wallet, CreditCard, Landmark, Calculator } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import MonthEndChecklist from "@/components/MonthEndChecklist";

export default function FinOverview() {
  const nav = useNavigate();
  const [d, setD] = useState({ invoices: [], expenses: [], banking: [], gst: null, dash: null });
  useEffect(() => {
    Promise.all([
      api.get("/finance/invoices"),
      api.get("/finance/expenses"),
      api.get("/finance/banking"),
      api.get("/finance/gst"),
      api.get("/dashboard"),
    ]).then(([i,e,b,g,d]) => setD({ invoices: i.data, expenses: e.data, banking: b.data, gst: g.data, dash: d.data }));
  }, []);

  const revenue = d.invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+i.total,0);
  const expensesTotal = d.expenses.reduce((s,e)=>s+e.amount,0);
  const receivables = d.invoices.filter(i=>i.status!=="paid"&&i.status!=="draft").reduce((s,i)=>s+i.total,0);
  const cashBalance = d.banking.reduce((s,b)=>s+b.balance,0);

  return (
    <div className="space-y-7">
      <PageHeader title="Finance" subtitle="Cash, receivables, payables and compliance — at a glance."
        actions={<>
          <Btn variant="ghost" onClick={()=>nav("/finance/expenses?new=1")}>+ Expense</Btn>
          <Btn data-testid="new-invoice-btn" onClick={()=>nav("/finance/invoices?new=1")}>New Invoice</Btn>
        </>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {l:"Revenue", v: formatINR(revenue), icon: Receipt, t:"+12.4%"},
          {l:"Expenses", v: formatINR(expensesTotal), icon: Wallet, t:"-3.2%"},
          {l:"Receivables", v: formatINR(receivables), icon: CreditCard, t:"-5.1%"},
          {l:"Cash Balance", v: formatINR(cashBalance), icon: Landmark, t:"+8.6%"},
        ].map((c,i) => (
          <div key={i} className="card-premium rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-9 w-9 rounded-xl grid place-items-center" style={{background: "hsla(var(--m-accent),0.12)", color: "hsl(var(--m-accent))"}}>
                <c.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </div>
              <div className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500">{c.l}</div>
            </div>
            <div className="font-display text-2xl font-semibold text-slate-900 font-mono-tab">{c.v}</div>
            <div className="text-xs text-emerald-600 mt-1">{c.t} this month</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Section title="Cash Flow" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={d.dash?.cash_flow || []}>
                <defs>
                  <linearGradient id="cf-in" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--m-accent))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--m-accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v)=>`₹${(v/1000).toFixed(0)}K`} tickLine={false} axisLine={false} width={50} />
                <Tooltip contentStyle={{borderRadius: 12, border: "1px solid #e2e8f0"}} formatter={(v)=>formatINR(v)} />
                <Area type="monotone" dataKey="inflow" stroke="hsl(var(--m-accent))" strokeWidth={2} fill="url(#cf-in)" />
                <Area type="monotone" dataKey="outflow" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="GST & Compliance" action={<Pill tone="warning">Due in 8 days</Pill>}>
          {d.gst && (
            <div className="space-y-3">
              <Row label="Output Tax" value={formatINR(d.gst.output_tax)} />
              <Row label="Input Credit" value={formatINR(d.gst.input_tax)} />
              <div className="border-t border-slate-100 pt-3">
                <Row label="Net Payable" value={formatINR(d.gst.net_payable)} bold />
              </div>
              <Btn className="w-full mt-3" data-testid="open-gst" onClick={()=>nav("/finance/gst")}>
                <Calculator className="inline h-3.5 w-3.5 mr-1" />Open GST Center
              </Btn>
            </div>
          )}
        </Section>
      </div>
      <MonthEndChecklist />
    </div>
  );
}

const Row = ({ label, value, bold }) => (
  <div className="flex items-center justify-between text-sm">
    <span className={bold ? "font-semibold text-slate-900" : "text-slate-500"}>{label}</span>
    <span className={`font-mono-tab ${bold ? "font-semibold text-slate-900" : "text-slate-700"}`}>{value}</span>
  </div>
);
