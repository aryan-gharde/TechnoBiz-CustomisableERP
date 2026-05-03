import { useEffect, useState } from "react";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import { toast } from "sonner";

export default function Payables() {
  const [list, setList] = useState([]);
  useEffect(() => { api.get("/finance/payables").then(r=>setList(r.data)); }, []);
  return (
    <div className="space-y-6">
      <PageHeader title="Payables" subtitle="Vendor dues and scheduled payouts." />
      <Section title="Scheduled Payments">
        <div className="space-y-2.5">
          {list.map(p => (
            <div key={p.id} data-testid={`pay-${p.vendor}`} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50/60">
              <div>
                <div className="text-sm font-medium text-slate-900">{p.vendor}</div>
                <div className="text-[11px] text-slate-500">due {new Date(p.due_date).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono-tab font-semibold">{formatINR(p.amount)}</span>
                <Pill tone="warning">{p.status}</Pill>
                <Btn variant="soft" data-testid={`pay-action-${p.vendor}`} onClick={()=>toast.success(`Payment scheduled for ${p.vendor}`)}>Pay Now</Btn>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
