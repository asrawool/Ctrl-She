import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export const Route = createFileRoute("/app/analytics")({
  head: () => ({ meta: [{ title: "Analytics — IntelliPlant AI" }] }),
  component: Page,
});

const monthly = [
  { m: "Jan", oee: 82, uptime: 94, mttr: 4.2 },
  { m: "Feb", oee: 84, uptime: 95, mttr: 3.9 },
  { m: "Mar", oee: 81, uptime: 93, mttr: 4.5 },
  { m: "Apr", oee: 87, uptime: 96, mttr: 3.4 },
  { m: "May", oee: 89, uptime: 97, mttr: 3.1 },
  { m: "Jun", oee: 92, uptime: 98, mttr: 2.8 },
];
const dept = [
  { d: "Maintenance", v: 87 },
  { d: "Operations", v: 91 },
  { d: "Quality", v: 94 },
  { d: "HSE", v: 96 },
  { d: "Engineering", v: 89 },
];
const pie = [
  { n: "Preventive", v: 52, c: "#00C2FF" },
  { n: "Predictive", v: 28, c: "#18C37E" },
  { n: "Corrective", v: 15, c: "#F5A524" },
  { n: "Emergency", v: 5, c: "#F31260" },
];

function Page() {
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Cross-plant KPIs, department comparisons and monthly performance analytics."
        actions={
          <>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> Export PDF
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "OEE", v: "92%", c: "emerald" },
          { l: "Uptime", v: "98.1%", c: "emerald" },
          { l: "MTBF", v: "612h", c: "cyan" },
          { l: "MTTR", v: "2.8h", c: "cyan" },
        ].map((k) => (
          <div
            key={k.l}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="text-xs text-muted-foreground">{k.l}</div>
            <div
              className={`mt-1 font-display text-3xl font-bold ${k.c === "emerald" ? "text-emerald" : "text-accent"}`}
            >
              {k.v}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Monthly Performance Trend">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="m" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="oee"
                stroke="#00C2FF"
                strokeWidth={2.5}
              />
              <Line
                type="monotone"
                dataKey="uptime"
                stroke="#18C37E"
                strokeWidth={2.5}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Department Performance">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dept}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="d" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="v" fill="#00C2FF" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Maintenance Type Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pie}
                dataKey="v"
                nameKey="n"
                innerRadius={50}
                outerRadius={100}
                label
              >
                {pie.map((p) => (
                  <Cell key={p.n} fill={p.c} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Asset Reliability Heatmap">
          <div className="grid grid-cols-8 gap-1">
            {Array.from({ length: 64 }).map((_, i) => {
              const v = Math.floor(Math.random() * 100);
              const bg =
                v > 85
                  ? "bg-emerald"
                  : v > 65
                    ? "bg-emerald/60"
                    : v > 45
                      ? "bg-orange-400"
                      : "bg-destructive/80";
              return (
                <div
                  key={i}
                  className={`aspect-square rounded ${bg}`}
                  title={`Score ${v}`}
                />
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="h-2 w-2 rounded bg-destructive/80" /> Low
            <span className="h-2 w-2 rounded bg-orange-400" /> Med
            <span className="h-2 w-2 rounded bg-emerald" /> High
          </div>
        </Card>
      </div>
    </>
  );
}
function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}
