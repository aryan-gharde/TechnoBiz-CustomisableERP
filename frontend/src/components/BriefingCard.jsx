import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Sparkles, ShieldAlert, TrendingUp, ArrowRight, RefreshCw } from "lucide-react";

export default function BriefingCard() {
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.post("/insights/briefing");
      setD(r.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const ctaNav = (cta) => {
    const c = (cta || "").toLowerCase();
    if (c.includes("receivable")) nav("/finance/receivables");
    else if (c.includes("payable")) nav("/finance/payables");
    else if (c.includes("invoice")) nav("/finance/invoices");
    else if (c.includes("po") || c.includes("purchase")) nav("/inventory/purchase-orders");
    else if (c.includes("stock") || c.includes("alert")) nav("/inventory/alerts");
    else if (c.includes("expense")) nav("/finance/expenses");
    else if (c.includes("gst")) nav("/finance/gst");
    else nav("/finance");
  };

  return (
    <div data-testid="briefing-card" className="glass-strong rounded-2xl p-5 relative overflow-hidden module-glow">
      <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{background: "radial-gradient(circle, hsl(var(--m-accent)), transparent 60%)"}} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <div className="text-[10px] tracking-[0.18em] uppercase font-semibold text-slate-400 dark:text-slate-500">Daily AI Briefing</div>
              <div className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">Three things to know today</div>
            </div>
          </div>
          <button onClick={load} disabled={loading} data-testid="briefing-refresh"
            className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {!d && loading && <div className="text-sm text-slate-400">Generating briefing…</div>}
        {d && (
          <div className="grid md:grid-cols-3 gap-3" data-testid="briefing-grid">
            <BriefingItem tone="rose" icon={ShieldAlert} label="Risk" item={d.risk} />
            <BriefingItem tone="emerald" icon={TrendingUp} label="Opportunity" item={d.opportunity} />
            <BriefingItem tone="indigo" icon={ArrowRight} label="Next action" item={d.action}
              cta={d.action?.cta} onCta={()=>ctaNav(d.action?.cta)} />
          </div>
        )}
      </div>
    </div>
  );
}

const TONES = {
  rose:    { bg: "bg-rose-50/60 dark:bg-rose-900/20",       border: "border-rose-200",    text: "text-rose-600 dark:text-rose-300" },
  emerald: { bg: "bg-emerald-50/60 dark:bg-emerald-900/20", border: "border-emerald-200", text: "text-emerald-600 dark:text-emerald-300" },
  indigo:  { bg: "bg-indigo-50/60 dark:bg-indigo-900/20",   border: "border-indigo-200",  text: "text-indigo-600 dark:text-indigo-300" },
};

const BriefingItem = ({ tone, icon: Icon, label, item, cta, onCta }) => {
  const t = TONES[tone];
  if (!item) return null;
  return (
    <div className={`rounded-xl border ${t.border} ${t.bg} p-3.5`}>
      <div className={`flex items-center gap-1.5 ${t.text} text-[10px] tracking-[0.18em] uppercase font-semibold mb-1.5`}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">{item.title}</div>
      <div className="text-[12.5px] text-slate-600 dark:text-slate-300 leading-relaxed">{item.detail}</div>
      {cta && (
        <button onClick={onCta} data-testid="briefing-cta"
          className="mt-2.5 text-[12px] font-semibold inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300 hover:gap-1.5 transition-all">
          {cta} <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};
