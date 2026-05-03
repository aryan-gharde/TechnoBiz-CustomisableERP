import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, Bell, Plus, ChevronDown, LogOut, User, Settings, Sparkles, Sun, Moon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import CommandPalette from "@/components/CommandPalette";
import NotificationDrawer from "@/components/NotificationDrawer";
import AskAIModal from "@/components/AskAIModal";
import { api } from "@/lib/api";

const tabs = [
  { id: "dashboard", label: "Dashboard", to: "/dashboard" },
  { id: "inventory", label: "Inventory", to: "/inventory" },
  { id: "finance", label: "Finance", to: "/finance" },
  { id: "calendar", label: "Calendar", to: "/calendar" },
  { id: "reports", label: "Reports", to: "/reports" },
  { id: "settings", label: "Settings", to: "/settings" },
];

export default function TopNav({ module }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.get("/notifications").then(r => setUnread(r.data.filter(n=>!n.read).length)).catch(()=>{});
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(true); }
    };
    const onAiOpen = () => setAiOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("tb:open-ai", onAiOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("tb:open-ai", onAiOpen); };
  }, []);

  return (
    <>
      <header className="glass sticky top-0 z-40 border-b border-white/40 dark:border-indigo-500/15" data-testid="top-nav">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 h-16 flex items-center gap-4">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5" data-testid="logo">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                 style={{background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"}}>
              <Sparkles className="h-5 w-5 text-white" strokeWidth={1.8} />
            </div>
            <div className="leading-tight">
              <div className="font-display text-[15px] font-semibold text-slate-900 dark:text-slate-100">TechnoBiz</div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-slate-400 dark:text-slate-500 -mt-0.5">Smart ERP</div>
            </div>
          </Link>

          {/* Module tabs */}
          <nav className="hidden md:flex items-center gap-1 ml-6" data-testid="module-tabs">
            {tabs.map(t => (
              <NavLink key={t.id} to={t.to}
                end={t.id === "dashboard"}
                data-testid={`tab-${t.id}`}
                className={({isActive}) =>
                  `px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isActive || module === t.id
                      ? "bg-white dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/80 dark:border-indigo-500/20"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/40"
                  }`
                }>
                {t.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Search */}
          <button onClick={() => setCmdOpen(true)} data-testid="global-search-btn"
            className="hidden md:inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 dark:border-indigo-500/20 bg-white/70 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/60 text-sm text-slate-500 dark:text-slate-400 transition w-64 leading-none">
            <Search className="h-4 w-4 flex-none" />
            <span className="flex-1 text-left">Search anything…</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-mono leading-none">⌘K</kbd>
          </button>

          {/* Theme toggle */}
          <button onClick={toggle} data-testid="theme-toggle"
            className="h-9 w-9 grid place-items-center rounded-xl border border-slate-200 dark:border-indigo-500/20 bg-white/70 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/60 transition">
            {theme === "dark" ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </button>

          {/* Notifications */}
          <button onClick={() => setNotifOpen(true)} data-testid="notif-btn"
            className="relative h-9 w-9 grid place-items-center rounded-xl border border-slate-200 dark:border-indigo-500/20 bg-white/70 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/60 transition">
            <Bell className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold grid place-items-center">{unread}</span>
            )}
          </button>

          {/* Quick add */}
          <button data-testid="quick-add-btn"
            onClick={() => window.dispatchEvent(new CustomEvent("tb:quick-add"))}
            className="hidden md:inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl btn-primary cta-glow text-sm font-medium whitespace-nowrap leading-none">
            <Plus className="h-4 w-4 flex-none" /> Quick Add
          </button>

          {/* Profile */}
          <div className="relative">
            <button data-testid="profile-btn" onClick={() => setProfileOpen(v=>!v)}
              className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-xl border border-slate-200 dark:border-indigo-500/20 bg-white/70 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/60 transition">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center text-white text-xs font-semibold">
                {user?.name?.split(" ").map(s=>s[0]).slice(0,2).join("") || "AM"}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-60 glass-strong rounded-xl p-2 shadow-xl" data-testid="profile-menu">
                <div className="px-3 py-2 border-b border-slate-200/60 dark:border-indigo-500/15">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</div>
                </div>
                <button onClick={()=>{setProfileOpen(false); navigate("/settings");}}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 rounded-lg" data-testid="menu-profile">
                  <User className="h-4 w-4" /> Profile
                </button>
                <button onClick={()=>{setProfileOpen(false); navigate("/settings");}}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 rounded-lg" data-testid="menu-settings">
                  <Settings className="h-4 w-4" /> Settings
                </button>
                <button onClick={()=>{logout(); navigate("/login");}}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg" data-testid="menu-logout">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
      <AskAIModal open={aiOpen} onClose={() => setAiOpen(false)} />
    </>
  );
}
