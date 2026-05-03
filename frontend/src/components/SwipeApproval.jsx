import { useRef, useState } from "react";
import { Check, X } from "lucide-react";

/**
 * SwipeApproval — drag/swipe horizontally on touch or pointer.
 * Right swipe (>= threshold) → onApprove, left swipe → onReject.
 * Falls back to clear approve/reject buttons for desktop.
 */
export default function SwipeApproval({ children, onApprove, onReject, testId }) {
  const startX = useRef(null);
  const [dx, setDx] = useState(0);
  const [done, setDone] = useState(null);
  const THRESHOLD = 80;

  const begin = (x) => { startX.current = x; setDx(0); };
  const move = (x) => {
    if (startX.current === null) return;
    setDx(Math.max(-160, Math.min(160, x - startX.current)));
  };
  const end = () => {
    if (startX.current === null) return;
    if (dx > THRESHOLD) { setDone("approve"); setTimeout(() => onApprove?.(), 180); }
    else if (dx < -THRESHOLD) { setDone("reject"); setTimeout(() => onReject?.(), 180); }
    else setDx(0);
    startX.current = null;
  };

  const bg = dx > 20 ? "bg-emerald-50 dark:bg-emerald-900/20" :
             dx < -20 ? "bg-rose-50 dark:bg-rose-900/20" : "";

  return (
    <div className={`relative rounded-xl overflow-hidden transition-colors ${bg}`} data-testid={testId}>
      {/* Action hints */}
      <div className="absolute inset-y-0 left-3 flex items-center gap-1.5 text-emerald-600 text-xs font-medium pointer-events-none"
        style={{ opacity: Math.max(0, Math.min(1, dx / 80)) }}>
        <Check className="h-4 w-4" /> Approve
      </div>
      <div className="absolute inset-y-0 right-3 flex items-center gap-1.5 text-rose-600 text-xs font-medium pointer-events-none"
        style={{ opacity: Math.max(0, Math.min(1, -dx / 80)) }}>
        Reject <X className="h-4 w-4" />
      </div>
      <div
        onTouchStart={(e) => begin(e.touches[0].clientX)}
        onTouchMove={(e) => move(e.touches[0].clientX)}
        onTouchEnd={end}
        onPointerDown={(e) => { if (e.pointerType !== "mouse") begin(e.clientX); }}
        onPointerMove={(e) => { if (startX.current !== null) move(e.clientX); }}
        onPointerUp={end}
        onPointerCancel={end}
        style={{
          transform: `translateX(${done ? (done === "approve" ? 400 : -400) : dx}px)`,
          transition: startX.current === null ? "transform .25s ease" : "none",
          touchAction: "pan-y",
        }}
      >
        {children}
      </div>
    </div>
  );
}
