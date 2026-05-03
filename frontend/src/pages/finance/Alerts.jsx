import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import AlertCard from "@/components/AlertCard";
import { PageHeader, Section, Pill } from "@/components/Primitives";

export default function FinAlerts() {
  const nav = useNavigate();
  const [alerts, setAlerts] = useState([]);
  useEffect(()=>{
    api.get("/dashboard").then(r=>setAlerts(r.data.alerts.filter(a=>a.module==="finance")));
  }, []);
  return (
    <div className="space-y-6">
      <PageHeader title="Finance Alerts" subtitle="Cash, receivables and compliance signals." />
      <Section title="Active Signals" action={<Pill tone="warning">{alerts.length}</Pill>}>
        <div className="grid sm:grid-cols-2 gap-3">
          {alerts.map(a => <AlertCard key={a.id} alert={a} onAction={() => {
            if (a.type === "overdue") nav("/finance/receivables");
            else if (a.type === "cash_flow") nav("/finance/payables");
            else if (a.type === "gst") nav("/finance/gst");
          }} />)}
        </div>
      </Section>
    </div>
  );
}
