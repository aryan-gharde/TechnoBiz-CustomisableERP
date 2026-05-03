import { useEffect, useState } from "react";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import ReminderDraftModal from "@/components/ReminderDraftModal";
import { Sparkles } from "lucide-react";

const buckets = [
  { id: "current", label: "Current", tone: "success" },
  { id: "1-30", label: "1–30 days", tone: "info" },
  { id: "31-60", label: "31–60 days", tone: "warning" },
  { id: "61-90", label: "61–90 days", tone: "warning" },
  { id: "90+", label: "90+ days", tone: "danger" },
];

export default function Receivables() {
  const [d, setD] = useState({ buckets: {}, invoices: [] });
  const [reminderInv, setReminderInv] = useState(null);
  const load = () => api.get("/finance/receivables").then(r=>setD(r.data));
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Receivables" subtitle="Aging buckets and AI-drafted reminders that close faster." />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {buckets.map(b => (
          <div key={b.id} className="card-premium rounded-xl p-4" data-testid={`bucket-${b.id}`}>
            <div className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-400 mb-1">{b.label}</div>
            <div className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100 font-mono-tab">{formatINR(d.buckets[b.id] || 0)}</div>
            <Pill tone={b.tone}>aging</Pill>
          </div>
        ))}
      </div>
      <Section title="Outstanding Invoices">
        <div className="space-y-2.5">
          {d.invoices.slice(0,15).map(inv => (
            <div key={inv.id} data-testid={`recv-${inv.number}`} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50/60">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{inv.client_name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tab">{inv.number} · due {new Date(inv.due_date).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono-tab font-semibold text-slate-900 dark:text-slate-100">{formatINR(inv.total)}</span>
                <Btn variant="soft" data-testid={`recv-remind-${inv.number}`} onClick={()=>setReminderInv(inv)}>
                  <Sparkles className="inline h-3 w-3 mr-1" />AI Remind
                </Btn>
              </div>
            </div>
          ))}
          {d.invoices.length === 0 && <div className="text-center text-slate-400 py-8 text-sm">All invoices settled.</div>}
        </div>
      </Section>
      <ReminderDraftModal invoice={reminderInv} open={!!reminderInv} onClose={()=>setReminderInv(null)} />
    </div>
  );
}
