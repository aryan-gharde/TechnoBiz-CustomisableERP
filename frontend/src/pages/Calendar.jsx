import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Section, Pill, Btn } from "@/components/Primitives";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Receipt, CreditCard, ClipboardList, Calculator,
  AlertTriangle, CheckSquare, Filter, X, ExternalLink, Plus, Pencil, Trash2,
  CalendarPlus, Save, Star
} from "lucide-react";

const TYPES = [
  { id: "invoice",  label: "Invoices",  icon: Receipt,        color: "#6366f1" },
  { id: "payable",  label: "Payables",  icon: CreditCard,     color: "#0ea5e9" },
  { id: "approval", label: "Approvals", icon: CheckSquare,    color: "#f59e0b" },
  { id: "po",       label: "Purchase Orders", icon: ClipboardList, color: "#a855f7" },
  { id: "gst",      label: "GST",       icon: Calculator,     color: "#10b981" },
  { id: "stock",    label: "Stock",     icon: AlertTriangle,  color: "#f43f5e" },
  { id: "custom",   label: "Custom",    icon: Star,           color: "#ec4899" },
];

const TYPE_BY_ID = Object.fromEntries(TYPES.map(t => [t.id, t]));
const EDITABLE_TYPES = new Set(["custom", "invoice", "payable", "approval", "po"]);
const STATUS_OPTIONS = ["scheduled", "pending", "draft", "approved", "paid", "overdue", "received", "alert", "rescheduled", "completed"];
const SEVERITY_OPTIONS = ["info", "warning", "danger"];

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const startOfWeek = (d) => { const n = new Date(d); n.setDate(n.getDate() - n.getDay()); n.setHours(0,0,0,0); return n; };
const fmtKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

export default function Calendar() {
  const nav = useNavigate();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(() => Object.fromEntries(TYPES.map(t => [t.id, true])));
  const [selectedDay, setSelectedDay] = useState(null);
  const [editing, setEditing] = useState(null); // event being edited
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState(null);

  const monthStart = useMemo(() => startOfMonth(cursor), [cursor]);
  const monthEnd = useMemo(() => endOfMonth(cursor), [cursor]);
  const gridStart = useMemo(() => startOfWeek(monthStart), [monthStart]);

  const days = useMemo(() => {
    const arr = [];
    const cur = new Date(gridStart);
    for (let i = 0; i < 42; i++) {
      arr.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return arr;
  }, [gridStart]);

  const load = async () => {
    setLoading(true);
    try {
      const fromDate = fmtKey(gridStart);
      const toDate = fmtKey(days[41] || monthEnd);
      const r = await api.get(`/calendar/events?date_from=${fromDate}&date_to=${toDate}`);
      setEvents(r.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [cursor]);

  const filtered = events.filter(e => enabled[e.type]);
  const eventsByDay = useMemo(() => {
    const m = {};
    filtered.forEach(e => { (m[e.date] = m[e.date] || []).push(e); });
    return m;
  }, [filtered]);

  const today = new Date();
  const todayKey = fmtKey(today);

  const counts = useMemo(() => {
    const m = Object.fromEntries(TYPES.map(t => [t.id, 0]));
    events.forEach(e => { m[e.type] = (m[e.type] || 0) + 1; });
    return m;
  }, [events]);

  const monthLabel = cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const upcoming = useMemo(() =>
    filtered.filter(e => e.date >= todayKey).slice(0, 12),
    [filtered, todayKey]);

  const dayEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

  const onCreateClick = (defaultDate) => {
    setCreateDefaultDate(defaultDate || todayKey);
    setCreateOpen(true);
  };

  const handleCreate = async (payload) => {
    await api.post("/calendar/events", payload);
    toast.success("Event created");
    setCreateOpen(false);
    load();
  };

  const handleSaveEdit = async (eventId, patch) => {
    await api.put(`/calendar/events/${eventId}`, patch);
    toast.success("Event updated");
    setEditing(null);
    load();
  };

  const handleDelete = async (event) => {
    const isCustom = event.type === "custom";
    const msg = isCustom
      ? `Delete "${event.title}"?`
      : `Remove "${event.title}" from calendar?`;
    if (!window.confirm(msg)) return;
    await api.delete(`/calendar/events/${event.id}`);
    toast.success(isCustom ? "Event deleted" : "Removed from calendar");
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-6" data-testid="calendar-page">
      <PageHeader title="Calendar" subtitle="Unified view — payments, invoices, approvals, POs, GST and custom events. Click any event to edit."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Btn variant="ghost" data-testid="cal-prev" onClick={()=>setCursor(c => new Date(c.getFullYear(), c.getMonth()-1, 1))}>
              <ChevronLeft className="inline h-4 w-4" />
            </Btn>
            <Btn variant="ghost" data-testid="cal-today" onClick={()=>setCursor(startOfMonth(new Date()))}>Today</Btn>
            <Btn variant="ghost" data-testid="cal-next" onClick={()=>setCursor(c => new Date(c.getFullYear(), c.getMonth()+1, 1))}>
              <ChevronRight className="inline h-4 w-4" />
            </Btn>
            <Btn data-testid="cal-add" onClick={()=>onCreateClick(null)}>
              <Plus className="inline h-3.5 w-3.5 mr-1" />Add Event
            </Btn>
          </div>
        } />

      <Section title={monthLabel} action={
        <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
          <Filter className="h-3 w-3" /> Filters
        </div>
      }>
        <div className="flex flex-wrap items-center gap-2 mb-5" data-testid="cal-filters">
          {TYPES.map(t => {
            const on = !!enabled[t.id];
            return (
              <button key={t.id} onClick={()=>setEnabled(s => ({...s, [t.id]: !s[t.id]}))}
                data-testid={`cal-filter-${t.id}`}
                className={`inline-flex items-center gap-2 h-8 px-3 rounded-full border text-xs font-medium transition ${on
                  ? "border-transparent text-white shadow-sm"
                  : "border-slate-200 dark:border-indigo-500/15 bg-white/60 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400"}`}
                style={on ? { backgroundColor: t.color } : {}}>
                <t.icon className="h-3.5 w-3.5" /> {t.label}
                <span className={`text-[10px] font-mono-tab px-1.5 py-0.5 rounded-full ${on ? "bg-white/25" : "bg-slate-100 dark:bg-slate-800/60"}`}>{counts[t.id] || 0}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-400 dark:text-slate-500 text-center py-1.5">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5" data-testid="cal-grid">
          {days.map((d, i) => {
            const key = fmtKey(d);
            const isCurMonth = d.getMonth() === cursor.getMonth();
            const isToday = key === todayKey;
            const isSelected = key === selectedDay;
            const dayEv = eventsByDay[key] || [];
            return (
              <div key={i}
                className={`group relative rounded-xl p-2 min-h-[88px] border transition flex flex-col gap-1
                  ${isSelected ? "border-[hsl(var(--m-accent))] bg-[hsla(var(--m-accent),0.08)]" :
                    isCurMonth ? "border-slate-200 dark:border-indigo-500/15 bg-white/60 dark:bg-slate-900/40 hover:border-indigo-300" :
                    "border-transparent bg-slate-50/40 dark:bg-slate-900/20 text-slate-400"}
                `}>
                <button type="button" onClick={()=>setSelectedDay(key)}
                  data-testid={`cal-day-${key}`}
                  className="flex items-center justify-between text-left">
                  <span className={`text-xs font-mono-tab ${isToday ? "h-6 w-6 grid place-items-center rounded-full bg-[hsl(var(--m-accent))] text-white font-bold" : "font-semibold text-slate-700 dark:text-slate-200"} ${!isCurMonth ? "text-slate-400" : ""}`}>
                    {d.getDate()}
                  </span>
                  {dayEv.length > 0 && (
                    <span className="text-[9px] font-mono-tab text-slate-400 dark:text-slate-500">{dayEv.length}</span>
                  )}
                </button>
                <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                  {dayEv.slice(0, 3).map(e => {
                    const t = TYPE_BY_ID[e.type] || TYPE_BY_ID.custom;
                    return (
                      <button key={e.id} type="button" onClick={()=>setEditing(e)}
                        data-testid={`cal-pill-${e.id}`}
                        className="text-[10px] leading-tight rounded px-1.5 py-0.5 truncate text-left hover:opacity-80"
                        style={{ background: `${t.color}1a`, color: t.color, borderLeft: `2px solid ${t.color}` }}>
                        {e.title}
                      </button>
                    );
                  })}
                  {dayEv.length > 3 && (
                    <button type="button" onClick={()=>setSelectedDay(key)}
                      className="text-[10px] text-slate-400 dark:text-slate-500 px-1.5 text-left hover:underline">
                      +{dayEv.length - 3} more
                    </button>
                  )}
                </div>
                {isCurMonth && (
                  <button type="button" onClick={()=>onCreateClick(key)}
                    data-testid={`cal-day-add-${key}`}
                    className="absolute bottom-1 right-1 h-5 w-5 grid place-items-center rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-indigo-500/20 text-slate-400 hover:text-[hsl(var(--m-accent))] hover:border-[hsl(var(--m-accent))] transition opacity-0 group-hover:opacity-100"
                    aria-label="Add event on this day">
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Upcoming Events" action={<Pill tone="accent">{upcoming.length}</Pill>}>
          {upcoming.length === 0 ? (
            <div className="text-center text-sm text-slate-400 py-8">No upcoming events.</div>
          ) : (
            <div className="space-y-2">
              {upcoming.map(e => (
                <EventRow key={e.id} ev={e} onEdit={()=>setEditing(e)} onOpen={() => nav(e.link)} />
              ))}
            </div>
          )}
        </Section>

        <Section title={selectedDay ? `Events on ${new Date(selectedDay).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}` : "Day Details"}
          action={
            selectedDay ? (
              <div className="flex items-center gap-2">
                <button onClick={()=>onCreateClick(selectedDay)} data-testid="cal-day-create"
                  className="inline-flex items-center gap-1 text-[11px] text-[hsl(var(--m-accent))] hover:underline">
                  <CalendarPlus className="h-3 w-3" /> Add here
                </button>
                <button onClick={()=>setSelectedDay(null)} data-testid="cal-clear-day"
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">
                  <X className="h-3 w-3" /> Clear
                </button>
              </div>
            ) : null
          }>
          {!selectedDay ? (
            <div className="text-center text-sm text-slate-400 py-8">Select a day to see its events.</div>
          ) : dayEvents.length === 0 ? (
            <div className="text-center text-sm text-slate-400 py-8">No events on this day.</div>
          ) : (
            <div className="space-y-2">
              {dayEvents.map(e => (
                <EventRow key={e.id} ev={e} onEdit={()=>setEditing(e)} onOpen={() => nav(e.link)} />
              ))}
            </div>
          )}
        </Section>
      </div>

      {editing && (
        <EventEditModal event={editing} onClose={()=>setEditing(null)}
          onSave={(patch)=>handleSaveEdit(editing.id, patch)}
          onDelete={()=>handleDelete(editing)}
          onOpen={()=>nav(editing.link)} />
      )}
      {createOpen && (
        <EventCreateModal defaultDate={createDefaultDate} onClose={()=>setCreateOpen(false)}
          onCreate={handleCreate} />
      )}
    </div>
  );
}

const EventRow = ({ ev, onEdit, onOpen }) => {
  const t = TYPE_BY_ID[ev.type] || TYPES[0];
  return (
    <div data-testid={`cal-event-${ev.id}`}
      className="rounded-xl border border-slate-200 dark:border-indigo-500/15 hover:border-indigo-300 dark:hover:border-indigo-400/40 p-3 transition group flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg grid place-items-center flex-none"
        style={{ background: `${t.color}1f`, color: t.color }}>
        <t.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </div>
      <button type="button" onClick={onEdit} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{ev.title}</span>
          <Pill tone={ev.severity === "danger" ? "danger" : ev.severity === "warning" ? "warning" : "info"}>
            {ev.status}
          </Pill>
        </div>
        <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
          <span>{new Date(ev.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
          {ev.subtitle && <span>· {ev.subtitle}</span>}
          {ev.amount > 0 && <span className="font-mono-tab font-semibold text-slate-700 dark:text-slate-200">· {formatINR(ev.amount)}</span>}
        </div>
      </button>
      <div className="flex items-center gap-1 flex-none">
        {EDITABLE_TYPES.has(ev.type) && (
          <button type="button" onClick={onEdit} data-testid={`cal-event-edit-${ev.id}`}
            className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-[hsl(var(--m-accent))]">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {ev.link && ev.link !== "/calendar" && (
          <button type="button" onClick={onOpen} data-testid={`cal-event-open-${ev.id}`}
            className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-300 hover:text-indigo-500"
            aria-label="Open in module">
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

const inpCls = "w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
const labelCls = "text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500 dark:text-slate-400";

const EventEditModal = ({ event, onClose, onSave, onDelete, onOpen }) => {
  const editable = EDITABLE_TYPES.has(event.type);
  const [date, setDate] = useState(event.date);
  const [title, setTitle] = useState(event.title);
  const [subtitle, setSubtitle] = useState(event.subtitle || "");
  const [amount, setAmount] = useState(String(event.amount || 0));
  const [status, setStatus] = useState(event.status || "scheduled");
  const [severity, setSeverity] = useState(event.severity || "info");
  const [saving, setSaving] = useState(false);
  const t = TYPE_BY_ID[event.type] || TYPE_BY_ID.custom;

  const submit = async (e) => {
    e.preventDefault();
    if (!editable) return;
    setSaving(true);
    try {
      await onSave({ date, title, subtitle, amount: +amount || 0, status, severity });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}>
      <form onSubmit={submit} onClick={e=>e.stopPropagation()} data-testid="event-edit-modal"
        className="modal-panel bg-white rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-indigo-500/20 shadow-xl">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl grid place-items-center flex-none" style={{ background: `${t.color}1f`, color: t.color }}>
              <t.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-400">{t.label}</div>
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                {editable ? "Edit Event" : "Event Details"}
              </h3>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/40">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!editable && (
          <div className="mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-900/15 text-[12.5px] text-amber-700 dark:text-amber-200">
            This event type ({event.type}) is auto-computed and cannot be edited directly.
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className={labelCls}>Title</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} disabled={!editable}
              data-testid="evt-title" className={`${inpCls} mt-1.5`} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} disabled={!editable}
                data-testid="evt-date" className={`${inpCls} mt-1.5 font-mono-tab`} required />
            </div>
            <div>
              <label className={labelCls}>Amount (₹)</label>
              <input type="number" min="0" step="100" value={amount} onChange={e=>setAmount(e.target.value)} disabled={!editable}
                data-testid="evt-amount" className={`${inpCls} mt-1.5 font-mono-tab`} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Subtitle / Notes</label>
            <input value={subtitle} onChange={e=>setSubtitle(e.target.value)} disabled={!editable}
              data-testid="evt-subtitle" className={`${inpCls} mt-1.5`} placeholder="Optional context" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <select value={status} onChange={e=>setStatus(e.target.value)} disabled={!editable}
                data-testid="evt-status" className={`${inpCls} mt-1.5`}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Severity</label>
              <select value={severity} onChange={e=>setSeverity(e.target.value)} disabled={!editable}
                data-testid="evt-severity" className={`${inpCls} mt-1.5`}>
                {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-5">
          {editable && (
            <Btn type="submit" data-testid="evt-save" disabled={saving}>
              <Save className="inline h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save Changes"}
            </Btn>
          )}
          {event.link && event.link !== "/calendar" && (
            <Btn type="button" variant="ghost" data-testid="evt-open" onClick={onOpen}>
              <ExternalLink className="inline h-3.5 w-3.5 mr-1" />Open in module
            </Btn>
          )}
          {editable && (
            <button type="button" onClick={onDelete} data-testid="evt-delete"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition ml-auto">
              <Trash2 className="h-3.5 w-3.5" /> {event.type === "custom" ? "Delete" : "Remove from calendar"}
            </button>
          )}
          {!editable && (
            <Btn type="button" variant="ghost" onClick={onClose} className="ml-auto">Close</Btn>
          )}
        </div>
      </form>
    </div>
  );
};

const EventCreateModal = ({ defaultDate, onClose, onCreate }) => {
  const [date, setDate] = useState(defaultDate || fmtKey(new Date()));
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [amount, setAmount] = useState("0");
  const [status, setStatus] = useState("scheduled");
  const [severity, setSeverity] = useState("info");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required");
    setSaving(true);
    try {
      await onCreate({ title: title.trim(), date, subtitle, amount: +amount || 0, status, severity, type: "custom" });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}>
      <form onSubmit={submit} onClick={e=>e.stopPropagation()} data-testid="event-create-modal"
        className="modal-panel bg-white rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-indigo-500/20 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">New Calendar Event</h3>
          <button type="button" onClick={onClose} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/40">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Title</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} required autoFocus
              data-testid="evt-new-title" placeholder="e.g. Quarterly board meeting"
              className={`${inpCls} mt-1.5`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} required
                data-testid="evt-new-date" className={`${inpCls} mt-1.5 font-mono-tab`} />
            </div>
            <div>
              <label className={labelCls}>Amount (₹) — optional</label>
              <input type="number" min="0" step="100" value={amount} onChange={e=>setAmount(e.target.value)}
                data-testid="evt-new-amount" className={`${inpCls} mt-1.5 font-mono-tab`} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <input value={subtitle} onChange={e=>setSubtitle(e.target.value)}
              data-testid="evt-new-subtitle" placeholder="Optional"
              className={`${inpCls} mt-1.5`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <select value={status} onChange={e=>setStatus(e.target.value)}
                data-testid="evt-new-status" className={`${inpCls} mt-1.5`}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Severity</label>
              <select value={severity} onChange={e=>setSeverity(e.target.value)}
                data-testid="evt-new-severity" className={`${inpCls} mt-1.5`}>
                {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Btn type="submit" data-testid="evt-new-submit" className="flex-1" disabled={saving}>
            {saving ? "Creating…" : "Create Event"}
          </Btn>
          <Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn>
        </div>
      </form>
    </div>
  );
};
