import { PageHeader, Section } from "@/components/Primitives";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

const data = [
  { month: "Sep", revenue: 4200000, expenses: 2800000 },
  { month: "Oct", revenue: 4800000, expenses: 3100000 },
  { month: "Nov", revenue: 5200000, expenses: 3400000 },
  { month: "Dec", revenue: 6100000, expenses: 3600000 },
  { month: "Jan", revenue: 5800000, expenses: 3700000 },
  { month: "Feb", revenue: 6800000, expenses: 3900000 },
];

export default function FinReports() {
  return (
    <div className="space-y-6">
      <PageHeader title="Finance Reports" subtitle="Profit & loss trend, revenue vs expenses." />
      <Section title="Revenue vs Expenses (last 6 months)">
        <div className="h-80">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v)=>`₹${(v/100000).toFixed(0)}L`} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{borderRadius: 12, border: "1px solid #e2e8f0"}} formatter={(v)=>`₹${(v/100000).toFixed(2)}L`} />
              <Legend wrapperStyle={{fontSize: 12}} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--m-accent))" strokeWidth={2.5} dot={{r:3}} />
              <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2.5} dot={{r:3}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>
    </div>
  );
}
