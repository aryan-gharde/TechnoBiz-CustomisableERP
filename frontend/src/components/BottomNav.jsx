import { NavLink } from "react-router-dom";
import { LayoutDashboard, Package, Receipt, Calendar as CalIcon, Settings as SettingsIcon } from "lucide-react";

const tabs = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { to: "/inventory", icon: Package, label: "Stock" },
  { to: "/finance", icon: Receipt, label: "Finance" },
  { to: "/calendar", icon: CalIcon, label: "Calendar" },
  { to: "/settings", icon: SettingsIcon, label: "Settings" },
];

export default function BottomNav() {
  return (
    <nav data-testid="bottom-nav"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 glass-strong border-t border-white/40 dark:border-indigo-500/20 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
      <div className="grid grid-cols-5 gap-1">
        {tabs.map(t => (
          <NavLink key={t.to} to={t.to}
            end={t.to === "/dashboard"}
            data-testid={`bottom-${t.label.toLowerCase()}`}
            className={({isActive}) => `flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10px] font-medium transition ${
              isActive ? "text-[hsl(var(--m-accent))] bg-[hsla(var(--m-accent),0.10)]" : "text-slate-500 dark:text-slate-400"
            }`}>
            <t.icon className="h-5 w-5" strokeWidth={1.8} />
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
