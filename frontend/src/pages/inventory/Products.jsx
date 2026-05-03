import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import { Search, Plus, X } from "lucide-react";
import { toast } from "sonner";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWh] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [params] = useSearchParams();
  const [open, setOpen] = useState(params.get("new") === "1");
  const [form, setForm] = useState({ sku: "", name: "", category: "Steel Bars", quantity: 0, reorder_level: 50, unit_price: 100, warehouse_id: "" });

  const load = () => api.get("/inventory/products").then(r=>setProducts(r.data));
  useEffect(() => { load(); api.get("/inventory/warehouses").then(r=>{ setWh(r.data); setForm(f=>({...f, warehouse_id: r.data[0]?.id || ""})); }); }, []);

  const cats = [...new Set(products.map(p=>p.category))];
  const filtered = products.filter(p =>
    (!q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase())) &&
    (!cat || p.category === cat)
  );

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/inventory/products", form);
    toast.success("Product added");
    setOpen(false); load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Products" subtitle={`${products.length} SKUs · across all warehouses`}
        actions={<Btn data-testid="add-product-btn" onClick={()=>setOpen(true)}><Plus className="inline h-3.5 w-3.5 mr-1" />Add Product</Btn>} />

      <Section title="Catalog" action={
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input data-testid="product-search" placeholder="Search SKU, name…" value={q} onChange={e=>setQ(e.target.value)}
              className="h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-sm w-56 outline-none focus:border-indigo-400" />
          </div>
          <select data-testid="product-cat" value={cat} onChange={e=>setCat(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-sm">
            <option value="">All categories</option>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      }>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] tracking-[0.12em] uppercase text-slate-400 border-b border-slate-200">
                <th className="text-left py-2.5 font-semibold">SKU</th>
                <th className="text-left py-2.5 font-semibold">Name</th>
                <th className="text-left py-2.5 font-semibold">Category</th>
                <th className="text-right py-2.5 font-semibold">Qty</th>
                <th className="text-right py-2.5 font-semibold">Reorder</th>
                <th className="text-right py-2.5 font-semibold">Unit Price</th>
                <th className="text-right py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0,40).map(p => {
                const low = p.quantity <= p.reorder_level;
                return (
                  <tr key={p.id} data-testid={`row-${p.sku}`} className="border-b border-slate-100 hover:bg-slate-50/60 cursor-pointer transition" onClick={()=>toast.info(`${p.name} · ${p.sku}`)}>
                    <td className="py-3 font-mono-tab text-slate-500">{p.sku}</td>
                    <td className="py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="py-3"><Pill>{p.category}</Pill></td>
                    <td className="py-3 text-right font-mono-tab">{p.quantity}</td>
                    <td className="py-3 text-right font-mono-tab text-slate-500">{p.reorder_level}</td>
                    <td className="py-3 text-right font-mono-tab text-slate-700">{formatINR(p.unit_price)}</td>
                    <td className="py-3 text-right">{low ? <Pill tone="danger">Low</Pill> : <Pill tone="success">OK</Pill>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/40 backdrop-blur-[2px]" onClick={()=>setOpen(false)}>
          <form onSubmit={submit} onClick={e=>e.stopPropagation()} data-testid="product-form"
            className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-slate-900">Add Product</h3>
              <button type="button" onClick={()=>setOpen(false)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <Field label="SKU"><input required data-testid="form-sku" value={form.sku} onChange={e=>setForm({...form, sku: e.target.value})} className={inp} /></Field>
              <Field label="Name"><input required data-testid="form-name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className={inp} /></Field>
              <Field label="Category"><input value={form.category} onChange={e=>setForm({...form, category: e.target.value})} className={inp} /></Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Qty"><input type="number" value={form.quantity} onChange={e=>setForm({...form, quantity: +e.target.value})} className={inp} /></Field>
                <Field label="Reorder"><input type="number" value={form.reorder_level} onChange={e=>setForm({...form, reorder_level: +e.target.value})} className={inp} /></Field>
                <Field label="Price"><input type="number" value={form.unit_price} onChange={e=>setForm({...form, unit_price: +e.target.value})} className={inp} /></Field>
              </div>
              <Field label="Warehouse">
                <select value={form.warehouse_id} onChange={e=>setForm({...form, warehouse_id: e.target.value})} className={inp}>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="flex gap-2 mt-5">
              <Btn type="submit" data-testid="form-submit" className="flex-1">Save Product</Btn>
              <Btn type="button" variant="ghost" onClick={()=>setOpen(false)}>Cancel</Btn>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const inp = "w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
const Field = ({ label, children }) => (
  <label className="block">
    <div className="text-[10px] tracking-[0.12em] uppercase font-semibold text-slate-500 mb-1">{label}</div>
    {children}
  </label>
);
