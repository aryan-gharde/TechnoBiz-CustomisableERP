import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Sparkles, TrendingUp } from "lucide-react";

export default function ForecastBadge() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/insights/forecast").then(r => setD(r.data)).catch(()=>{}); }, []);
  if (!d) return null;
  const tone = d.confidence === "high" ? "emerald" : "amber";
  return (
    <div data-testid="forecast-badge"
      className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white/70 dark:bg-slate-900/40 dark:border-indigo-500/20">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center">
        <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
      </div>
      <div>
        <div className="flex items-center gap-1.5 text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500 dark:text-slate-400">
          AI Forecast
          <span className={`inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-medium border ${tone === "emerald" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-amber-200 text-amber-700 bg-amber-50"}`}>{d.confidence}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 font-mono-tab">{d.accuracy}%</span>
          <span className="text-[11px] text-emerald-600 flex items-center gap-0.5"><TrendingUp className="h-3 w-3" /> {d.trend}</span>
        </div>
      </div>
    </div>
  );
}
