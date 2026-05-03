import { useEffect, useMemo, useRef, useState } from "react";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import { Sparkles, Download, Loader2, TrendingUp, Wallet, Receipt, Boxes, Pencil, Save, X, FileDown, Printer } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from "recharts";

const REPORTS = [
  { kind: "pl",       title: "P&L Statement",    desc: "Revenue, expenses and net profit.",      icon: TrendingUp },
  { kind: "sales",    title: "Sales Register",   desc: "All invoices grouped by client.",         icon: Receipt },
  { kind: "expenses", title: "Expense Ledger",   desc: "Itemised expenses by category.",          icon: Wallet },
  { kind: "stock",    title: "Stock Valuation",  desc: "Inventory worth by category.",            icon: Boxes },
];

const PERIODS = [
  { id: "day",   label: "Today" },
  { id: "week",  label: "Week" },
  { id: "month", label: "Month" },
  { id: "all",   label: "All time" },
];

const PALETTE = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#f43f5e","#3b82f6","#a855f7"];
const BACKEND = process.env.REACT_APP_BACKEND_URL;
const COMPANY_KEY = "tb_company";
const PROFILE_KEY = "tb_profile";

export default function Reports() {
  const [active, setActive] = useState("pl");
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftSummary, setDraftSummary] = useState("");
  const [localSummary, setLocalSummary] = useState({}); // {kind_period: editedText}
  const printRef = useRef(null);

  const company = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(COMPANY_KEY)) || { name: "TechnoBiz Systems", address: "", gst: "" }; }
    catch { return { name: "TechnoBiz Systems", address: "", gst: "" }; }
  }, []);
  const profile = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || { name: "—" }; }
    catch { return { name: "—" }; }
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/reports/${active}/summary?period=${period}`);
      setData(r.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); setEditing(false); }, [active, period]);

  const exportCSV = async () => {
    const token = localStorage.getItem("tb_token");
    const r = await fetch(`${BACKEND}/api/reports/${active}/export.csv?period=${period}`,
      { headers: { Authorization: `Bearer ${token}` } });
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${active}_${period}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const meta = REPORTS.find(r => r.kind === active);
  const summaryKey = `${active}_${period}`;
  const summary = localSummary[summaryKey] ?? data?.summary ?? "";

  const startEdit = () => { setDraftSummary(summary); setEditing(true); };
  const saveEdit = () => {
    setLocalSummary(s => ({ ...s, [summaryKey]: draftSummary }));
    setEditing(false);
  };
  const resetEdit = () => {
    setLocalSummary(s => { const n = { ...s }; delete n[summaryKey]; return n; });
    setEditing(false);
  };

  const downloadPDF = () => {
    document.body.classList.add("tb-printing");
    window.print();
    setTimeout(() => document.body.classList.remove("tb-printing"), 500);
  };

  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const periodLabel = PERIODS.find(p => p.id === period)?.label || period;
  const totals = data?.metrics || {};
  const rows = data?.rows || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Professional reports with AI insights — edit narrative, export PDF or CSV."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Btn variant="ghost" onClick={exportCSV} data-testid="export-csv"><Download className="inline h-3.5 w-3.5 mr-1" />Export CSV</Btn>
            <Btn data-testid="export-pdf" onClick={downloadPDF}><FileDown className="inline h-3.5 w-3.5 mr-1" />Download PDF</Btn>
          </div>
        } />

      {/* Report cards (hidden on print) */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 tb-no-print">
        {REPORTS.map(r => {
          const sel = active === r.kind;
          return (
            <button key={r.kind} onClick={()=>setActive(r.kind)} data-testid={`report-${r.kind}`}
              className={`text-left p-4 rounded-2xl border transition ${sel
                ? "border-[hsl(var(--m-accent))] bg-[hsla(var(--m-accent),0.06)] shadow-sm"
                : "card-premium hover:-translate-y-0.5"}`}>
              <div className="h-9 w-9 rounded-xl grid place-items-center mb-2.5"
                style={{background: "hsla(var(--m-accent),0.12)", color: "hsl(var(--m-accent))"}}>
                <r.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{r.title}</div>
              <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{r.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Period selector (hidden on print) */}
      <div className="flex items-center gap-2 tb-no-print">
        <span className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500 dark:text-slate-400">Period</span>
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-indigo-500/15 p-0.5 bg-white/60 dark:bg-slate-900/40">
          {PERIODS.map(p => (
            <button key={p.id} onClick={()=>setPeriod(p.id)} data-testid={`period-${p.id}`}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition ${period === p.id
                ? "bg-[hsl(var(--m-accent))] text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40"}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* PRINTABLE REPORT */}
      <div ref={printRef} id="tb-report-doc" className="space-y-5 tb-print-area">
        {/* Cover header */}
        <div className="rounded-2xl card-premium p-6 tb-cover">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center"
                   style={{background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"}}>
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="text-[10px] tracking-[0.18em] uppercase font-semibold text-slate-400">{company?.name || "TechnoBiz Systems"} · Smart ERP</div>
                <h2 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{meta?.title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{meta?.desc}</p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-500 dark:text-slate-400 font-mono-tab leading-relaxed">
              <div><span className="text-slate-400">Period</span> &nbsp;<span className="font-semibold text-slate-700 dark:text-slate-200">{periodLabel}</span></div>
              <div><span className="text-slate-400">Generated</span> &nbsp;<span className="font-semibold text-slate-700 dark:text-slate-200">{today}</span></div>
              <div><span className="text-slate-400">Prepared by</span> &nbsp;<span className="font-semibold text-slate-700 dark:text-slate-200">{profile?.name || "—"}</span></div>
              {company?.gst && <div><span className="text-slate-400">GSTIN</span> &nbsp;<span className="font-semibold text-slate-700 dark:text-slate-200">{company.gst}</span></div>}
            </div>
          </div>
        </div>

        {/* Executive summary / AI insight */}
        <Section title={`Executive Summary`} action={
          <div className="flex items-center gap-2 tb-no-print">
            <Pill tone="accent"><Sparkles className="inline h-3 w-3 mr-1" />Claude Sonnet 4.5</Pill>
            {!editing ? (
              <Btn variant="ghost" data-testid="edit-summary" onClick={startEdit}><Pencil className="inline h-3.5 w-3.5 mr-1" />Edit</Btn>
            ) : (
              <>
                {localSummary[summaryKey] !== undefined && (
                  <Btn variant="ghost" data-testid="reset-summary" onClick={resetEdit}>Reset</Btn>
                )}
                <Btn data-testid="save-summary" onClick={saveEdit}><Save className="inline h-3.5 w-3.5 mr-1" />Save</Btn>
              </>
            )}
          </div>
        }>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 py-4">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" /> Analysing {period}…
            </div>
          ) : editing ? (
            <textarea value={draftSummary} onChange={e=>setDraftSummary(e.target.value)} data-testid="summary-textarea"
              rows={Math.max(6, draftSummary.split("\n").length)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-indigo-500/20 bg-white dark:bg-slate-900/60 text-sm leading-relaxed focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 resize-none" />
          ) : (
            <div data-testid="report-summary" className="text-sm whitespace-pre-line text-slate-700 dark:text-slate-200 leading-relaxed">
              {summary || "—"}
              {localSummary[summaryKey] !== undefined && (
                <div className="mt-3 inline-flex items-center gap-1 text-[11px] text-amber-600 tb-no-print"><Pencil className="h-3 w-3" /> Edited locally</div>
              )}
            </div>
          )}
        </Section>

        {/* Metrics grid */}
        {data && Object.keys(totals).length > 0 && (
          <Section title="Key Metrics">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(totals).map(([k, v]) => {
                const isCurrency = typeof v === "number" && (k.includes("revenue") || k.includes("expenses") || k.includes("profit") || k.includes("total") || k.includes("value"));
                return (
                  <div key={k} className="rounded-xl border border-slate-200 dark:border-indigo-500/15 p-3 bg-white/60 dark:bg-slate-900/40">
                    <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-400 dark:text-slate-500 capitalize">{k.replace(/_/g, " ")}</div>
                    <div className="font-mono-tab font-semibold text-base text-slate-900 dark:text-slate-100 mt-1">
                      {isCurrency ? formatINR(v) : v}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Visual breakdown — bar + pie side by side */}
        {data && rows.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-5">
            <Section title="Breakdown (Bar)">
              <div className="h-72 min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} layout="vertical" margin={{left: 10, right: 20}}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v)=>v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : `₹${(v/1000).toFixed(0)}K`} tickLine={false} axisLine={false} />
                    <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={130} />
                    <Tooltip contentStyle={{borderRadius: 12, border: "1px solid #e2e8f0"}} formatter={(v)=>formatINR(v)} />
                    <Bar dataKey="value" radius={[0,8,8,0]}>
                      {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
            <Section title="Distribution (Pie)">
              <div className="h-72 min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={rows} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={90} innerRadius={48} paddingAngle={2}>
                      {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v)=>formatINR(v)} contentStyle={{borderRadius: 12, border: "1px solid #e2e8f0"}} />
                    <Legend wrapperStyle={{fontSize: 11}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </div>
        )}

        {/* Detailed rows table */}
        {data && rows.length > 0 && (
          <Section title="Detailed Breakdown">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] tracking-[0.12em] uppercase text-slate-400 border-b border-slate-200 dark:border-indigo-500/15">
                    <th className="text-left py-2.5 font-semibold">#</th>
                    <th className="text-left py-2.5 font-semibold">Category</th>
                    <th className="text-right py-2.5 font-semibold">Value</th>
                    <th className="text-right py-2.5 font-semibold">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sum = rows.reduce((s, r) => s + (r.value || 0), 0) || 1;
                    return rows.map((r, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-indigo-500/10">
                        <td className="py-2.5 text-slate-400 font-mono-tab">{String(i+1).padStart(2,"0")}</td>
                        <td className="py-2.5 text-slate-900 dark:text-slate-100">{r.label}</td>
                        <td className="py-2.5 text-right font-mono-tab font-semibold">{formatINR(r.value)}</td>
                        <td className="py-2.5 text-right font-mono-tab text-slate-500">{((r.value / sum) * 100).toFixed(1)}%</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* Footer / signature block (mostly visible in print) */}
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-indigo-500/15 p-5 tb-footer">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[12px] text-slate-500 dark:text-slate-400">
            <div>
              <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-400">Prepared By</div>
              <div className="mt-6 border-t border-slate-300 dark:border-slate-600 pt-1.5 text-slate-700 dark:text-slate-200 font-medium">{profile?.name || "—"}</div>
              <div>{profile?.designation || ""}</div>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-400">Reviewed By</div>
              <div className="mt-6 border-t border-slate-300 dark:border-slate-600 pt-1.5 text-slate-700 dark:text-slate-200 font-medium">&nbsp;</div>
            </div>
            <div className="text-right md:text-right">
              <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-400">{company?.name}</div>
              {company?.address && <div className="mt-1 leading-relaxed">{company.address}</div>}
              {company?.gst && <div className="mt-1 font-mono-tab">GSTIN: {company.gst}</div>}
              <div className="mt-3 text-[10px] text-slate-400">Confidential · Generated by TechnoBiz Smart ERP · {today}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Print button — also useful below */}
      <div className="flex justify-end tb-no-print">
        <Btn variant="ghost" onClick={downloadPDF} data-testid="print-bottom"><Printer className="inline h-3.5 w-3.5 mr-1" />Print / Save as PDF</Btn>
      </div>
    </div>
  );
}
