import { useState } from "react";
import { Section, Pill, Btn } from "@/components/Primitives";
import { Check, Circle, Sparkles } from "lucide-react";
import { toast } from "sonner";

const ITEMS = [
  { id: "bank",       label: "Reconcile bank statements", detail: "Match all bank transactions with TechnoBiz entries.", auto: true },
  { id: "gst",        label: "Generate GSTR-3B summary",   detail: "Calculate output - input tax for current period.",     auto: true },
  { id: "expenses",   label: "Approve pending expenses",   detail: "All site/project expenses approved for the month.",   auto: true },
  { id: "receivables",label: "Chase top 5 overdue clients", detail: "AI-drafted reminders for highest outstanding accounts." },
  { id: "depreciate", label: "Post depreciation entries",   detail: "Run scheduled depreciation on fixed assets." },
  { id: "pl",         label: "Export P&L Statement",       detail: "Generate and share with leadership / auditor." },
];

export default function MonthEndChecklist() {
  const [done, setDone] = useState(["bank", "gst", "expenses"]);

  const toggle = (id) => {
    setDone(d => d.includes(id) ? d.filter(x => x !== id) : [...d, id]);
  };
  const completed = done.length;
  const pct = Math.round((completed / ITEMS.length) * 100);

  return (
    <Section title="Month-End Close" action={
      <div className="flex items-center gap-2">
        <Pill tone={pct === 100 ? "success" : "warning"}>{completed}/{ITEMS.length} complete</Pill>
        <Btn variant="soft" data-testid="auto-run-close" onClick={()=>{
          setDone(ITEMS.filter(i=>i.auto).map(i=>i.id));
          toast.success("AI ran 3 automated checks");
        }}><Sparkles className="inline h-3 w-3 mr-1" />Auto-run</Btn>
      </div>
    }>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mb-4 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{width: `${pct}%`, background: "hsl(var(--m-accent))"}} />
      </div>
      <div className="space-y-2">
        {ITEMS.map(it => {
          const isDone = done.includes(it.id);
          return (
            <button key={it.id} onClick={()=>toggle(it.id)} data-testid={`mec-${it.id}`}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition ${isDone ? "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-900/10" : "border-slate-200 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"}`}>
              <div className={`mt-0.5 h-5 w-5 rounded-full grid place-items-center flex-none ${isDone ? "bg-emerald-500 text-white" : "border-2 border-slate-300 dark:border-slate-600"}`}>
                {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isDone ? "text-slate-900 dark:text-slate-100" : "text-slate-800 dark:text-slate-200"}`}>{it.label}</span>
                  {it.auto && <Pill tone="accent">AI</Pill>}
                </div>
                <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{it.detail}</div>
              </div>
            </button>
          );
        })}
      </div>
    </Section>
  );
}
