import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import { toast } from "sonner";
import { Plus, X, Upload } from "lucide-react";

export default function Expenses() {
  const [list, setList] = useState([]);
  const [params] = useSearchParams();
  const [open, setOpen] = useState(params.get("new") === "1");

  const load = () => api.get("/finance/expenses").then(r=>setList(r.data));
  useEffect(()=>{ load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await api.post("/finance/expenses", {
      category: fd.get("cat"), vendor: fd.get("vendor"),
      amount: +fd.get("amount"), project: fd.get("project"), note: fd.get("note")
    });
    toast.success("Expense logged");
    setOpen(false); load();
  };

  const inp = "w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
  const total = list.reduce((s,e)=>s+e.amount,0);

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" subtitle={`${list.length} entries · ${formatINR(total)} this period`}
        actions={<Btn data-testid="exp-new" onClick={()=>setOpen(true)}><Plus className="inline h-3.5 w-3.5 mr-1" />Add Expense</Btn>} />

      <Section title="Recent Expenses">
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] tracking-[0.12em] uppercase text-slate-400 border-b border-slate-200">
                <th className="text-left py-2.5 font-semibold">Category</th>
                <th className="text-left py-2.5 font-semibold">Vendor</th>
                <th className="text-left py-2.5 font-semibold">Project</th>
                <th className="text-right py-2.5 font-semibold">Amount</th>
                <th className="text-right py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0,30).map(e => (
                <tr key={e.id} data-testid={`exp-${e.id.slice(0,6)}`} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="py-3"><Pill tone="accent">{e.category}</Pill></td>
                  <td className="py-3 text-slate-900">{e.vendor}</td>
                  <td className="py-3 text-slate-500 text-xs">{e.project || "—"}</td>
                  <td className="py-3 text-right font-mono-tab font-semibold">{formatINR(e.amount)}</td>
                  <td className="py-3 text-right"><Pill tone="success">{e.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/40 backdrop-blur-[2px]" onClick={()=>setOpen(false)}>
          <form onSubmit={submit} onClick={e=>e.stopPropagation()} data-testid="exp-form"
            className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">Add Expense</h3>
              <button type="button" onClick={()=>setOpen(false)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <select required name="cat" className={inp}>
                {["Salaries","Rent","Utilities","Logistics","Marketing","Repairs","Travel"].map(c => <option key={c}>{c}</option>)}
              </select>
              <input required name="vendor" placeholder="Vendor" className={inp} />
              <input required name="amount" type="number" placeholder="Amount" className={inp} />
              <input name="project" placeholder="Project / Site" className={inp} />
              <input name="note" placeholder="Note (optional)" className={inp} />
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                <Upload className="h-4 w-4" /> Drop bill / receipt here
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Btn type="submit" data-testid="exp-submit" className="flex-1">Save Expense</Btn>
              <Btn type="button" variant="ghost" onClick={()=>setOpen(false)}>Cancel</Btn>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
