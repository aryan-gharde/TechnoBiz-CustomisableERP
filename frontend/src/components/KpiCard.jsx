import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatINR } from "@/lib/api";

export default function KpiCard({ id, label, value, trend, spark, icon: Icon, isCurrency = true, isCount = false, onClick, glass = false }) {
  const up = trend >= 0;
  return (
    <button onClick={onClick} data-testid={`kpi-${id}`}
      className={`group text-left ${glass ? "glass-strong" : "card-premium"} rounded-2xl p-5 w-full hover:-translate-y-1 transition-all duration-300 cta-glow`}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-9 w-9 rounded-xl grid place-items-center" style={{background: "hsla(var(--m-accent),0.12)", color: "hsl(var(--m-accent))"}}>
          {Icon && <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />}
        </div>
        <div className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500">{label}</div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="font-display text-3xl font-semibold text-slate-900 font-mono-tab">
            {isCount ? value : formatINR(value)}
          </div>
          <div className={`mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium ${up ? "text-emerald-600" : "text-rose-600"}`}>
            {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {up ? "+" : ""}{trend}% <span className="text-slate-400 font-normal">vs last</span>
          </div>
        </div>
        <div className="w-24 h-12">
          <ResponsiveContainer>
            <AreaChart data={(spark||[]).map((v,i)=>({i, v}))}>
              <defs>
                <linearGradient id={`g-${id}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--m-accent))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(var(--m-accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="hsl(var(--m-accent))" strokeWidth={1.8} fill={`url(#g-${id})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </button>
  );
}
