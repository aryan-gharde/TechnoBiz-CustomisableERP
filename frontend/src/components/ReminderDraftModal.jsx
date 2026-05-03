import { useEffect, useState } from "react";
import { api, formatINR } from "@/lib/api";
import { X, Sparkles, Send, Loader2, Edit3 } from "lucide-react";
import { toast } from "sonner";

export default function ReminderDraftModal({ invoice, open, onClose }) {
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && invoice) {
      setLoading(true); setDraft(null); setEditing(false);
      api.post("/insights/draft-reminder", { invoice_id: invoice.id })
        .then(r => setDraft(r.data))
        .finally(() => setLoading(false));
    }
  }, [open, invoice]);

  if (!open || !invoice) return null;

  const send = async () => {
    await api.post(`/finance/invoices/${invoice.id}/remind`);
    toast.success(`Reminder sent to ${invoice.client_name}`);
    onClose();
  };

  const toneColor = draft?.tone === "urgent" ? "bg-rose-50 text-rose-700 border-rose-200" :
                    draft?.tone === "firm"   ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                "bg-indigo-50 text-indigo-700 border-indigo-200";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} data-testid="reminder-modal">
      <div onClick={e=>e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl border border-slate-200 dark:border-indigo-500/20 shadow-xl overflow-hidden">
        <header className="flex items-center justify-between px-5 h-14 border-b border-slate-200 dark:border-indigo-500/15">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="font-display font-semibold text-slate-900 dark:text-slate-100 text-[15px]">AI-Drafted Reminder</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{invoice.number} · {invoice.client_name} · {formatINR(invoice.total)}</div>
            </div>
          </div>
          <button onClick={onClose} data-testid="reminder-close" className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </header>

        <div className="p-5 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" /> Drafting reminder with Claude…
            </div>
          )}
          {draft && (
            <>
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${toneColor}`}>
                  {draft.tone} tone · {draft.days_overdue} days overdue
                </span>
                <button onClick={()=>setEditing(v=>!v)} className="text-xs text-indigo-600 dark:text-indigo-300 inline-flex items-center gap-1">
                  <Edit3 className="h-3 w-3" /> {editing ? "Done" : "Edit"}
                </button>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.12em] uppercase font-semibold text-slate-500 dark:text-slate-400 mb-1">Subject</div>
                {editing ? (
                  <input data-testid="reminder-subject" value={draft.subject} onChange={e=>setDraft({...draft, subject: e.target.value})}
                    className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm" />
                ) : (
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{draft.subject}</div>
                )}
              </div>
              <div>
                <div className="text-[10px] tracking-[0.12em] uppercase font-semibold text-slate-500 dark:text-slate-400 mb-1">Body</div>
                {editing ? (
                  <textarea data-testid="reminder-body" value={draft.body} onChange={e=>setDraft({...draft, body: e.target.value})}
                    rows={10} className="w-full p-3 rounded-lg border border-slate-200 bg-white text-sm whitespace-pre-line" />
                ) : (
                  <div className="text-[13px] text-slate-700 dark:text-slate-200 whitespace-pre-line p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-indigo-500/15 leading-relaxed">{draft.body}</div>
                )}
              </div>
            </>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 px-5 h-14 border-t border-slate-200 dark:border-indigo-500/15 bg-slate-50/40 dark:bg-slate-900/40">
          <button onClick={onClose} className="h-9 px-3.5 rounded-xl text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700">Cancel</button>
          <button onClick={send} disabled={!draft} data-testid="reminder-send"
            className="h-9 px-3.5 rounded-xl text-sm font-medium btn-primary cta-glow disabled:opacity-50 inline-flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5" /> Send Reminder
          </button>
        </footer>
      </div>
    </div>
  );
}
