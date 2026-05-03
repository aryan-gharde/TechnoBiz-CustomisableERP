import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import { toast } from "sonner";
import { Plus, X, Check } from "lucide-react";

const cols = [
  { id: "draft", label: "Draft", tone: "default" },
  { id: "pending", label: "Pending Approval", tone: "warning" },
  { id: "approved", label: "Approved", tone: "success" },
  { id: "received", label: "Received", tone: "info" },
];

export default function PurchaseOrders() {
  const [pos, setPos] = useState([]);
  const [suppliers, setSup] = useState([]);
  const [params] = useSearchParams();
  const [open, setOpen] = useState(params.get("new") === "1");

  const load = () => api.get("/inventory/purchase-orders").then(r=>setPos(r.data));
  useEffect(() => { load(); api.get("/inventory/suppliers").then(r=>setSup(r.data)); }, []);

  const approve = async (id) => { await api.post(`/inventory/purchase-orders/${id}/approve`); toast.success("PO approved"); load(); };

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const sid = fd.get("supplier");
    const items = [{ name: fd.get("item"), qty: +fd.get("qty"), price: +fd.get("price") }];
    await api.post("/inventory/purchase-orders", { supplier_id: sid, items, notes: fd.get("note") });
    toast.success("Draft PO created");
    setOpen(false); load();
  };

  const inp = "w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Orders" subtitle="Kanban view across draft → approved → received."
        actions={<Btn data-testid="po-new" onClick={()=>setOpen(true)}><Plus className="inline h-3.5 w-3.5 mr-1" />New PO</Btn>} />

      <div className="grid lg:grid-cols-4 gap-4">
        {cols.map(c => {
          const items = pos.filter(p => p.status === c.id);
          return (
            <div key={c.id} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-3 min-h-[300px]">
              <div className="flex items-center justify-between px-1.5 mb-3">
                <div className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500">{c.label}</div>
                <Pill tone={c.tone}>{items.length}</Pill>
              </div>
              <div className="space-y-2">
                {items.map(p => (
                  <div key={p.id} data-testid={`po-${p.po_number}`} className="bg-white rounded-xl p-3 border border-slate-200 hover:shadow-md transition cursor-pointer">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-mono-tab font-semibold text-slate-900">{p.po_number}</span>
                      <span className="text-xs font-mono-tab text-slate-700">{formatINR(p.total)}</span>
                    </div>
                    <div className="text-[12px] text-slate-500 truncate">{p.supplier_name || "—"}</div>
                    {p.status === "pending" && (
                      <Btn className="w-full mt-2" data-testid={`po-approve-${p.po_number}`} onClick={(e)=>{e.stopPropagation(); approve(p.id);}}>
                        <Check className="inline h-3.5 w-3.5 mr-1" />Approve
                      </Btn>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/40 backdrop-blur-[2px]" onClick={()=>setOpen(false)}>
          <form onSubmit={submit} onClick={e=>e.stopPropagation()} data-testid="po-form"
            className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">New Purchase Order</h3>
              <button type="button" onClick={()=>setOpen(false)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <select required name="supplier" className={inp}>
                <option value="">Select supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input required name="item" placeholder="Item / SKU description" className={inp} />
              <div className="grid grid-cols-2 gap-2">
                <input required name="qty" type="number" defaultValue="50" placeholder="Qty" className={inp} />
                <input required name="price" type="number" defaultValue="500" placeholder="Unit price" className={inp} />
              </div>
              <input name="note" placeholder="Notes (optional)" className={inp} />
            </div>
            <div className="flex gap-2 mt-5">
              <Btn type="submit" data-testid="po-submit" className="flex-1">Create Draft PO</Btn>
              <Btn type="button" variant="ghost" onClick={()=>setOpen(false)}>Cancel</Btn>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
