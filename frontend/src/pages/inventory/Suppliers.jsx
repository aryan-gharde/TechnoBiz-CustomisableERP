import { useEffect, useState } from "react";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import { Truck, Star } from "lucide-react";
import { toast } from "sonner";

export default function Suppliers() {
  const [list, setList] = useState([]);
  useEffect(() => { api.get("/inventory/suppliers").then(r=>setList(r.data)); }, []);
  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers" subtitle="Vendor health, ratings and outstanding balances." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(s => (
          <div key={s.id} data-testid={`sup-${s.name}`} className="card-premium rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900">{s.name}</h3>
                <Pill>{s.category}</Pill>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 grid place-items-center">
                <Truck className="h-5 w-5 text-indigo-600" strokeWidth={1.8} />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 mb-3">
              {Array.from({length: 5}).map((_,i) => (
                <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(s.rating) ? "text-amber-500 fill-amber-500" : "text-slate-200"}`} />
              ))}
              <span className="text-xs text-slate-500 ml-1 font-mono-tab">{s.rating}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <div>
                <div className="text-[10px] tracking-[0.12em] uppercase text-slate-400">Outstanding</div>
                <div className="font-mono-tab font-semibold text-slate-900">{formatINR(s.outstanding)}</div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.12em] uppercase text-slate-400">Lead Time</div>
                <div className="font-mono-tab font-semibold text-slate-900">{s.lead_time_days} days</div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Btn variant="soft" onClick={()=>toast.success(`PO created for ${s.name}`)} data-testid={`sup-po-${s.name}`}>Create PO</Btn>
              <Btn variant="ghost" onClick={()=>toast.info(`${s.name} contacted`)}>Contact</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
