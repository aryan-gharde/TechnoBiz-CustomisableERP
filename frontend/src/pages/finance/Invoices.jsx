import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import { toast } from "sonner";
import { Plus, X, Mail, Check } from "lucide-react";

export default function Invoices() {
  const [list, setList] = useState([]);
  const [params] = useSearchParams();
  const [open, setOpen] = useState(params.get("new") === "1");
  const [items, setItems] = useState([{ name: "Bulk supply", qty: 10, price: 5000 }]);

  const load = () => api.get("/finance/invoices").then(r=>setList(r.data));
  useEffect(() => { load(); }, []);

  const remind = async (id) => { await api.post(`/finance/invoices/${id}/remind`); toast.success("Reminder sent"); };
  const markPaid = async (id) => { await api.post(`/finance/invoices/${id}/mark-paid`); toast.success("Marked paid"); load(); };

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await api.post("/finance/invoices", { client_name: fd.get("client"), items, tax_rate: 18.0 });
    toast.success("Invoice created and sent");
    setOpen(false); load();
  };

  const inp = "w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
  const sub = items.reduce((s,i)=>s+i.qty*i.price,0);
  const tax = sub*0.18;

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" subtitle={`${list.length} invoices · ${list.filter(i=>i.status==="paid").length} paid`}
        actions={<Btn data-testid="inv-new" onClick={()=>setOpen(true)}><Plus className="inline h-3.5 w-3.5 mr-1" />New Invoice</Btn>} />

      <Section title="All Invoices">
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] tracking-[0.12em] uppercase text-slate-400 border-b border-slate-200">
                <th className="text-left py-2.5 font-semibold">Number</th>
                <th className="text-left py-2.5 font-semibold">Client</th>
                <th className="text-right py-2.5 font-semibold">Total</th>
                <th className="text-left py-2.5 font-semibold pl-4">Status</th>
                <th className="text-right py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0,30).map(inv => (
                <tr key={inv.id} data-testid={`inv-${inv.number}`} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="py-3 font-mono-tab text-slate-700 font-medium">{inv.number}</td>
                  <td className="py-3 text-slate-900">{inv.client_name}</td>
                  <td className="py-3 text-right font-mono-tab font-semibold">{formatINR(inv.total)}</td>
                  <td className="py-3 pl-4"><Pill tone={inv.status==="paid"?"success":inv.status==="overdue"?"danger":inv.status==="draft"?"default":"warning"}>{inv.status}</Pill></td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      {inv.status !== "paid" && <Btn variant="ghost" data-testid={`inv-remind-${inv.number}`} onClick={()=>remind(inv.id)}><Mail className="inline h-3 w-3 mr-1" />Remind</Btn>}
                      {inv.status !== "paid" && <Btn data-testid={`inv-paid-${inv.number}`} onClick={()=>markPaid(inv.id)}><Check className="inline h-3 w-3 mr-1" />Paid</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/40 backdrop-blur-[2px]" onClick={()=>setOpen(false)}>
          <form onSubmit={submit} onClick={e=>e.stopPropagation()} data-testid="inv-form"
            className="bg-white rounded-2xl p-6 w-full max-w-lg border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">New Invoice</h3>
              <button type="button" onClick={()=>setOpen(false)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <input required name="client" placeholder="Client name" className={inp} />
              <div>
                <div className="text-[10px] tracking-[0.12em] uppercase font-semibold text-slate-500 mb-1.5">Line items</div>
                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_70px_90px_auto] gap-2">
                      <input value={it.name} onChange={e=>{const a=[...items];a[idx].name=e.target.value;setItems(a);}} className={inp} placeholder="Item" />
                      <input type="number" value={it.qty} onChange={e=>{const a=[...items];a[idx].qty=+e.target.value;setItems(a);}} className={inp} />
                      <input type="number" value={it.price} onChange={e=>{const a=[...items];a[idx].price=+e.target.value;setItems(a);}} className={inp} />
                      <button type="button" onClick={()=>setItems(items.filter((_,i)=>i!==idx))} className="h-11 w-11 grid place-items-center text-slate-400 hover:text-rose-600"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={()=>setItems([...items, {name:"", qty:1, price:0}])} className="text-xs text-indigo-600 mt-2 font-medium">+ Add item</button>
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-mono-tab">{formatINR(sub)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">GST 18%</span><span className="font-mono-tab">{formatINR(tax)}</span></div>
                <div className="flex justify-between font-semibold"><span>Total</span><span className="font-mono-tab">{formatINR(sub+tax)}</span></div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Btn type="submit" data-testid="inv-submit" className="flex-1">Send Invoice</Btn>
              <Btn type="button" variant="ghost" onClick={()=>setOpen(false)}>Cancel</Btn>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
