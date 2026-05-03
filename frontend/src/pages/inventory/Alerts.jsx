import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import { toast } from "sonner";
import { Sparkles, Loader2, TrendingDown, Clock } from "lucide-react";

export default function InvAlerts() {
  const nav = useNavigate();
  const [d, setD] = useState({ low_stock: [], dead_stock: [] });
  const [predictions, setPredictions] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = () => Promise.all([
    api.get("/inventory/alerts").then(r => setD(r.data)),
    api.get("/insights/predict-stockout").then(r => setPredictions(r.data.items)),
  ]);
  useEffect(() => { load(); }, []);

  const autoPO = async () => {
    setBusy(true);
    try {
      const r = await api.post("/inventory/auto-po");
      toast.success(`AI generated ${r.data.count} draft PO${r.data.count !== 1 ? "s" : ""} from ${r.data.low_stock_count} low-stock SKUs`);
      setTimeout(() => nav("/inventory/purchase-orders"), 600);
    } catch {
      toast.error("Auto-PO generation failed");
    } finally { setBusy(false); }
  };

  const sevTone = (s) => s === "critical" ? "danger" : s === "high" ? "warning" : "info";
  const sevColor = (s) => s === "critical" ? "border-rose-200 bg-rose-50/40 dark:bg-rose-900/10" : s === "high" ? "border-amber-200 bg-amber-50/40 dark:bg-amber-900/10" : "border-slate-200 bg-slate-50/40";

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory Alerts" subtitle="Smart stock signals — act before they hurt the business."
        actions={
          <Btn data-testid="auto-po-btn" onClick={autoPO} disabled={busy || d.low_stock.length === 0}>
            {busy ? <><Loader2 className="inline h-3.5 w-3.5 mr-1 animate-spin" />Generating…</> : <><Sparkles className="inline h-3.5 w-3.5 mr-1" />AI Auto-Generate POs</>}
          </Btn>
        } />

      <Section title="AI Stockout Forecast" action={
        <div className="flex items-center gap-2">
          <Pill tone="accent"><Sparkles className="inline h-3 w-3 mr-1" />days-to-zero</Pill>
          <Pill tone="warning">{predictions.length} at risk</Pill>
        </div>
      }>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {predictions.slice(0, 9).map(p => (
            <div key={p.id} data-testid={`pred-${p.sku}`} className={`rounded-xl border ${sevColor(p.severity)} p-3`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{p.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tab">{p.sku}</div>
                </div>
                <Pill tone={sevTone(p.severity)}><Clock className="inline h-2.5 w-2.5 mr-0.5" />{p.days_to_zero}d</Pill>
              </div>
              <div className="flex items-center justify-between mt-2 text-[12px]">
                <span className="text-slate-500 dark:text-slate-400 font-mono-tab"><TrendingDown className="inline h-3 w-3 mr-0.5" />{p.velocity_per_day}/day · {p.quantity} left</span>
                <Btn onClick={()=>nav("/inventory/purchase-orders?new=1")}>Reorder</Btn>
              </div>
            </div>
          ))}
          {predictions.length === 0 && <div className="text-center text-slate-400 col-span-full py-6 text-sm">No imminent stockouts forecast.</div>}
        </div>
      </Section>

      <Section title="Low Stock"
        action={<div className="flex items-center gap-2">
          <Pill tone="danger">{d.low_stock.length} items</Pill>
          {d.low_stock.length > 0 && <span className="text-[11px] text-slate-400">Worth {formatINR(d.low_stock.reduce((s,p)=>s+p.quantity*p.unit_price,0))}</span>}
        </div>}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {d.low_stock.map(p => (
            <div key={p.id} className="rounded-xl border border-rose-200 bg-rose-50/40 p-3" data-testid={`low-${p.sku}`}>
              <div className="text-sm font-medium">{p.name}</div>
              <div className="text-[11px] text-slate-500">{p.sku}</div>
              <div className="flex justify-between mt-2">
                <span className="text-xs font-mono-tab text-rose-700">{p.quantity}/{p.reorder_level}</span>
                <Btn onClick={()=>nav("/inventory/purchase-orders?new=1")}>Create PO</Btn>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Dead / Slow-moving Stock" action={<Pill tone="warning">{d.dead_stock.length}</Pill>}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {d.dead_stock.map(p => (
            <div key={p.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-3" data-testid={`dead-${p.sku}`}>
              <div className="text-sm font-medium">{p.name}</div>
              <div className="text-[11px] text-slate-500">{p.sku} · {p.quantity} units · {formatINR(p.quantity*p.unit_price)}</div>
              <Btn className="mt-2" variant="soft" onClick={()=>toast.success(`Clearance campaign queued for ${p.sku}`)}>Run Clearance</Btn>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
