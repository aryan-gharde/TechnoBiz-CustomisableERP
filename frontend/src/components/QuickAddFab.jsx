import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Receipt, Wallet, Package, ClipboardList, ArrowLeftRight, X } from "lucide-react";

const opts = [
  { label: "Raise Invoice", icon: Receipt, to: "/finance/invoices?new=1" },
  { label: "Add Expense", icon: Wallet, to: "/finance/expenses?new=1" },
  { label: "Add Product", icon: Package, to: "/inventory/products?new=1" },
  { label: "Create PO", icon: ClipboardList, to: "/inventory/purchase-orders?new=1" },
  { label: "Transfer Stock", icon: ArrowLeftRight, to: "/inventory/transfers?new=1" },
];

export default function QuickAddFab() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("tb:quick-add", h);
    return () => window.removeEventListener("tb:quick-add", h);
  }, []);

  return (
    <>
      <button data-testid="fab" onClick={()=>setOpen(v=>!v)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-2xl btn-primary glass-strong cta-glow grid place-items-center md:hidden">
        {open ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </button>
      {open && (
        <div className="fixed inset-0 z-30 grid place-items-end justify-end p-6 bg-slate-900/30 backdrop-blur-[2px]" onClick={()=>setOpen(false)} data-testid="quickadd-sheet">
          <div className="glass-strong rounded-2xl p-3 w-72 mb-20" onClick={(e)=>e.stopPropagation()}>
            <div className="text-[10px] tracking-[0.18em] uppercase text-slate-400 px-2 py-1.5">Quick Actions</div>
            {opts.map(o => (
              <button key={o.label} onClick={()=>{nav(o.to); setOpen(false);}}
                data-testid={`quickadd-${o.label.toLowerCase().replace(/\s+/g,"-")}`}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition">
                <o.icon className="h-4 w-4 text-indigo-600" />
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
