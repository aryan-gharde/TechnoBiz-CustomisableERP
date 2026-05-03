import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Section, Btn } from "@/components/Primitives";
import { toast } from "sonner";

export default function StockOut() {
  const [products, setProducts] = useState([]);
  const [wh, setWh] = useState([]);
  const [form, setForm] = useState({ product_id: "", quantity: 5, warehouse_id: "", note: "" });
  useEffect(() => {
    Promise.all([api.get("/inventory/products"), api.get("/inventory/warehouses")]).then(([p,w])=>{
      setProducts(p.data); setWh(w.data);
      setForm(f => ({...f, product_id: p.data[0]?.id || "", warehouse_id: w.data[0]?.id || ""}));
    });
  }, []);
  const submit = async (e) => { e.preventDefault(); await api.post("/inventory/stock-out", form); toast.success("Stock issued"); };
  const inp = "w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
  return (
    <div className="space-y-6">
      <PageHeader title="Stock Out" subtitle="Issue or dispatch stock from warehouse." />
      <Section title="Issue / Dispatch">
        <form onSubmit={submit} className="space-y-3 max-w-xl" data-testid="stockout-form">
          <select value={form.product_id} onChange={e=>setForm({...form, product_id: e.target.value})} className={inp}>
            {products.map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.quantity} onChange={e=>setForm({...form, quantity: +e.target.value})} className={inp} />
            <select value={form.warehouse_id} onChange={e=>setForm({...form, warehouse_id: e.target.value})} className={inp}>
              {wh.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <input value={form.note} onChange={e=>setForm({...form, note: e.target.value})} placeholder="Customer / dispatch ref" className={inp} />
          <Btn type="submit" data-testid="stockout-submit">Dispatch Stock</Btn>
        </form>
      </Section>
    </div>
  );
}
