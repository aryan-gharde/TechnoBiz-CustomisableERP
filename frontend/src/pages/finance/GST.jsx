import { useEffect, useState } from "react";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import { Calculator } from "lucide-react";
import { toast } from "sonner";

export default function GST() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/finance/gst").then(r=>setD(r.data)); }, []);
  if (!d) return <div className="text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="GST & Compliance" subtitle="Filing readiness, due dates and tax breakdown."
        actions={<Btn data-testid="file-gst" onClick={()=>toast.success("GSTR-3B prepared for filing")}><Calculator className="inline h-3.5 w-3.5 mr-1" />File GSTR-3B</Btn>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-premium rounded-2xl p-5">
          <div className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500">Output Tax</div>
          <div className="font-display text-2xl font-semibold mt-1 font-mono-tab">{formatINR(d.output_tax)}</div>
        </div>
        <div className="card-premium rounded-2xl p-5">
          <div className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500">Input Credit</div>
          <div className="font-display text-2xl font-semibold mt-1 font-mono-tab">{formatINR(d.input_tax)}</div>
        </div>
        <div className="card-premium rounded-2xl p-5 module-glow">
          <div className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500">Net Payable</div>
          <div className="font-display text-2xl font-semibold mt-1 font-mono-tab">{formatINR(d.net_payable)}</div>
          <div className="text-xs text-slate-500 mt-1">due {new Date(d.due_date).toLocaleDateString()}</div>
        </div>
      </div>
      <Section title="Filing History">
        <div className="space-y-2.5">
          {d.filings.map((f,i) => (
            <div key={i} data-testid={`gst-${f.period}-${f.type}`} className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
              <div>
                <div className="text-sm font-medium text-slate-900">{f.type} — {f.period}</div>
                <div className="text-[11px] text-slate-500 font-mono-tab">{formatINR(f.amount)}</div>
              </div>
              <Pill tone={f.status === "filed" ? "success" : "warning"}>{f.status}</Pill>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
