import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { Search, Package, Receipt, ClipboardList, Wallet, Truck, FileText, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

const TYPE_ICON = { product: Package, invoice: Receipt, po: ClipboardList, supplier: Truck, expense: Wallet };
const QUICK_ACTIONS = [
  { group: "Quick", icon: Receipt, label: "Create Invoice", to: "/finance/invoices?new=1" },
  { group: "Quick", icon: Wallet, label: "Add Expense", to: "/finance/expenses?new=1" },
  { group: "Quick", icon: ClipboardList, label: "Create Purchase Order", to: "/inventory/purchase-orders?new=1" },
  { group: "Quick", icon: Package, label: "Add Product", to: "/inventory/products?new=1" },
  { group: "Quick", icon: FileText, label: "Open Reports", to: "/reports" },
];

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!open) { setQ(""); setResults([]); } }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!q.trim()) { setResults([]); return; }
    let aborted = false;
    setLoading(true);
    const t = setTimeout(() => {
      api.get(`/search?q=${encodeURIComponent(q)}`).then(r => { if (!aborted) setResults(r.data.results); })
        .finally(() => !aborted && setLoading(false));
    }, 200);
    return () => { aborted = true; clearTimeout(t); };
  }, [q, open]);

  if (!open) return null;
  const grouped = results.reduce((acc, r) => { (acc[r.type] = acc[r.type] || []).push(r); return acc; }, {});

  return (
    <div className="fixed inset-0 z-50 grid place-items-start pt-[12vh] px-4 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} data-testid="cmd-palette">
      <div className="w-full max-w-2xl glass-strong rounded-2xl overflow-hidden" onClick={(e)=>e.stopPropagation()}>
        <Command className="bg-transparent" shouldFilter={false}>
          <div className="flex items-center gap-3 px-4 h-14 border-b border-slate-200/60 dark:border-indigo-500/15">
            {loading ? <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" /> : <Search className="h-4 w-4 text-slate-400" />}
            <Command.Input value={q} onValueChange={setQ} placeholder="Search products, invoices, POs, suppliers, expenses…"
              className="bg-transparent flex-1 outline-none text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400" data-testid="cmd-input" />
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">ESC</kbd>
          </div>
          <Command.List className="max-h-[460px] overflow-y-auto p-2">
            {q.trim() === "" && (
              <Command.Group heading="Quick actions" className="text-[10px] tracking-[0.18em] uppercase text-slate-400 dark:text-slate-500 px-2 py-1">
                {QUICK_ACTIONS.map((a, i) => (
                  <Command.Item key={i} value={a.label} onSelect={() => { navigate(a.to); onClose(); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-slate-700 dark:text-slate-200 data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-900/30 data-[selected=true]:text-indigo-700">
                    <a.icon className="h-4 w-4 text-slate-500" /> {a.label}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {q.trim() !== "" && !loading && results.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">No results for "{q}"</div>
            )}
            {Object.entries(grouped).map(([type, items]) => {
              const Icon = TYPE_ICON[type] || Search;
              return (
                <Command.Group key={type} heading={`${type}s · ${items.length}`}
                  className="text-[10px] tracking-[0.18em] uppercase text-slate-400 dark:text-slate-500 px-2 py-1">
                  {items.map((r, i) => (
                    <Command.Item key={i} value={`${type}-${i}-${r.title}`}
                      onSelect={() => { navigate(r.href); onClose(); }}
                      data-testid={`search-result-${type}-${i}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-slate-700 dark:text-slate-200 data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-900/30">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 grid place-items-center flex-none">
                        <Icon className="h-4 w-4 text-indigo-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{r.title}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{r.sub}</div>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
