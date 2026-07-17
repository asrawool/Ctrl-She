import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Download, RefreshCw } from "lucide-react";
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
import { toast } from "sonner";
import { exportCsv } from "@/services/export";
import { Asset, WorkOrder } from "@/types/operational";

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

const COLORS = ["#00C2FF", "#18C37E", "#F5A524", "#F31260"];

function Page() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [{ data: astData }, { data: woData }] = await Promise.all([
        supabase.from("assets").select("*"),
        supabase.from("work_orders").select("*"),
      ]);

      setAssets(astData || []);
      setWorkOrders(woData || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute dynamic KPI values
  const avgOee = useMemo(() => {
    if (assets.length === 0) return 92;
    return Math.round(
      assets.reduce((sum, a) => sum + a.health_percentage, 0) / assets.length,
    );
  }, [assets]);

  const uptime = useMemo(() => {
    if (assets.length === 0) return 98.1;
    const criticals = assets.filter((a) => a.status === "critical").length;
    return Number((100 - (criticals / assets.length) * 5).toFixed(1));
  }, [assets]);

  // Compute maintenance type distribution from active work orders
  const pieData = useMemo(() => {
    if (workOrders.length === 0) {
      return [
        { name: "Preventive", value: 52 },
        { name: "Predictive", value: 28 },
        { name: "Corrective", value: 15 },
        { name: "Emergency", value: 5 },
      ];
    }
    const counts: Record<string, number> = {
      preventive: 0,
      predictive: 0,
      corrective: 0,
      emergency: 0,
    };
    workOrders.forEach((wo) => {
      if (counts[wo.type] !== undefined) {
        counts[wo.type]++;
      }
    });

    return [
      { name: "Preventive", value: counts.preventive || 1 },
      { name: "Predictive", value: counts.predictive || 1 },
      { name: "Corrective", value: counts.corrective || 1 },
      { name: "Emergency", value: counts.emergency || 0 },
    ].filter((item) => item.value > 0);
  }, [workOrders]);

  const handleExportCsv = () => {
    const cols = ["Month", "OEE Score (%)", "Uptime (%)", "MTTR (Hours)"];
    exportCsv(
      "Operational_Analytics_Trend",
      cols,
      monthly.map((m) => [m.m, m.oee, m.uptime, m.mttr]),
    );
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Cross-plant KPIs, department comparisons and monthly performance analytics."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export Trend CSV
            </Button>
          </div>
        }
      />

      {/* Current KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "OEE (Avg Asset Health)", v: `${avgOee}%`, c: "emerald" },
          { l: "Uptime Forecast", v: `${uptime}%`, c: "emerald" },
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
                name="OEE Score"
              />
              <Line
                type="monotone"
                dataKey="uptime"
                stroke="#18C37E"
                strokeWidth={2.5}
                name="Uptime"
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
              <Bar
                dataKey="v"
                fill="#00C2FF"
                radius={[6, 6, 0, 0]}
                name="Score"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Maintenance Type Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={90}
                label
              >
                {pieData.map((entry, idx) => (
                  <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Real Asset Reliability Heatmap */}
        <Card title="Real Asset Health Map">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {assets.map((a) => {
              const bg =
                a.health_percentage > 85
                  ? "bg-emerald text-white"
                  : a.health_percentage > 65
                    ? "bg-orange-500 text-white"
                    : "bg-destructive text-white";
              return (
                <div
                  key={a.id}
                  className={`aspect-square rounded-xl p-2 flex flex-col justify-between cursor-pointer hover:scale-105 transition shadow ${bg}`}
                  title={`${a.name} (${a.id}): ${a.health_percentage}%`}
                >
                  <span className="text-[10px] font-bold uppercase">
                    {a.id}
                  </span>
                  <span className="text-sm font-display font-extrabold">
                    {a.health_percentage}%
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-3 text-[10px] uppercase font-bold text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-destructive" /> Critical
              (&lt;65%)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-orange-500" /> Warning
              (65%-85%)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-emerald" /> Healthy
              (&gt;85%)
            </span>
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
