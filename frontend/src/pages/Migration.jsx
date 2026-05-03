import { useEffect, useRef, useState } from "react";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import { Upload, FileText, FileSpreadsheet, Database, Sparkles, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function Migration() {
  const [sources, setSources] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeSource, setActiveSource] = useState("csv");
  const [target, setTarget] = useState("products");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(null);
  const [importing, setImporting] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  const loadHistory = () => api.get("/migration/history").then(r => setHistory(r.data));
  useEffect(() => {
    api.get("/migration/sources").then(r => setSources(r.data.sources));
    loadHistory();
  }, []);

  const onFiles = async (files) => {
    if (!files || !files[0]) return;
    const file = files[0];
    setUploading(true); setUploaded(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("source", activeSource);
    fd.append("target", target);
    const token = localStorage.getItem("tb_token");
    try {
      const r = await fetch(`${BACKEND}/api/migration/upload`, {
        method: "POST", body: fd,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.detail || "Upload failed");
      setUploaded(data);
      toast.success(`Uploaded — ${data.rows} rows detected`);
      loadHistory();
    } catch (e) {
      toast.error(e.message || "Upload failed");
    } finally { setUploading(false); }
  };

  const runImport = async () => {
    if (!uploaded) return;
    setImporting(true);
    try {
      const r = await api.post(`/migration/${uploaded.id}/import`);
      toast.success(`Imported ${r.data.imported_rows} rows from ${r.data.filename}`);
      setUploaded(null); loadHistory();
    } finally { setImporting(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Data Migration" subtitle="Bring data in from any ERP, accounting tool, spreadsheet or scanned document — AI maps the fields for you."
        actions={<Pill tone="accent"><Sparkles className="inline h-3 w-3 mr-1" />AI-assisted mapping</Pill>} />

      {/* Source picker */}
      <Section title="Choose source">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {sources.map(s => (
            <button key={s.id} onClick={()=>setActiveSource(s.id)} data-testid={`src-${s.id}`}
              className={`rounded-xl p-3 text-left border transition ${
                activeSource === s.id
                  ? "border-[hsl(var(--m-accent))] bg-[hsla(var(--m-accent),0.08)] shadow-sm"
                  : "border-slate-200 dark:border-indigo-500/15 hover:border-indigo-200 dark:hover:border-indigo-400/25"}`}>
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white grid place-items-center font-display font-semibold mb-2">{s.icon}</div>
              <div className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100 truncate">{s.name}</div>
              <div className="text-[10px] tracking-[0.06em] uppercase text-slate-400 dark:text-slate-500 mt-0.5 truncate">{s.format}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* Drop zone */}
      <Section title="Upload file" action={
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-[0.12em] uppercase font-semibold text-slate-500 dark:text-slate-400">Import as</span>
          <select value={target} onChange={e=>setTarget(e.target.value)} data-testid="migration-target"
            className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-sm">
            <option value="products">Products</option>
            <option value="invoices">Invoices</option>
            <option value="expenses">Expenses</option>
            <option value="customers">Customers</option>
            <option value="suppliers">Suppliers</option>
            <option value="opening-balances">Opening balances</option>
          </select>
        </div>
      }>
        <div data-testid="dropzone"
          onDragOver={(e)=>{e.preventDefault(); setDrag(true);}}
          onDragLeave={()=>setDrag(false)}
          onDrop={(e)=>{e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files);}}
          onClick={()=>fileRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed cursor-pointer p-10 text-center transition ${
            drag ? "border-[hsl(var(--m-accent))] bg-[hsla(var(--m-accent),0.05)]" : "border-slate-200 dark:border-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-400/40"}`}>
          <input ref={fileRef} type="file" hidden data-testid="file-input"
            onChange={(e)=>onFiles(e.target.files)}
            accept=".csv,.xlsx,.xls,.pdf,.xml,.tsv,.txt,.iif" />
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center mx-auto mb-3">
            <Upload className="h-6 w-6 text-white" />
          </div>
          <div className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">Drop file here or click to browse</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">CSV · XLSX · PDF · XML · IIF — up to 50MB</div>
          {uploading && <div className="mt-3 text-sm text-indigo-600 inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Parsing file…</div>}
        </div>

        {uploaded && (
          <div className="mt-5 rounded-xl border border-slate-200 dark:border-indigo-500/15 overflow-hidden" data-testid="upload-result">
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-indigo-500/15 bg-slate-50/60 dark:bg-slate-900/40">
              <div className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 text-indigo-500" />
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{uploaded.filename}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{uploaded.detected_type} · {uploaded.size_kb} KB · {uploaded.rows} rows</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Btn variant="ghost" onClick={()=>setUploaded(null)}><X className="inline h-3.5 w-3.5 mr-1" />Discard</Btn>
                <Btn data-testid="run-import" onClick={runImport} disabled={importing}>
                  {importing ? <><Loader2 className="inline h-3.5 w-3.5 mr-1 animate-spin" />Importing…</> : <><Check className="inline h-3.5 w-3.5 mr-1" />Run Import</>}
                </Btn>
              </div>
            </div>
            {uploaded.columns?.length > 0 && (
              <div className="p-3 overflow-x-auto">
                <div className="text-[10px] tracking-[0.12em] uppercase font-semibold text-slate-400 dark:text-slate-500 mb-2">AI-detected columns</div>
                <div className="flex gap-1.5 flex-wrap">
                  {uploaded.columns.map((c, i) => <Pill key={i} tone="accent">{String(c).slice(0, 30)}</Pill>)}
                </div>
                {uploaded.preview?.length > 0 && (
                  <table className="w-full text-xs mt-3">
                    <tbody>
                      {uploaded.preview.map((row, ri) => (
                        <tr key={ri} className="border-t border-slate-100 dark:border-indigo-500/10">
                          {row.map((cell, ci) => <td key={ci} className="py-2 pr-3 text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{String(cell)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </Section>

      {/* History */}
      <Section title="Migration history" action={<Pill>{history.length} runs</Pill>}>
        <div className="space-y-2">
          {history.length === 0 && <div className="text-center text-slate-400 text-sm py-8">No migrations yet — upload your first file above.</div>}
          {history.map(h => (
            <div key={h.id} data-testid={`history-${h.id.slice(0,6)}`} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-indigo-500/15">
              <div className="flex items-center gap-3 min-w-0">
                {h.detected_type === "pdf" ? <FileText className="h-4 w-4 text-rose-500 flex-none" /> :
                 h.detected_type === "excel" ? <FileSpreadsheet className="h-4 w-4 text-emerald-500 flex-none" /> :
                  <Database className="h-4 w-4 text-indigo-500 flex-none" />}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{h.filename}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tab">{h.source} → {h.target} · {h.rows} rows · {new Date(h.ts).toLocaleString()}</div>
                </div>
              </div>
              <Pill tone={h.status === "completed" ? "success" : "warning"}>{h.status}</Pill>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
