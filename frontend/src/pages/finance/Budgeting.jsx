import { useEffect, useState } from "react";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import { Plus, X, Trash2, Target, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Marketing","Logistics","Operations","Salaries","Procurement","Travel","Utilities","Repairs","Rent","Training","R&D","Other"];
const PERIODS = ["Q1 2026","Q2 2026","Q3 2026","Q4 2026","FY 2026","Jan 2026","Feb 2026","Mar 2026","Apr 2026"];

export default function Budgeting() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/finance/budgets").then(r=>setList(r.data));
  useEffect(() => { load(); }, []);

  const remove = async (id, cat) => {
    if (!window.confirm(`Delete budget for "${cat}"?`)) return;
    await api.delete(`/finance/budgets/${id}`);
    toast.success("Budget removed");
    load();
  };

  const totals = list.reduce((acc, b) => {
    acc.budgeted += b.budgeted; acc.actual += b.actual;
    if (b.actual > b.budgeted) acc.over += 1;
    return acc;
  }, { budgeted: 0, actual: 0, over: 0 });
  const overallPct = totals.budgeted ? Math.round((totals.actual / totals.budgeted) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Budgeting" subtitle="Plan, track and govern spending across cost centres."
        actions={
          <Btn data-testid="bdg-new" onClick={()=>setOpen(true)}>
            <Plus className="inline h-3.5 w-3.5 mr-1" />New Budget
          </Btn>
        } />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryTile label="Total Budgeted" value={formatINR(totals.budgeted)} icon={Target} tone="info" />
        <SummaryTile label="Total Spent" value={formatINR(totals.actual)} icon={TrendingUp} tone={overallPct > 100 ? "danger" : overallPct > 80 ? "warning" : "success"} />
        <SummaryTile label="Utilisation" value={`${overallPct}%`} icon={Target} tone={overallPct > 100 ? "danger" : "accent"} />
        <SummaryTile label="Over-budget" value={`${totals.over} of ${list.length}`} icon={AlertCircle} tone={totals.over > 0 ? "warning" : "success"} />
      </div>

      <Section title="Budget Performance" action={<Pill tone="accent">{list.length} active</Pill>}>
        {list.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-12 w-12 mx-auto rounded-2xl grid place-items-center bg-[hsla(var(--m-accent),0.10)] mb-3">
              <Target className="h-6 w-6 text-[hsl(var(--m-accent))]" />
            </div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">No budgets yet</div>
            <div className="text-xs text-slate-400 mt-1">Click <strong>New Budget</strong> to start tracking.</div>
          </div>
        ) : (
          <div className="space-y-5">
            {list.map(b => {
              const pct = b.budgeted ? Math.round((b.actual / b.budgeted) * 100) : 0;
              const over = b.actual > b.budgeted;
              return (
                <div key={b.id} data-testid={`bdg-${b.category}`} className="group">
                  <div className="flex items-center justify-between mb-1.5 gap-3">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{b.category}</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-2">{b.period}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <div className="text-sm font-mono-tab">
                        <span className="text-slate-700 dark:text-slate-200 font-semibold">{formatINR(b.actual)}</span>
                        <span className="text-slate-400"> / {formatINR(b.budgeted)}</span>
                      </div>
                      <Pill tone={over ? "danger" : pct > 80 ? "warning" : "success"}>{pct}%</Pill>
                      <button onClick={()=>remove(b.id, b.category)} data-testid={`bdg-del-${b.category}`}
                        className="opacity-0 group-hover:opacity-100 transition h-7 w-7 grid place-items-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500"
                        aria-label="Delete budget">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800/60 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${Math.min(pct, 100)}%`,
                      background: over ? "#f43f5e" : pct > 80 ? "#f59e0b" : "hsl(var(--m-accent))"
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {open && <CreateBudgetModal onClose={()=>setOpen(false)} saving={saving} setSaving={setSaving}
        onCreate={async (payload) => {
          setSaving(true);
          try {
            await api.post("/finance/budgets", payload);
            toast.success(`Budget for ${payload.category} created`);
            setOpen(false); load();
          } finally { setSaving(false); }
        }} />}
    </div>
  );
}

const SummaryTile = ({ label, value, icon: Icon, tone }) => {
  const tones = {
    info: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
    success: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
    warning: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    danger: "text-rose-600 bg-rose-50 dark:bg-rose-950/30",
    accent: "text-[hsl(var(--m-accent))] bg-[hsla(var(--m-accent),0.10)]",
  };
  return (
    <div className="card-premium rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl grid place-items-center flex-none ${tones[tone] || tones.accent}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] tracking-[0.14em] uppercase text-slate-400 dark:text-slate-500 font-semibold">{label}</div>
          <div className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5 truncate">{value}</div>
        </div>
      </div>
    </div>
  );
};

const CreateBudgetModal = ({ onClose, onCreate, saving }) => {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [customCat, setCustomCat] = useState("");
  const [period, setPeriod] = useState(PERIODS[0]);
  const [budgeted, setBudgeted] = useState("");
  const [actual, setActual] = useState("");
  const inp = "w-full h-11 px-3 rounded-lg border border-slate-200 bg-white dark:bg-slate-900/60 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30";
  const submit = (e) => {
    e.preventDefault();
    const cat = category === "Other" ? customCat.trim() : category;
    if (!cat) return toast.error("Category is required");
    if (!budgeted || +budgeted <= 0) return toast.error("Budget amount must be > 0");
    onCreate({ category: cat, period, budgeted: +budgeted, actual: +actual || 0 });
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}>
      <form onSubmit={submit} onClick={e=>e.stopPropagation()} data-testid="bdg-form"
        className="modal-panel bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-indigo-500/20 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">Create Budget</h3>
          <button type="button" onClick={onClose} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/40">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500 dark:text-slate-400">Category</label>
            <select value={category} onChange={e=>setCategory(e.target.value)} data-testid="bdg-category" className={`${inp} mt-1.5`}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            {category === "Other" && (
              <input value={customCat} onChange={e=>setCustomCat(e.target.value)} placeholder="Enter custom category"
                data-testid="bdg-custom-cat" className={`${inp} mt-2`} />
            )}
          </div>
          <div>
            <label className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500 dark:text-slate-400">Period</label>
            <select value={period} onChange={e=>setPeriod(e.target.value)} data-testid="bdg-period" className={`${inp} mt-1.5`}>
              {PERIODS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500 dark:text-slate-400">Budgeted (₹)</label>
              <input required type="number" min="1" value={budgeted} onChange={e=>setBudgeted(e.target.value)}
                placeholder="500000" data-testid="bdg-amount" className={`${inp} mt-1.5 font-mono-tab`} />
            </div>
            <div>
              <label className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500 dark:text-slate-400">Spent so far</label>
              <input type="number" min="0" value={actual} onChange={e=>setActual(e.target.value)}
                placeholder="0" data-testid="bdg-actual" className={`${inp} mt-1.5 font-mono-tab`} />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Btn type="submit" data-testid="bdg-submit" className="flex-1" disabled={saving}>
            {saving ? "Saving…" : "Create Budget"}
          </Btn>
          <Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn>
        </div>
      </form>
    </div>
  );
};
