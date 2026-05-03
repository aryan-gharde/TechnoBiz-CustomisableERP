import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

export default function Transfers() {
  const [products, setProducts] = useState([]);
  const [wh, setWh] = useState([]);
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ product_id: "", quantity: 10, from_warehouse_id: "", to_warehouse_id: "" });

  const load = () => api.get("/inventory/transfers").then(r=>setList(r.data));
  useEffect(() => {
    Promise.all([api.get("/inventory/products"), api.get("/inventory/warehouses")]).then(([p,w])=>{
      setProducts(p.data); setWh(w.data);
      setForm(f => ({...f, product_id: p.data[0]?.id || "", from_warehouse_id: w.data[0]?.id || "", to_warehouse_id: w.data[1]?.id || ""}));
    });
    load();
  }, []);

  const submit = async (e) => { e.preventDefault(); await api.post("/inventory/transfer", form); toast.success("Transfer recorded"); load(); };
  const inp = "w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
  const whName = (id) => wh.find(w=>w.id===id)?.name || "—";
  const prodName = (id) => products.find(p=>p.id===id)?.name || "—";

  return (
    <div className="space-y-6">
      <PageHeader title="Transfers" subtitle="Move stock between warehouses with a click." />
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="New Transfer">
          <form onSubmit={submit} className="space-y-3" data-testid="transfer-form">
            <select value={form.product_id} onChange={e=>setForm({...form, product_id: e.target.value})} className={inp}>
              {products.map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}
            </select>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <select value={form.from_warehouse_id} onChange={e=>setForm({...form, from_warehouse_id: e.target.value})} className={inp}>
                {wh.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <ArrowRight className="h-4 w-4 text-indigo-500" />
              <select value={form.to_warehouse_id} onChange={e=>setForm({...form, to_warehouse_id: e.target.value})} className={inp}>
                {wh.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <input type="number" value={form.quantity} onChange={e=>setForm({...form, quantity: +e.target.value})} className={inp} placeholder="Quantity" />
            <Btn type="submit" data-testid="transfer-submit" className="w-full">Transfer Stock</Btn>
          </form>
        </Section>
        <Section title="Recent Transfers">
          <div className="space-y-2.5">
            {list.length === 0 && <div className="text-sm text-slate-400 text-center py-8">No transfers yet</div>}
            {list.slice(0,10).map(t => (
              <div key={t.id} className="p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-900">{prodName(t.product_id)}</span>
                  <Pill tone="success">{t.status}</Pill>
                </div>
                <div className="text-[12px] text-slate-500">
                  {whName(t.from_warehouse_id)} → {whName(t.to_warehouse_id)} · <span className="font-mono-tab">{t.quantity} units</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
