import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Section, Btn } from "@/components/Primitives";
import { toast } from "sonner";
import { ScanLine } from "lucide-react";

function MoveForm({ kind }) {
  const [products, setProducts] = useState([]);
  const [wh, setWh] = useState([]);
  const [form, setForm] = useState({ product_id: "", quantity: 10, warehouse_id: "", note: "" });
  useEffect(() => {
    Promise.all([api.get("/inventory/products"), api.get("/inventory/warehouses")]).then(([p,w])=>{
      setProducts(p.data); setWh(w.data);
      setForm(f => ({...f, product_id: p.data[0]?.id || "", warehouse_id: w.data[0]?.id || ""}));
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post(`/inventory/${kind === "in" ? "stock-in" : "stock-out"}`, form);
    toast.success(`Stock ${kind === "in" ? "received" : "issued"}`);
  };

  const inp = "w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Section title={kind === "in" ? "Receive Material" : "Issue / Dispatch"}>
        <form onSubmit={submit} className="space-y-3" data-testid={`stock-${kind}-form`}>
          <div>
            <label className="text-[10px] tracking-[0.12em] uppercase font-semibold text-slate-500">Product</label>
            <select required value={form.product_id} onChange={e=>setForm({...form, product_id: e.target.value})} className={inp}>
              {products.map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] tracking-[0.12em] uppercase font-semibold text-slate-500">Quantity</label>
              <input type="number" data-testid={`stock-${kind}-qty`} required value={form.quantity} onChange={e=>setForm({...form, quantity: +e.target.value})} className={inp} />
            </div>
            <div>
              <label className="text-[10px] tracking-[0.12em] uppercase font-semibold text-slate-500">Warehouse</label>
              <select value={form.warehouse_id} onChange={e=>setForm({...form, warehouse_id: e.target.value})} className={inp}>
                {wh.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] tracking-[0.12em] uppercase font-semibold text-slate-500">Note</label>
            <input value={form.note} onChange={e=>setForm({...form, note: e.target.value})} className={inp} placeholder="Reference / supplier / dispatch ID" />
          </div>
          <Btn type="submit" data-testid={`stock-${kind}-submit`} className="w-full">{kind === "in" ? "Receive Stock" : "Dispatch Stock"}</Btn>
        </form>
      </Section>
      <Section title="Barcode Scanner">
        <div className="border-2 border-dashed border-slate-200 rounded-xl py-12 text-center text-slate-400">
          <ScanLine className="h-10 w-10 mx-auto mb-3 text-indigo-400" />
          <div className="text-sm font-medium text-slate-700">Scan barcode to auto-fill</div>
          <div className="text-xs mt-1">Camera-based scanning available on mobile</div>
        </div>
      </Section>
    </div>
  );
}

export default function StockIn() {
  return (
    <div className="space-y-6">
      <PageHeader title="Stock In" subtitle="Record inbound stock from suppliers." />
      <MoveForm kind="in" />
    </div>
  );
}
