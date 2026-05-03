import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { X, Bell } from "lucide-react";

export default function NotificationDrawer({ open, onClose }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (open) api.get("/notifications").then(r=>setItems(r.data)).catch(()=>{});
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" data-testid="notif-drawer">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="absolute top-0 right-0 h-full w-[380px] glass-strong border-l border-white/60 p-5 overflow-y-auto animate-in slide-in-from-right">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-indigo-600" />
            <h3 className="font-display text-lg font-semibold text-slate-900">Notifications</h3>
          </div>
          <button data-testid="notif-close" onClick={onClose} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2">
          {items.map(n => (
            <div key={n.id} data-testid={`notif-${n.type}`}
              className={`p-3 rounded-xl border ${n.read ? "border-slate-200 bg-white/70" : "border-indigo-200 bg-indigo-50/50"}`}>
              <div className="text-sm font-medium text-slate-900">{n.title}</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 mt-1">{n.type}</div>
            </div>
          ))}
          {items.length === 0 && <div className="text-sm text-slate-400 text-center py-12">All caught up</div>}
        </div>
      </aside>
    </div>
  );
}
