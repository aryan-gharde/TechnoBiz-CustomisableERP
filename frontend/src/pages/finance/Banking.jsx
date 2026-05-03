import { useEffect, useState } from "react";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section, Btn } from "@/components/Primitives";
import { toast } from "sonner";
import { Landmark, ArrowRight } from "lucide-react";

export default function Banking() {
  const [list, setList] = useState([]);
  useEffect(() => { api.get("/finance/banking").then(r=>setList(r.data)); }, []);
  const total = list.reduce((s,b)=>s+b.balance,0);
  return (
    <div className="space-y-6">
      <PageHeader title="Banking" subtitle={`Total cash balance — ${formatINR(total)}`} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(b => (
          <div key={b.id} data-testid={`bank-${b.number}`} className="card-premium rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-xs text-slate-500">{b.number}</div>
                <h3 className="font-display text-base font-semibold text-slate-900">{b.name}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl grid place-items-center" style={{background: "hsla(var(--m-accent),0.12)", color: "hsl(var(--m-accent))"}}>
                <Landmark className="h-5 w-5" strokeWidth={1.8} />
              </div>
            </div>
            <div className="font-display text-2xl font-semibold text-slate-900 font-mono-tab">{formatINR(b.balance)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-[0.12em]">{b.currency}</div>
            <div className="flex gap-2 mt-4">
              <Btn variant="soft" onClick={()=>toast.success(`Transfer initiated from ${b.name}`)}><ArrowRight className="inline h-3 w-3 mr-1" />Transfer</Btn>
              <Btn variant="ghost" onClick={()=>toast.info("Reconciliation in progress")}>Reconcile</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
