export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-7">
    <div className="min-w-0">
      <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">{title}</h1>
      {subtitle && <p className="text-slate-500 text-sm mt-1.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

export const Pill = ({ children, tone = "default" }) => {
  const tones = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    default: "bg-slate-50 text-slate-600 border-slate-200",
    accent: "bg-[hsla(var(--m-accent),0.1)] text-[hsl(var(--m-accent))] border-[hsla(var(--m-accent),0.25)]",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${tones[tone]}`}>{children}</span>;
};

export const Section = ({ title, action, children, glass = false, className = "" }) => (
  <section className={`${glass ? "glass-strong" : "card-premium"} rounded-2xl p-5 ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-display text-[15px] font-semibold text-slate-900">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

export const Btn = ({ children, variant = "primary", className = "", ...props }) => {
  const styles = {
    primary: "btn-primary cta-glow",
    ghost: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
    soft: "bg-[hsla(var(--m-accent),0.1)] text-[hsl(var(--m-accent))] hover:bg-[hsla(var(--m-accent),0.15)]",
  };
  return (
    <button {...props} className={`inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-medium transition active:scale-95 whitespace-nowrap leading-none ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
};

export const EmptyState = ({ title, hint }) => (
  <div className="text-center py-12">
    <div className="text-sm font-medium text-slate-700">{title}</div>
    {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
  </div>
);
