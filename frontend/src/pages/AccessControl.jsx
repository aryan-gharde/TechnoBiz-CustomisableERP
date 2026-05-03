import { useEffect, useMemo, useState } from "react";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import { toast } from "sonner";
import {
  ShieldCheck, Lock, Plus, Copy, Save, Download, History, Search, RotateCcw,
  ChevronDown, ChevronRight, Users, Crown, Trash2, AlertCircle, X
} from "lucide-react";

const TABS = [
  { id: "modules",   label: "Modules" },
  { id: "features",  label: "Features & CRUD" },
  { id: "approvals", label: "Approvals" },
  { id: "scope",     label: "Data Scope" },
  { id: "security",  label: "Security" },
];

const LEVEL_TONES = {
  supreme:   { bg: "from-amber-400 to-rose-500",     pill: "danger",  label: "Supreme" },
  high:      { bg: "from-indigo-500 to-purple-600",  pill: "accent",  label: "High" },
  medium:    { bg: "from-cyan-500 to-blue-600",      pill: "info",    label: "Medium" },
  low:       { bg: "from-slate-400 to-slate-600",    pill: "default", label: "Low" },
  view_only: { bg: "from-emerald-400 to-teal-600",   pill: "success", label: "View only" },
};

const SCOPE_OPTIONS = [
  { id: "own",        label: "Own records only",   desc: "User sees only what they created." },
  { id: "department", label: "Department records", desc: "Visibility limited to user's department." },
  { id: "branch",     label: "Branch records",     desc: "All records within the same branch." },
  { id: "all",        label: "All company records", desc: "Full company-wide visibility." },
];

const SECURITY_FIELDS = [
  { id: "can_export",            label: "Can export reports" },
  { id: "can_download_invoices", label: "Can download invoices" },
  { id: "can_view_financial",    label: "Can view financial data" },
  { id: "can_change_settings",   label: "Can change settings" },
  { id: "can_manage_users",      label: "Can manage users" },
  { id: "can_view_audit",        label: "Can view audit logs" },
  { id: "require_2fa",           label: "Require 2FA on login" },
];

const APPROVAL_FIELDS = [
  { id: "purchase_limit",     label: "Purchase approval", currency: true,   max: 2000000 },
  { id: "payment_limit",      label: "Payment approval",  currency: true,   max: 1000000 },
  { id: "discount_limit_pct", label: "Discount authority",currency: false,  max: 100 },
  { id: "expense_limit",      label: "Expense approval",  currency: true,   max: 500000 },
];

export default function AccessControl() {
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [audit, setAudit] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [tab, setTab] = useState("modules");
  const [q, setQ] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);
  const [expandedMods, setExpandedMods] = useState({ inventory: true, finance: true });
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const loadAll = async () => {
    const [rs, ms, au] = await Promise.all([
      api.get("/rbac/roles"), api.get("/rbac/modules"), api.get("/rbac/audit")
    ]);
    setRoles(rs.data); setModules(ms.data.modules); setAudit(au.data);
    if (!selectedId && rs.data.length) setSelectedId(rs.data[0].id);
  };
  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!selectedId) return;
    api.get(`/rbac/roles/${selectedId}`).then(r => setDraft(r.data));
  }, [selectedId]);

  const dirty = useMemo(() => {
    if (!draft) return false;
    const orig = roles.find(r => r.id === draft.id);
    if (!orig) return false;
    return JSON.stringify(orig) !== JSON.stringify(draft);
  }, [draft, roles]);

  const filteredRoles = roles.filter(r => !q || r.name.toLowerCase().includes(q.toLowerCase()));

  const save = async () => {
    if (!draft || draft.is_locked) return;
    setSaving(true);
    try {
      await api.put(`/rbac/roles/${draft.id}`, {
        name: draft.name, description: draft.description,
        modules: draft.modules, features: draft.features,
        approvals: draft.approvals, data_scope: draft.data_scope,
        security: draft.security,
      });
      toast.success(`Saved permissions for ${draft.name}`);
      loadAll();
    } finally { setSaving(false); }
  };

  const reset = () => {
    if (!draft) return;
    const orig = roles.find(r => r.id === draft.id);
    if (orig) { setDraft(orig); toast.info("Changes reset"); }
  };

  const duplicate = async () => {
    if (!draft) return;
    const r = await api.post(`/rbac/roles/${draft.id}/duplicate`);
    toast.success(`Duplicated as ${r.data.name}`);
    await loadAll(); setSelectedId(r.data.id);
  };

  const remove = async (id) => {
    const r = roles.find(x => x.id === id); if (!r || r.is_locked) return;
    if (!window.confirm(`Delete role "${r.name}"?`)) return;
    await api.delete(`/rbac/roles/${id}`);
    toast.success(`Deleted ${r.name}`);
    setSelectedId(roles[0]?.id); await loadAll();
  };

  const exportPerms = () => {
    if (!draft) return;
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${draft.name.replace(/\s+/g,"_")}_permissions.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as JSON");
  };

  const updateDraft = (patch) => setDraft(d => ({ ...d, ...patch }));
  const toggleModule = (mid) => updateDraft({ modules: { ...draft.modules, [mid]: !draft.modules[mid] } });
  const toggleFeature = (key) => {
    const current = draft.features[key] || { enabled: false, create:false, read:false, update:false, delete:false };
    const enabled = !current.enabled;
    updateDraft({ features: { ...draft.features, [key]: { ...current, enabled, read: enabled ? current.read || true : false } } });
  };
  const toggleCRUD = (key, op) => {
    const current = draft.features[key] || { enabled: true, create:false, read:false, update:false, delete:false };
    updateDraft({ features: { ...draft.features, [key]: { ...current, [op]: !current[op] } } });
  };
  const bulkCRUD = (modId, value) => {
    const next = { ...draft.features };
    const mod = modules.find(m => m.id === modId);
    if (!mod) return;
    mod.features.forEach(f => {
      const k = `${modId}.${f}`;
      const current = next[k] || { enabled: false };
      next[k] = { ...current, enabled: value || current.enabled, create: value, read: true, update: value, delete: value };
    });
    updateDraft({ features: next });
  };

  if (!draft) return <div className="text-slate-400 text-sm p-8">Loading…</div>;

  return (
    <div className="space-y-6 pb-24" data-testid="access-control">
      <PageHeader title="Access Control & Permissions"
        subtitle="Manage roles, module visibility, CRUD permissions, and approval authority."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Btn variant="ghost" data-testid="rbac-audit-btn" onClick={()=>setAuditOpen(true)}><History className="inline h-3.5 w-3.5 mr-1" />Activity</Btn>
            <Btn variant="ghost" data-testid="rbac-export" onClick={exportPerms}><Download className="inline h-3.5 w-3.5 mr-1" />Export</Btn>
            <Btn variant="ghost" data-testid="rbac-duplicate" onClick={duplicate}><Copy className="inline h-3.5 w-3.5 mr-1" />Duplicate</Btn>
            <Btn data-testid="rbac-new" onClick={()=>setCreateOpen(true)}><Plus className="inline h-3.5 w-3.5 mr-1" />New Role</Btn>
          </div>
        } />

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        {/* LEFT: Role directory */}
        <aside className="glass rounded-2xl p-3 lg:sticky lg:top-20 self-start max-h-[calc(100vh-100px)] overflow-y-auto" data-testid="role-directory">
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input data-testid="role-search" placeholder="Search roles…" value={q} onChange={e=>setQ(e.target.value)}
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-sm" />
          </div>
          <div className="space-y-1.5">
            {filteredRoles.map(r => {
              const active = r.id === selectedId;
              const t = LEVEL_TONES[r.access_level] || LEVEL_TONES.low;
              return (
                <button key={r.id} onClick={()=>setSelectedId(r.id)} data-testid={`role-${r.access_level}-${r.name.replace(/\s+/g,'-').toLowerCase()}`}
                  className={`w-full text-left rounded-xl p-3 transition-all border ${active
                    ? "border-[hsl(var(--m-accent))] bg-[hsla(var(--m-accent),0.08)] shadow-sm"
                    : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${t.bg} grid place-items-center text-white flex-none`}>
                      {r.is_super_admin ? <Crown className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{r.name}</span>
                        {r.is_locked && <Lock className="h-3 w-3 text-slate-400" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <Pill tone={t.pill}>{t.label}</Pill>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 inline-flex items-center gap-0.5"><Users className="h-2.5 w-2.5" />{r.user_count}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Updated {new Date(r.last_modified).toLocaleDateString()}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* RIGHT: Permission center */}
        <div className="space-y-4">
          {/* Header card */}
          <div className="glass-strong rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 data-testid="rbac-role-name" className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">{draft.name}</h2>
                  {draft.is_locked && <Pill tone="warning"><Lock className="inline h-2.5 w-2.5 mr-0.5" />Locked</Pill>}
                  <Pill tone={LEVEL_TONES[draft.access_level]?.pill}>{LEVEL_TONES[draft.access_level]?.label}</Pill>
                </div>
                {!draft.is_locked ? (
                  <input value={draft.description || ""} onChange={e=>updateDraft({ description: e.target.value })}
                    placeholder="Role description"
                    className="text-sm text-slate-500 dark:text-slate-400 bg-transparent outline-none w-full max-w-md border-b border-transparent focus:border-indigo-300" />
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{draft.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {!draft.is_locked && !draft.is_super_admin && (
                  <button onClick={()=>remove(draft.id)} data-testid="rbac-delete"
                    className="h-8 w-8 grid place-items-center rounded-lg hover:bg-rose-50 text-rose-500"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            </div>
            {draft.is_locked && (
              <div className="mt-3 p-3 rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-900/15 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-none" />
                <div className="text-[12.5px] text-amber-700 dark:text-amber-200">
                  <strong>Super Admin</strong> has full system authority and cannot be edited. This is the locked highest role with all modules, CRUD rights, role management, audit access, and unlimited approval authority.
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scroll-hidden border-b border-slate-200 dark:border-indigo-500/15 px-1" data-testid="rbac-tabs">
            {TABS.map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)} data-testid={`tab-${t.id}`}
                className={`px-3.5 py-2.5 text-sm font-medium transition border-b-2 ${tab === t.id
                  ? "text-[hsl(var(--m-accent))] border-[hsl(var(--m-accent))]"
                  : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-100"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab: Modules */}
          {tab === "modules" && (
            <Section title="Module Access" action={<Pill tone="info">{Object.values(draft.modules || {}).filter(Boolean).length} of {modules.length} enabled</Pill>}>
              <div className="grid sm:grid-cols-2 gap-3">
                {modules.map(m => {
                  const enabled = !!draft.modules?.[m.id];
                  return (
                    <div key={m.id} role="button" tabIndex={draft.is_locked ? -1 : 0}
                      onClick={()=>!draft.is_locked && toggleModule(m.id)}
                      onKeyDown={(e)=>{ if (!draft.is_locked && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggleModule(m.id); }}}
                      data-testid={`mod-toggle-${m.id}`}
                      className={`flex items-center justify-between p-4 rounded-xl border transition text-left ${enabled
                        ? "border-[hsl(var(--m-accent))] bg-[hsla(var(--m-accent),0.06)]"
                        : "border-slate-200 dark:border-indigo-500/15"} ${draft.is_locked ? "opacity-70 cursor-not-allowed" : "hover:shadow-sm cursor-pointer"}`}>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{m.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{m.features.length} features</div>
                      </div>
                      <Toggle on={enabled} asSpan />
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Tab: Features & CRUD */}
          {tab === "features" && (
            <div className="space-y-3">
              {modules.filter(m => draft.modules?.[m.id]).map(m => {
                const expanded = expandedMods[m.id] !== false;
                return (
                  <div key={m.id} className="card-premium rounded-2xl overflow-hidden" data-testid={`feat-section-${m.id}`}>
                    <button onClick={()=>setExpandedMods(s => ({...s, [m.id]: !expanded}))}
                      className="w-full flex items-center justify-between p-4 text-left">
                      <div className="flex items-center gap-2">
                        {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{m.name}</span>
                        <Pill>{m.features.length} features</Pill>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Btn variant="ghost" onClick={(e)=>{e.stopPropagation(); !draft.is_locked && bulkCRUD(m.id, true);}} data-testid={`bulk-on-${m.id}`}>Enable all</Btn>
                        <Btn variant="ghost" onClick={(e)=>{e.stopPropagation(); !draft.is_locked && bulkCRUD(m.id, false);}}>Read-only</Btn>
                      </div>
                    </button>
                    {expanded && (
                      <div className="border-t border-slate-100 dark:border-indigo-500/10 px-4 pb-4">
                        <div className="overflow-x-auto -mx-4 px-4">
                          <table className="w-full text-sm min-w-[600px]">
                            <thead>
                              <tr className="text-[10px] tracking-[0.12em] uppercase text-slate-400 dark:text-slate-500">
                                <th className="text-left py-2 font-semibold w-[40%]">Feature</th>
                                <th className="text-center py-2 font-semibold">Access</th>
                                <th className="text-center py-2 font-semibold">Create</th>
                                <th className="text-center py-2 font-semibold">Read</th>
                                <th className="text-center py-2 font-semibold">Update</th>
                                <th className="text-center py-2 font-semibold">Delete</th>
                              </tr>
                            </thead>
                            <tbody>
                              {m.features.map(f => {
                                const k = `${m.id}.${f}`;
                                const cfg = draft.features?.[k] || { enabled: false, create: false, read: false, update: false, delete: false };
                                return (
                                  <tr key={f} className="border-t border-slate-100 dark:border-indigo-500/10">
                                    <td className="py-3 font-medium text-slate-800 dark:text-slate-200 capitalize">{f.replace(/_/g," ")}</td>
                                    <td className="py-3 text-center"><Toggle on={cfg.enabled} onClick={()=>!draft.is_locked && toggleFeature(k)} testId={`feat-${k}`} /></td>
                                    {["create","read","update","delete"].map(op => (
                                      <td key={op} className="py-3 text-center">
                                        <Check checked={!!cfg[op]} disabled={draft.is_locked || !cfg.enabled} onClick={()=>toggleCRUD(k, op)} testId={`crud-${k}-${op}`} />
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {modules.filter(m => draft.modules?.[m.id]).length === 0 && (
                <div className="card-premium rounded-2xl p-8 text-center text-sm text-slate-400">Enable modules first to configure features.</div>
              )}
            </div>
          )}

          {/* Tab: Approvals */}
          {tab === "approvals" && (
            <Section title="Approval Authority">
              <div className="grid sm:grid-cols-2 gap-4">
                {APPROVAL_FIELDS.map(f => {
                  const v = draft.approvals?.[f.id] ?? 0;
                  const unlimited = v === -1;
                  return (
                    <div key={f.id} className="rounded-xl border border-slate-200 dark:border-indigo-500/15 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{f.label}</div>
                        <button data-testid={`unlimited-${f.id}`} disabled={draft.is_locked}
                          onClick={()=>updateDraft({ approvals: {...draft.approvals, [f.id]: unlimited ? 0 : -1 }})}
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${unlimited ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                          {unlimited ? "Unlimited" : "Set limit"}
                        </button>
                      </div>
                      {!unlimited && (
                        <>
                          <input type="range" min={0} max={f.max} step={f.currency ? 1000 : 1} value={v}
                            disabled={draft.is_locked}
                            onChange={e=>updateDraft({ approvals: {...draft.approvals, [f.id]: +e.target.value} })}
                            data-testid={`appr-slider-${f.id}`}
                            className="w-full accent-indigo-500" />
                          <div className="flex items-center justify-between mt-1.5 text-xs">
                            <span className="text-slate-400">0</span>
                            <span className="font-mono-tab font-semibold text-slate-900 dark:text-slate-100">{f.currency ? formatINR(v) : `${v}%`}</span>
                            <span className="text-slate-400">{f.currency ? formatINR(f.max) : `${f.max}%`}</span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Tab: Data Scope */}
          {tab === "scope" && (
            <Section title="Data Visibility Scope">
              <div className="grid sm:grid-cols-2 gap-3">
                {SCOPE_OPTIONS.map(s => {
                  const sel = draft.data_scope === s.id;
                  return (
                    <button key={s.id} onClick={()=>!draft.is_locked && updateDraft({ data_scope: s.id })}
                      data-testid={`scope-${s.id}`}
                      className={`text-left p-4 rounded-xl border transition ${sel
                        ? "border-[hsl(var(--m-accent))] bg-[hsla(var(--m-accent),0.06)]"
                        : "border-slate-200 dark:border-indigo-500/15 hover:bg-slate-50 dark:hover:bg-slate-800/30"} ${draft.is_locked ? "opacity-70 cursor-not-allowed" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`h-4 w-4 rounded-full border-2 grid place-items-center ${sel ? "border-[hsl(var(--m-accent))]" : "border-slate-300"}`}>
                          {sel && <div className="h-2 w-2 rounded-full bg-[hsl(var(--m-accent))]" />}
                        </div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{s.label}</span>
                      </div>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 ml-6">{s.desc}</p>
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Tab: Security */}
          {tab === "security" && (
            <Section title="Security & Compliance">
              <div className="space-y-2">
                {SECURITY_FIELDS.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-indigo-500/15">
                    <div className="text-sm text-slate-900 dark:text-slate-100">{f.label}</div>
                    <Toggle on={!!draft.security?.[f.id]} testId={`sec-${f.id}`}
                      onClick={()=>!draft.is_locked && updateDraft({ security: {...draft.security, [f.id]: !draft.security?.[f.id]} })} />
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* Sticky save bar */}
      {dirty && !draft.is_locked && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 glass-strong rounded-2xl px-5 py-3 flex items-center gap-3 shadow-2xl" data-testid="save-bar">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-sm text-slate-700 dark:text-slate-200">Unsaved changes</span>
          <Btn variant="ghost" data-testid="rbac-reset" onClick={reset}><RotateCcw className="inline h-3.5 w-3.5 mr-1" />Reset</Btn>
          <Btn data-testid="rbac-save" onClick={save} disabled={saving}>
            <Save className="inline h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save Changes"}
          </Btn>
        </div>
      )}

      {/* Audit drawer */}
      {auditOpen && (
        <div className="fixed inset-0 z-50" onClick={()=>setAuditOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" />
          <aside onClick={e=>e.stopPropagation()} className="absolute top-0 right-0 h-full w-[400px] glass-strong border-l border-white/60 dark:border-indigo-500/15 p-5 overflow-y-auto" data-testid="audit-drawer">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-600" />
                <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">Activity Logs</h3>
              </div>
              <button onClick={()=>setAuditOpen(false)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/40"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2">
              {audit.map(a => (
                <div key={a.id} className="p-3 rounded-xl border border-slate-200 dark:border-indigo-500/15">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Pill tone={a.action === "delete" ? "danger" : a.action === "create" ? "success" : "info"}>{a.action}</Pill>
                    <span className="text-[10px] text-slate-400">{new Date(a.ts).toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-slate-800 dark:text-slate-200">{a.summary}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">by {a.actor}</div>
                </div>
              ))}
              {audit.length === 0 && <div className="text-center text-sm text-slate-400 py-8">No activity yet.</div>}
            </div>
          </aside>
        </div>
      )}

      {/* Create role modal */}
      {createOpen && (
        <CreateRoleModal roles={roles} onClose={()=>setCreateOpen(false)} onCreate={async (name, desc, tplId)=>{
          const r = await api.post("/rbac/roles", { name, description: desc, template_role_id: tplId });
          toast.success(`Role "${name}" created`);
          setCreateOpen(false); await loadAll(); setSelectedId(r.data.id);
        }} />
      )}
    </div>
  );
}

const Toggle = ({ on, onClick, testId, asSpan }) => {
  const Cls = `inline-flex items-center h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${on ? "bg-[hsl(var(--m-accent))]" : "bg-slate-200 dark:bg-slate-700"}`;
  const thumb = `pointer-events-none block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${on ? "translate-x-4" : "translate-x-0"}`;
  if (asSpan) return (
    <span className={Cls} aria-hidden="true">
      <span className={thumb} />
    </span>
  );
  return (
    <button type="button" onClick={onClick} data-testid={testId} aria-pressed={on} className={Cls}>
      <span className={thumb} />
    </button>
  );
};

const Check = ({ checked, disabled, onClick, testId }) => (
  <button onClick={onClick} disabled={disabled} data-testid={testId}
    className={`h-5 w-5 mx-auto grid place-items-center rounded-md border transition ${checked
      ? "bg-[hsl(var(--m-accent))] border-[hsl(var(--m-accent))] text-white"
      : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}>
    {checked && <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" clipRule="evenodd"/></svg>}
  </button>
);

const CreateRoleModal = ({ roles, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [tpl, setTpl] = useState("");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}>
      <form onSubmit={(e)=>{e.preventDefault(); if (name.trim()) onCreate(name.trim(), desc, tpl || null);}}
        onClick={e=>e.stopPropagation()} data-testid="create-role-form"
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 border border-slate-200 dark:border-indigo-500/20 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">Create New Role</h3>
          <button type="button" onClick={onClose} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/40"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <input required data-testid="new-role-name" value={name} onChange={e=>setName(e.target.value)} placeholder="Role name (e.g. Branch Manager)"
            className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm" />
          <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Short description"
            className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm" />
          <select value={tpl} onChange={e=>setTpl(e.target.value)} data-testid="new-role-template"
            className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm">
            <option value="">Start from blank (read-only Dashboard)</option>
            {roles.filter(r=>!r.is_super_admin).map(r => <option key={r.id} value={r.id}>Clone from {r.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 mt-5">
          <Btn type="submit" data-testid="create-role-submit" className="flex-1">Create Role</Btn>
          <Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn>
        </div>
      </form>
    </div>
  );
};
