import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Sparkles, ArrowRight } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("demo@technobiz.com");
  const [password, setPassword] = useState("demo123");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      nav("/dashboard");
    } catch (err) {
      toast.error("Invalid credentials");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="login-page">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{background: "linear-gradient(155deg, #1e1b4b 0%, #4c1d95 50%, #6d28d9 100%)"}}>
        <div className="absolute -top-40 -right-40 h-[480px] w-[480px] rounded-full opacity-30 blur-3xl"
          style={{background: "radial-gradient(circle, #c4b5fd, transparent 60%)"}} />
        <div className="absolute -bottom-32 -left-20 h-[420px] w-[420px] rounded-full opacity-20 blur-3xl"
          style={{background: "radial-gradient(circle, #818cf8, transparent 60%)"}} />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur grid place-items-center border border-white/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-display text-base font-semibold text-white">TechnoBiz</div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-white/60 -mt-0.5">Smart ERP</div>
            </div>
          </div>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-4xl xl:text-5xl font-semibold text-white leading-[1.1] tracking-tight">
            The proactive ERP that runs your business while you focus on growth.
          </h1>
          <p className="mt-6 text-white/70 text-[15px] leading-relaxed">
            Finance + Inventory in one luminous workspace. Smart alerts, AI-suggested actions, and zero-clutter workflows.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[["48", "SKUs"], ["₹62L", "Revenue"], ["98%", "On-time"]].map(([v,l]) => (
              <div key={l} className="rounded-xl border border-white/15 bg-white/5 backdrop-blur px-4 py-3">
                <div className="font-display text-xl font-semibold text-white">{v}</div>
                <div className="text-[10px] tracking-[0.18em] uppercase text-white/50">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-[11px] text-white/40">© 2026 TechnoBiz Systems</div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"}}>
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-display text-base font-semibold text-slate-900">TechnoBiz</div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-slate-400 -mt-0.5">Smart ERP</div>
            </div>
          </div>

          <h2 className="font-display text-3xl font-semibold text-slate-900 tracking-tight">Sign in</h2>
          <p className="text-slate-500 mt-2 text-sm">Continue to your operations workspace</p>

          <form onSubmit={submit} className="mt-8 space-y-4" data-testid="login-form">
            <div>
              <label className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500">Email</label>
              <input type="email" data-testid="login-email" value={email} onChange={e=>setEmail(e.target.value)}
                className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition" required />
            </div>
            <div>
              <label className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500">Password</label>
              <input type="password" data-testid="login-password" value={password} onChange={e=>setPassword(e.target.value)}
                className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition" required />
            </div>
            <button type="submit" disabled={busy} data-testid="login-submit"
              className="w-full h-11 rounded-xl btn-primary text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? "Signing in…" : <>Sign in <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="mt-6 p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-[12px] text-slate-500">
            <div className="font-medium text-slate-700">Demo credentials</div>
            <div>demo@technobiz.com · demo123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
