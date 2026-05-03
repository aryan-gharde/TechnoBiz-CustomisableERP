import { useEffect, useState } from "react";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section } from "@/components/Primitives";
import { Warehouse, MapPin } from "lucide-react";

export default function Warehouses() {
  const [list, setList] = useState([]);
  useEffect(() => { api.get("/inventory/warehouses").then(r=>setList(r.data)); }, []);
  return (
    <div className="space-y-6">
      <PageHeader title="Warehouses" subtitle="Capacity, occupancy and movement health across all sites." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.map(w => {
          const pct = Math.round((w.occupied/w.capacity)*100);
          const tone = pct > 85 ? "#f43f5e" : pct > 60 ? "#f59e0b" : "hsl(var(--m-accent))";
          return (
            <div key={w.id} data-testid={`wh-card-${w.name}`} className="card-premium rounded-2xl p-5 hover:-translate-y-1 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">{w.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                    <MapPin className="h-3 w-3" /> {w.city}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl grid place-items-center" style={{background: "hsla(var(--m-accent),0.12)", color: "hsl(var(--m-accent))"}}>
                  <Warehouse className="h-5 w-5" strokeWidth={1.8} />
                </div>
              </div>
              <div className="text-sm text-slate-500 mb-1.5 flex justify-between">
                <span>Occupancy</span>
                <span className="font-mono-tab font-semibold text-slate-700">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{width: `${pct}%`, background: tone}} />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-100">
                <div>
                  <div className="text-[10px] tracking-[0.12em] uppercase text-slate-400">Items</div>
                  <div className="font-display text-lg font-semibold text-slate-900 font-mono-tab">{w.items}</div>
                </div>
                <div>
                  <div className="text-[10px] tracking-[0.12em] uppercase text-slate-400">Capacity</div>
                  <div className="font-display text-lg font-semibold text-slate-900 font-mono-tab">{w.capacity.toLocaleString()}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
