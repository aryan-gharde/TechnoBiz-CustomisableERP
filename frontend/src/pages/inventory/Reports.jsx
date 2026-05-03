import { PageHeader, Section } from "@/components/Primitives";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const data = [
  { cat: "Steel Bars", value: 4200000 },
  { cat: "Cement", value: 2800000 },
  { cat: "Tiles", value: 1900000 },
  { cat: "Wiring", value: 1400000 },
  { cat: "Pipes", value: 980000 },
  { cat: "Tools", value: 720000 },
];

export default function InvReports() {
  return (
    <div className="space-y-6">
      <PageHeader title="Inventory Reports" subtitle="Stock value distribution and movement analytics." />
      <Section title="Stock Value by Category">
        <div className="h-80">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="cat" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v)=>`₹${(v/100000).toFixed(0)}L`} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{borderRadius: 12, border: "1px solid #e2e8f0"}} formatter={(v)=>`₹${(v/100000).toFixed(2)}L`} />
              <Bar dataKey="value" fill="hsl(var(--m-accent))" radius={[10,10,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>
    </div>
  );
}
