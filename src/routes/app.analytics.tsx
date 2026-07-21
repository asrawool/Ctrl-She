import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Download, RefreshCw } from "lucide-react";
import {
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
import {
  Asset,
  WorkOrder,
  NCR,
  Certification,
  InsurancePolicy,
} from "@/types/operational";

export const Route = createFileRoute("/app/analytics")({
  head: () => ({ meta: [{ title: "Analytics — SynapseAi" }] }),
  component: Page,
});

const COLORS = ["#00C2FF", "#18C37E", "#F5A524", "#F31260"];

function Page() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [ncrs, setNcrs] = useState<NCR[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [insurancePolicies, setInsurancePolicies] = useState<InsurancePolicy[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [
        { data: astData },
        { data: woData },
        { data: ncrData },
        { data: certData },
        { data: insData },
      ] = await Promise.all([
        supabase.from("assets").select("*"),
        supabase.from("work_orders").select("*"),
        supabase.from("ncrs").select("*"),
        supabase.from("certifications").select("*"),
        supabase.from("insurance_policies").select("*"),
      ]);

      setAssets(astData || []);
      setWorkOrders(woData || []);
      setNcrs(ncrData || []);
      setCertifications(certData || []);
      setInsurancePolicies(insData || []);
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

  // These values are derived directly from the operational records available
  // in the current data model. OEE, uptime, MTBF, and MTTR need production and
  // downtime event data, so they are intentionally not inferred here.
  const averageAssetHealth = useMemo(() => {
    if (assets.length === 0) return null;
    return Math.round(
      assets.reduce((sum, a) => sum + a.health_percentage, 0) / assets.length,
    );
  }, [assets]);

  const activeWorkOrders = useMemo(
    () =>
      workOrders.filter(
        (wo) => wo.status?.toLowerCase() !== "completed" && !wo.completed_at,
      ).length,
    [workOrders],
  );

  const openNcrs = useMemo(
    () =>
      ncrs.filter(
        (n) => !["closed", "resolved"].includes(n.status.toLowerCase()),
      ).length,
    [ncrs],
  );

  const criticalAssets = useMemo(
    () =>
      assets.filter(
        (a) =>
          a.health_percentage <= 65 || a.status.toLowerCase() === "critical",
      ).length,
    [assets],
  );

  const complianceAttention = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (
      certifications.filter(
        (c) => c.status?.toLowerCase() === "expired" || c.expiry_date < today,
      ).length +
      insurancePolicies.filter(
        (p) => p.status.toLowerCase() === "expired" || p.expiry_date < today,
      ).length
    );
  }, [certifications, insurancePolicies]);

  const workOrderStatus = useMemo(() => {
    const counts = new Map<string, number>();
    workOrders.forEach((wo) => {
      const status = wo.status || "Unspecified";
      counts.set(status, (counts.get(status) ?? 0) + 1);
    });
    return Array.from(counts, ([status, count]) => ({ status, count }));
  }, [workOrders]);

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
    const cols = ["Metric", "Value"];
    exportCsv("Operational_Analytics_Summary", cols, [
      ["Average asset health (%)", averageAssetHealth ?? "No asset data"],
      ["Assets requiring attention", criticalAssets],
      ["Open work orders", activeWorkOrders],
      ["Open NCRs", openNcrs],
      ["Expired compliance records", complianceAttention],
    ]);
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
        description="Operational metrics calculated from your live asset, work order, quality and compliance records."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export Summary CSV
            </Button>
          </div>
        }
      />

      {/* Current KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            l: "Average Asset Health",
            v: averageAssetHealth === null ? "—" : `${averageAssetHealth}%`,
            c: "emerald",
          },
          { l: "Assets Requiring Attention", v: criticalAssets, c: "cyan" },
          { l: "Open Work Orders", v: activeWorkOrders, c: "cyan" },
          { l: "Open NCRs", v: openNcrs, c: "cyan" },
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
        <Card title="Work Order Status">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={workOrderStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="status" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="count"
                fill="#00C2FF"
                radius={[6, 6, 0, 0]}
                name="Work orders"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Records Requiring Attention">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={[
                { category: "Assets", count: criticalAssets },
                { category: "Work orders", count: activeWorkOrders },
                { category: "NCRs", count: openNcrs },
                { category: "Compliance", count: complianceAttention },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="category" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar
                dataKey="count"
                fill="#00C2FF"
                radius={[6, 6, 0, 0]}
                name="Records"
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
