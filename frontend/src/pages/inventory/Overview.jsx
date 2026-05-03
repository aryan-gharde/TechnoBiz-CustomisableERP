import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import { Package, Warehouse, AlertTriangle, ClipboardList, Boxes } from "lucide-react";

export default function InvOverview() {
  const nav = useNavigate();
  const [data, setData] = useState({ products: [], wh: [], pos: [], alerts: { low_stock: [], dead_stock: [] } });

  useEffect(() => {
    Promise.all([
      api.get("/inventory/products"),
      api.get("/inventory/warehouses"),
      api.get("/inventory/purchase-orders"),
      api.get("/inventory/alerts"),
    ]).then(([p, w, po, al]) => setData({ products: p.data, wh: w.data, pos: po.data, alerts: al.data }));
  }, []);

  const totalSku = data.products.length;
  const stockValue = data.products.reduce((s,p)=>s + p.quantity*p.unit_price, 0);

  return (
    <div className="space-y-7">
      <PageHeader title="Inventory" subtitle="Real-time stock health, warehouse occupancy & supplier signals."
        actions={<>
          <Btn variant="ghost" onClick={()=>nav("/inventory/products?new=1")} data-testid="add-product">+ Add Product</Btn>
          <Btn data-testid="create-po-btn" onClick={()=>nav("/inventory/purchase-orders?new=1")}>Create PO</Btn>
        </>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {l:"Total SKUs", v: totalSku, icon: Package},
          {l:"Stock Value", v: formatINR(stockValue), icon: Boxes},
          {l:"Warehouses", v: data.wh.length, icon: Warehouse},
          {l:"Low Stock", v: data.alerts.low_stock.length, icon: AlertTriangle},
        ].map((c,i) => (
          <div key={i} className="card-premium rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-9 w-9 rounded-xl grid place-items-center" style={{background: "hsla(var(--m-accent),0.12)", color: "hsl(var(--m-accent))"}}>
                <c.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </div>
              <div className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500">{c.l}</div>
            </div>
            <div className="font-display text-3xl font-semibold text-slate-900 font-mono-tab">{c.v}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Warehouse Occupancy"
          action={<Btn variant="ghost" onClick={()=>nav("/inventory/warehouses")}>View all</Btn>}>
          <div className="space-y-4">
            {data.wh.map(w => {
              const pct = Math.round((w.occupied / w.capacity) * 100);
              return (
                <div key={w.id} data-testid={`wh-${w.name}`}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-800">{w.name}</span>
                    <span className="text-slate-500 font-mono-tab">{pct}% · {w.items} items</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{width: `${pct}%`, background: pct > 85 ? "#f43f5e" : "hsl(var(--m-accent))"}} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Recent Purchase Orders"
          action={<Btn variant="ghost" onClick={()=>nav("/inventory/purchase-orders")}>View all</Btn>}>
          <div className="space-y-2.5">
            {data.pos.slice(0,6).map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer" onClick={()=>nav("/inventory/purchase-orders")}>
                <div>
                  <div className="text-sm font-medium text-slate-900">{p.po_number}</div>
                  <div className="text-[11px] text-slate-500">{p.supplier_name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono-tab font-semibold text-slate-900">{formatINR(p.total)}</div>
                  <Pill tone={p.status === "approved" ? "success" : p.status === "draft" ? "default" : "warning"}>{p.status}</Pill>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Low Stock Alert" action={<Pill tone="danger">{data.alerts.low_stock.length} items</Pill>}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.alerts.low_stock.slice(0,9).map(p => (
            <div key={p.id} className="p-3 rounded-xl border border-rose-200 bg-rose-50/40">
              <div className="text-sm font-medium text-slate-900">{p.name}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{p.sku} · {p.category}</div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-rose-700 font-mono-tab">{p.quantity} / {p.reorder_level}</span>
                <Btn variant="primary" onClick={()=>nav("/inventory/purchase-orders?new=1")}>Create PO</Btn>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
