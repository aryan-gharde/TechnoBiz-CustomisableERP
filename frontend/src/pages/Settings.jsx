import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import { Database, ArrowRight, ShieldCheck, Pencil, Save, X, Building2, User as UserIcon, Phone, Mail, MapPin, Briefcase, Calendar as CalIcon, FileText, Globe, Bell, Workflow } from "lucide-react";
import { toast } from "sonner";

const PROFILE_KEY = "tb_profile";
const COMPANY_KEY = "tb_company";
const NOTIF_KEY = "tb_notif_prefs";
const WORKFLOW_KEY = "tb_workflow_prefs";

const NOTIF_TOPICS = [
  { id: "low_stock",        label: "Low stock alerts",        desc: "Notify when SKUs hit reorder level." },
  { id: "overdue_invoices", label: "Overdue invoices",        desc: "Receivables past due date." },
  { id: "gst_due",          label: "GST filing reminders",    desc: "Quarterly / monthly compliance." },
  { id: "approvals",        label: "Pending approvals",       desc: "POs, expenses, discounts awaiting your sign-off." },
  { id: "expense_anomaly",  label: "Expense anomalies",       desc: "AI-detected spend spikes or unusual vendors." },
  { id: "daily_briefing",   label: "Daily AI briefing",       desc: "Morning summary of risks & opportunities." },
  { id: "po_status",        label: "PO status updates",       desc: "Drafts, approvals, deliveries." },
  { id: "cash_flow",        label: "Cash-flow warnings",      desc: "Forecasted shortfalls & dips." },
];

const CHANNELS = [
  { id: "email",   label: "Email" },
  { id: "in_app",  label: "In-app" },
  { id: "push",    label: "Push" },
];

const defaultNotifs = () => {
  const m = {};
  NOTIF_TOPICS.forEach(t => {
    m[t.id] = { email: true, in_app: true, push: false };
  });
  return m;
};

const defaultWorkflow = () => ({
  approval_threshold: 100000,
  auto_remind_overdue: true,
  reminder_cadence_days: 3,
  auto_po_low_stock: false,
  default_payment_terms: 30,
  enable_dark_mode_default: false,
  digest_time: "08:00",
  weekly_summary: true,
});

const defaultProfile = (user) => ({
  name: user?.name || "",
  email: user?.email || "",
  phone: "",
  designation: "Owner",
  department: "Executive",
  dob: "",
  location: "Mumbai, India",
  bio: "",
});

const defaultCompany = () => ({
  name: "TechnoBiz Systems",
  industry: "Manufacturing",
  size: "51–200",
  founded: "2014",
  gst: "27AAACT2727Q1ZV",
  pan: "AAACT2727Q",
  website: "https://technobiz.example.com",
  address: "Plot 14, Andheri MIDC, Mumbai 400093",
  registration: "U72200MH2014PTC256401",
});

export default function Settings() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [profile, setProfile] = useState(() => {
    try { return { ...defaultProfile(user), ...(JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}) }; }
    catch { return defaultProfile(user); }
  });
  const [company, setCompany] = useState(() => {
    try { return { ...defaultCompany(), ...(JSON.parse(localStorage.getItem(COMPANY_KEY)) || {}) }; }
    catch { return defaultCompany(); }
  });

  const [editProfile, setEditProfile] = useState(false);
  const [editCompany, setEditCompany] = useState(false);
  const [draftProfile, setDraftProfile] = useState(profile);
  const [draftCompany, setDraftCompany] = useState(company);

  const [notifs, setNotifs] = useState(() => {
    try { return { ...defaultNotifs(), ...(JSON.parse(localStorage.getItem(NOTIF_KEY)) || {}) }; }
    catch { return defaultNotifs(); }
  });
  const [workflow, setWorkflow] = useState(() => {
    try { return { ...defaultWorkflow(), ...(JSON.parse(localStorage.getItem(WORKFLOW_KEY)) || {}) }; }
    catch { return defaultWorkflow(); }
  });
  const persistNotifs = (v) => { setNotifs(v); localStorage.setItem(NOTIF_KEY, JSON.stringify(v)); };
  const persistWorkflow = (v) => { setWorkflow(v); localStorage.setItem(WORKFLOW_KEY, JSON.stringify(v)); };
  const toggleNotif = (topic, channel) => {
    const next = { ...notifs, [topic]: { ...notifs[topic], [channel]: !notifs[topic]?.[channel] } };
    persistNotifs(next);
  };
  const updateWorkflow = (patch) => {
    const next = { ...workflow, ...patch };
    persistWorkflow(next);
    toast.success("Preference updated");
  };

  useEffect(() => { setDraftProfile(profile); }, [profile]);
  useEffect(() => { setDraftCompany(company); }, [company]);

  const saveProfile = () => {
    if (!draftProfile.name.trim() || !draftProfile.email.trim()) {
      return toast.error("Name and email are required");
    }
    localStorage.setItem(PROFILE_KEY, JSON.stringify(draftProfile));
    setProfile(draftProfile); setEditProfile(false);
    toast.success("Profile updated");
  };

  const saveCompany = () => {
    if (!draftCompany.name.trim()) return toast.error("Company name is required");
    localStorage.setItem(COMPANY_KEY, JSON.stringify(draftCompany));
    setCompany(draftCompany); setEditCompany(false);
    toast.success("Company details updated");
  };

  const cancelProfile = () => { setDraftProfile(profile); setEditProfile(false); };
  const cancelCompany = () => { setDraftCompany(company); setEditCompany(false); };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Workspace, team, profile and preferences." />

      {/* Profile (My Profile) */}
      <Section title="My Profile"
        action={
          editProfile ? (
            <div className="flex items-center gap-2">
              <Btn variant="ghost" data-testid="profile-cancel" onClick={cancelProfile}><X className="inline h-3.5 w-3.5 mr-1" />Cancel</Btn>
              <Btn data-testid="profile-save" onClick={saveProfile}><Save className="inline h-3.5 w-3.5 mr-1" />Save</Btn>
            </div>
          ) : (
            <Btn variant="ghost" data-testid="profile-edit" onClick={()=>setEditProfile(true)}><Pencil className="inline h-3.5 w-3.5 mr-1" />Edit</Btn>
          )
        }>
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="flex-none">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center text-white font-display text-2xl font-semibold">
              {(editProfile ? draftProfile : profile)?.name?.split(" ").map(s=>s[0]).slice(0,2).join("") || "AM"}
            </div>
            <Pill tone="accent">{user?.role}</Pill>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field icon={UserIcon} label="Full name" value={editProfile ? draftProfile.name : profile.name} edit={editProfile}
              onChange={v=>setDraftProfile({...draftProfile, name: v})} testid="pf-name" />
            <Field icon={Mail} label="Email" value={editProfile ? draftProfile.email : profile.email} edit={editProfile}
              type="email" onChange={v=>setDraftProfile({...draftProfile, email: v})} testid="pf-email" />
            <Field icon={Phone} label="Phone" value={editProfile ? draftProfile.phone : profile.phone} edit={editProfile}
              placeholder="+91 98xxx xxxxx" onChange={v=>setDraftProfile({...draftProfile, phone: v})} testid="pf-phone" />
            <Field icon={Briefcase} label="Designation" value={editProfile ? draftProfile.designation : profile.designation} edit={editProfile}
              onChange={v=>setDraftProfile({...draftProfile, designation: v})} testid="pf-desig" />
            <Field icon={Briefcase} label="Department" value={editProfile ? draftProfile.department : profile.department} edit={editProfile}
              onChange={v=>setDraftProfile({...draftProfile, department: v})} testid="pf-dept" />
            <Field icon={CalIcon} label="Date of birth" value={editProfile ? draftProfile.dob : profile.dob} edit={editProfile}
              type="date" onChange={v=>setDraftProfile({...draftProfile, dob: v})} testid="pf-dob" />
            <Field icon={MapPin} label="Location" value={editProfile ? draftProfile.location : profile.location} edit={editProfile}
              onChange={v=>setDraftProfile({...draftProfile, location: v})} testid="pf-loc" full />
            <Field icon={FileText} label="Bio" value={editProfile ? draftProfile.bio : profile.bio} edit={editProfile}
              textarea placeholder="A short professional bio…" onChange={v=>setDraftProfile({...draftProfile, bio: v})} testid="pf-bio" full />
          </div>
        </div>
      </Section>

      {/* Company */}
      <Section title="Company Details"
        action={
          editCompany ? (
            <div className="flex items-center gap-2">
              <Btn variant="ghost" data-testid="company-cancel" onClick={cancelCompany}><X className="inline h-3.5 w-3.5 mr-1" />Cancel</Btn>
              <Btn data-testid="company-save" onClick={saveCompany}><Save className="inline h-3.5 w-3.5 mr-1" />Save</Btn>
            </div>
          ) : (
            <Btn variant="ghost" data-testid="company-edit" onClick={()=>setEditCompany(true)}><Pencil className="inline h-3.5 w-3.5 mr-1" />Edit</Btn>
          )
        }>
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="flex-none">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-600/15 border border-indigo-200/40 dark:border-indigo-500/25 grid place-items-center">
              <Building2 className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field icon={Building2} label="Company name" value={editCompany ? draftCompany.name : company.name} edit={editCompany}
              onChange={v=>setDraftCompany({...draftCompany, name: v})} testid="co-name" />
            <Field icon={Briefcase} label="Industry" value={editCompany ? draftCompany.industry : company.industry} edit={editCompany}
              onChange={v=>setDraftCompany({...draftCompany, industry: v})} testid="co-industry" />
            <Field icon={UserIcon} label="Company size" value={editCompany ? draftCompany.size : company.size} edit={editCompany}
              placeholder="11–50" onChange={v=>setDraftCompany({...draftCompany, size: v})} testid="co-size" />
            <Field icon={CalIcon} label="Founded" value={editCompany ? draftCompany.founded : company.founded} edit={editCompany}
              placeholder="2014" onChange={v=>setDraftCompany({...draftCompany, founded: v})} testid="co-founded" />
            <Field icon={FileText} label="GSTIN" value={editCompany ? draftCompany.gst : company.gst} edit={editCompany}
              placeholder="27AAACT2727Q1ZV" onChange={v=>setDraftCompany({...draftCompany, gst: v.toUpperCase()})} testid="co-gst" />
            <Field icon={FileText} label="PAN" value={editCompany ? draftCompany.pan : company.pan} edit={editCompany}
              placeholder="AAACT2727Q" onChange={v=>setDraftCompany({...draftCompany, pan: v.toUpperCase()})} testid="co-pan" />
            <Field icon={FileText} label="Registration #" value={editCompany ? draftCompany.registration : company.registration} edit={editCompany}
              onChange={v=>setDraftCompany({...draftCompany, registration: v})} testid="co-reg" />
            <Field icon={Globe} label="Website" value={editCompany ? draftCompany.website : company.website} edit={editCompany}
              placeholder="https://…" type="url" onChange={v=>setDraftCompany({...draftCompany, website: v})} testid="co-web" />
            <Field icon={MapPin} label="Registered address" value={editCompany ? draftCompany.address : company.address} edit={editCompany}
              textarea onChange={v=>setDraftCompany({...draftCompany, address: v})} testid="co-addr" full />
          </div>
        </div>
      </Section>

      <Section title="Notifications" action={<Pill tone="accent"><Bell className="inline h-3 w-3 mr-1" />Per-channel</Pill>}>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[520px]" data-testid="notif-table">
            <thead>
              <tr className="text-[10px] tracking-[0.12em] uppercase text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-indigo-500/15">
                <th className="text-left py-2.5 font-semibold w-1/2">Event</th>
                {CHANNELS.map(c => <th key={c.id} className="text-center py-2.5 font-semibold">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {NOTIF_TOPICS.map(t => (
                <tr key={t.id} className="border-b border-slate-100 dark:border-indigo-500/10 last:border-0">
                  <td className="py-3 pr-3">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.label}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{t.desc}</div>
                  </td>
                  {CHANNELS.map(c => {
                    const on = !!notifs[t.id]?.[c.id];
                    return (
                      <td key={c.id} className="py-3 text-center">
                        <button onClick={()=>toggleNotif(t.id, c.id)} data-testid={`notif-${t.id}-${c.id}`}
                          aria-pressed={on}
                          className={`inline-flex items-center h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${on ? "bg-[hsl(var(--m-accent))]" : "bg-slate-200 dark:bg-slate-700"}`}>
                          <span className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${on ? "translate-x-4" : "translate-x-0"}`} />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Workflow Preferences" action={<Pill tone="info"><Workflow className="inline h-3 w-3 mr-1" />Defaults</Pill>}>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500 dark:text-slate-400">
              Approval threshold (₹) — auto-route above this
            </label>
            <input type="number" min="0" step="1000" value={workflow.approval_threshold}
              onChange={e=>updateWorkflow({ approval_threshold: +e.target.value || 0 })}
              data-testid="wf-approval-threshold"
              className="w-full mt-1.5 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-mono-tab" />
          </div>
          <div>
            <label className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500 dark:text-slate-400">
              Default payment terms (days)
            </label>
            <input type="number" min="0" max="180" value={workflow.default_payment_terms}
              onChange={e=>updateWorkflow({ default_payment_terms: +e.target.value || 0 })}
              data-testid="wf-payment-terms"
              className="w-full mt-1.5 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-mono-tab" />
          </div>
          <div>
            <label className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500 dark:text-slate-400">
              Reminder cadence (days)
            </label>
            <input type="number" min="1" max="30" value={workflow.reminder_cadence_days}
              onChange={e=>updateWorkflow({ reminder_cadence_days: +e.target.value || 1 })}
              data-testid="wf-cadence"
              className="w-full mt-1.5 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-mono-tab" />
          </div>
          <div>
            <label className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500 dark:text-slate-400">
              Daily digest time
            </label>
            <input type="time" value={workflow.digest_time}
              onChange={e=>updateWorkflow({ digest_time: e.target.value })}
              data-testid="wf-digest-time"
              className="w-full mt-1.5 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-mono-tab" />
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          <ToggleRow label="Auto-remind overdue invoices"
            desc="Send AI-drafted polite reminder on the cadence above."
            on={workflow.auto_remind_overdue}
            onToggle={()=>updateWorkflow({ auto_remind_overdue: !workflow.auto_remind_overdue })}
            testid="wf-auto-remind" />
          <ToggleRow label="Auto-create draft POs for low stock"
            desc="Generate draft POs when SKUs cross reorder level (manual approval still required)."
            on={workflow.auto_po_low_stock}
            onToggle={()=>updateWorkflow({ auto_po_low_stock: !workflow.auto_po_low_stock })}
            testid="wf-auto-po" />
          <ToggleRow label="Weekly performance summary email"
            desc="Every Monday 9 AM — KPIs, anomalies, focus list."
            on={workflow.weekly_summary}
            onToggle={()=>updateWorkflow({ weekly_summary: !workflow.weekly_summary })}
            testid="wf-weekly" />
        </div>
      </Section>

      <Section title="Administration">
        <div className="grid sm:grid-cols-2 gap-3">
          <SettingsTile to="/settings/access-control" testid="settings-rbac"
            title="Access Control & Permissions"
            desc="Roles, modules, CRUD, approvals, data scope, security."
            icon={ShieldCheck} nav={nav} />
          <SettingsTile to="/settings/migration" testid="settings-migration"
            title="Data Migration"
            desc="Import from Tally, Zoho, QuickBooks, SAP, Marg, CSV, PDF."
            icon={Database} nav={nav} />
        </div>
      </Section>
    </div>
  );
}

const Field = ({ icon: Icon, label, value, edit, onChange, type = "text", placeholder, testid, textarea, full }) => (
  <div className={full ? "md:col-span-2" : ""}>
    <label className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
      <Icon className="h-3 w-3" /> {label}
    </label>
    {edit ? (
      textarea ? (
        <textarea value={value || ""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          data-testid={testid} rows={2}
          className="w-full mt-1.5 px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 resize-none" />
      ) : (
        <input type={type} value={value || ""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          data-testid={testid}
          className="w-full mt-1.5 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
      )
    ) : (
      <div className="mt-1.5 min-h-[40px] flex items-center text-sm text-slate-900 dark:text-slate-100 break-words">
        {value || <span className="text-slate-400 italic">Not set</span>}
      </div>
    )}
  </div>
);

const SettingsTile = ({ to, testid, title, desc, icon: Icon, nav }) => (
  <button onClick={()=>nav(to)} data-testid={testid}
    className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-indigo-300 dark:border-indigo-500/15 dark:hover:border-indigo-400/40 transition group">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="text-left">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
        <div className="text-[12px] text-slate-500 dark:text-slate-400">{desc}</div>
      </div>
    </div>
    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
  </button>
);

const ToggleRow = ({ label, desc, on, onToggle, testid }) => (
  <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-200 dark:border-indigo-500/15">
    <div className="min-w-0">
      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</div>
      <div className="text-[12px] text-slate-500 dark:text-slate-400">{desc}</div>
    </div>
    <button onClick={onToggle} data-testid={testid} aria-pressed={on}
      className={`flex-none inline-flex items-center h-5 w-9 rounded-full border-2 border-transparent transition-colors ${on ? "bg-[hsl(var(--m-accent))]" : "bg-slate-200 dark:bg-slate-700"}`}>
      <span className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  </div>
);
