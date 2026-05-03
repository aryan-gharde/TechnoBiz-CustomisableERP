import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function AlertCard({ alert, onAction }) {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState("");
  const [showInsight, setShowInsight] = useState(false);

  const sevColors = {
    danger: "border-rose-200 bg-rose-50/40",
    warning: "border-amber-200 bg-amber-50/40",
    info: "border-blue-200 bg-blue-50/40",
  };
  const dotColors = {
    danger: "bg-rose-500",
    warning: "bg-amber-500",
    info: "bg-blue-500",
  };

  const askAI = async () => {
    setLoading(true); setShowInsight(true);
    try {
      const r = await api.post("/insights/generate", { topic: alert.type, context: alert.message });
      setInsight(r.data.insight);
    } catch (e) {
      setInsight("• Review trends weekly\n• Set thresholds\n• Track variance vs forecast");
    } finally { setLoading(false); }
  };

  return (
    <div data-testid={`alert-${alert.type}`} className={`rounded-2xl border ${sevColors[alert.severity] || sevColors.info} p-4 transition hover:shadow-md`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2 w-2 rounded-full ${dotColors[alert.severity] || dotColors.info}`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900">{alert.title}</div>
          <div className="text-[13px] text-slate-600 mt-1 leading-relaxed">{alert.message}</div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button onClick={() => { onAction?.(alert); toast.success(`${alert.action} initiated`); }}
              data-testid={`alert-action-${alert.type}`}
              className="inline-flex items-center justify-center h-8 px-3 rounded-lg btn-primary text-xs font-medium whitespace-nowrap leading-none">{alert.action}</button>
            <button onClick={askAI} data-testid={`alert-ai-${alert.type}`}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium leading-none">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Ask AI
            </button>
          </div>
          {showInsight && (
            <div className="mt-3 p-3 rounded-xl border border-indigo-100 dark:border-indigo-500/25 bg-white/80 dark:bg-slate-900/60 text-[12.5px] text-slate-700 dark:text-slate-200 whitespace-pre-line min-h-[68px]">
              {loading ? <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating insight…</span> : (insight || "No insight available right now.")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
