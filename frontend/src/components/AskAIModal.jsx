import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { X, Sparkles, Send, Loader2 } from "lucide-react";

const SUGGESTIONS = [
  { label: "What's my biggest cash risk this week?", topic: "cash_flow" },
  { label: "Which SKU should I reorder first?", topic: "low_stock" },
  { label: "Where can I cut costs without hurting growth?", topic: "expense_review" },
  { label: "Which client should I chase for payment?", topic: "overdue" },
  { label: "Forecast next month's net profit", topic: "forecast" },
];

export default function AskAIModal({ open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef(null);

  useEffect(() => {
    if (open) {
      setMessages([]);
      setInput("");
    }
  }, [open]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text, topic = "business_advice") => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const r = await api.post("/insights/data-query", { query: q });
      setMessages(m => [...m, { role: "ai", text: r.data.answer, used_data: r.data.used_data }]);
    } catch {
      setMessages(m => [...m, { role: "ai", text: "• Unable to reach the AI right now\n• Try again in a moment\n• Or open the Smart Alerts on the dashboard for offline recommendations" }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end md:place-items-center p-0 md:p-4 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} data-testid="ai-modal">
      <div onClick={e=>e.stopPropagation()}
        className="glass-strong w-full md:w-[640px] md:max-w-[92vw] h-[80vh] md:h-[640px] md:rounded-2xl rounded-t-3xl flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-5 h-14 border-b border-slate-200/60 dark:border-indigo-500/15">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <div className="font-display font-semibold text-slate-900 dark:text-slate-100 text-[15px]">TechnoBiz AI</div>
              <div className="text-[10px] tracking-[0.12em] uppercase text-slate-400 dark:text-slate-500">Powered by Claude Sonnet 4.5</div>
            </div>
          </div>
          <button onClick={onClose} data-testid="ai-modal-close" className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </header>

        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="text-center py-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center mx-auto mb-3">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">How can I help you run the business today?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ask anything about your finance, inventory or operations.</p>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] tracking-[0.18em] uppercase font-semibold text-slate-400 dark:text-slate-500 px-1">Try asking</div>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} data-testid={`ai-suggestion-${i}`}
                    onClick={() => send(s.label, s.topic)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-indigo-500/20 bg-white/70 dark:bg-slate-900/40 hover:border-indigo-300 dark:hover:border-indigo-400/40 hover:shadow-sm transition text-sm text-slate-700 dark:text-slate-200">
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div data-testid={`ai-msg-${m.role}`} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line leading-relaxed ${
                m.role === "user"
                  ? "btn-primary text-white"
                  : "bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-indigo-500/20 text-slate-800 dark:text-slate-100"
              }`}>
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 px-1">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              Thinking…
            </div>
          )}
        </div>

        <form onSubmit={(e)=>{e.preventDefault(); send();}} className="border-t border-slate-200/60 dark:border-indigo-500/15 p-3 flex items-center gap-2" data-testid="ai-form">
          <input data-testid="ai-input" value={input} onChange={e=>setInput(e.target.value)}
            placeholder="Ask anything about your business…"
            className="flex-1 h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
          <button type="submit" disabled={loading || !input.trim()} data-testid="ai-send"
            className="h-11 w-11 grid place-items-center rounded-xl btn-primary cta-glow disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
