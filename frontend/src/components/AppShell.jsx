import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import TopNav from "@/components/TopNav";
import Sidebar from "@/components/Sidebar";
import QuickAddFab from "@/components/QuickAddFab";
import BottomNav from "@/components/BottomNav";

const moduleFromPath = (p) => {
  if (p.startsWith("/inventory")) return "inventory";
  if (p.startsWith("/finance")) return "finance";
  if (p.startsWith("/reports")) return "reports";
  if (p.startsWith("/calendar")) return "calendar";
  if (p.startsWith("/settings")) return "settings";
  return "dashboard";
};

export default function AppShell() {
  const location = useLocation();
  const mod = moduleFromPath(location.pathname);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-module", mod);
  }, [mod]);

  return (
    <div className="min-h-screen flex flex-col" data-testid="app-shell">
      <TopNav module={mod} />
      <div className="flex flex-1 min-h-0">
        <Sidebar module={mod} collapsed={collapsed} onToggle={() => setCollapsed(v=>!v)} />
        <main className="flex-1 min-w-0 overflow-x-hidden pb-20 md:pb-0">
          <div key={location.pathname} className="fade-up px-4 md:px-6 lg:px-10 py-6 md:py-8 max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <QuickAddFab />
      <BottomNav />
    </div>
  );
}
