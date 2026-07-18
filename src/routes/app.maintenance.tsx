import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Wrench,
  Activity,
  Clock,
  AlertTriangle,
  TrendingDown,
  Package,
  Sparkles,
  Plus,
  Edit,
  X,
  User,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Asset, WorkOrder, SparePart, RCAReport } from "@/types/operational";

export const Route = createFileRoute("/app/maintenance")({
  head: () => ({
    meta: [{ title: "Maintenance Intelligence — IntelliPlant AI" }],
  }),
  component: Page,
});

const vibration = [
  { t: "Mon", v: 2.1 },
  { t: "Tue", v: 2.3 },
  { t: "Wed", v: 2.6 },
  { t: "Thu", v: 3.1 },
  { t: "Fri", v: 3.8 },
  { t: "Sat", v: 4.2 },
  { t: "Sun", v: 4.6 },
];

function Page() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [rcaReports, setRcaReports] = useState<RCAReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal display states
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showWoModal, setShowWoModal] = useState(false);
  const [showSpModal, setShowSpModal] = useState(false);
  const [showRcaModal, setShowRcaModal] = useState(false);

  // Form states
  const [assetForm, setAssetForm] = useState({
    id: "P-401",
    health_percentage: 80,
    status: "warning",
    rul_days: 100,
  });

  const [woForm, setWoForm] = useState({
    asset_id: "P-401",
    title: "",
    type: "preventive" as
      "preventive" | "corrective" | "predictive" | "emergency",
    priority: "Medium",
    assigned_to: "",
    due_date: "",
    notes: "",
    source_rca_id: "",
    source_rca_action: "",
  });

  const [spForm, setSpForm] = useState({
    id: "SP-001",
    name: "",
    current_quantity: 5,
    min_quantity: 10,
    isCustom: false,
  });

  const [rcaForm, setRcaForm] = useState({
    incident_ref: "",
    asset_id: "P-401",
    symptoms: "",
    root_cause: "",
    corrective_actions: "",
  });

  const fetchData = async () => {
    try {
      const [
        { data: astData },
        { data: woData },
        { data: spData },
        { data: rcaData },
      ] = await Promise.all([
        supabase
          .from("assets")
          .select("*")
          .order("health_percentage", { ascending: true }),
        supabase
          .from("work_orders")
          .select("*")
          .order("due_date", { ascending: true }),
        supabase
          .from("spare_parts")
          .select("*")
          .order("name", { ascending: true }),
        supabase
          .from("rca_reports")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      setAssets(astData || []);
      setWorkOrders(woData || []);
      setSpareParts(spData || []);
      setRcaReports(rcaData || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load maintenance records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("assets")
        .update({
          health_percentage: Number(assetForm.health_percentage),
          status: assetForm.status,
          rul_days: Number(assetForm.rul_days),
          updated_at: new Date().toISOString(),
        })
        .eq("id", assetForm.id);

      if (error) throw error;
      toast.success(`Asset ${assetForm.id} updated successfully`);
      setShowAssetModal(false);
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to update asset: " + (err as Error).message);
    }
  };

  const handleCreateWo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("work_orders").insert({
        asset_id: woForm.asset_id,
        title: woForm.title,
        type: woForm.type,
        priority: woForm.priority,
        status: "Pending",
        assigned_to: woForm.assigned_to || null,
        due_date: woForm.due_date
          ? new Date(woForm.due_date).toISOString()
          : null,
        notes: woForm.notes || null,
        source_rca_id: woForm.source_rca_id || null,
        source_rca_action: woForm.source_rca_action || null,
      });

      if (error) throw error;
      toast.success("Work Order scheduled successfully");
      setShowWoModal(false);
      setWoForm({
        asset_id: "P-401",
        title: "",
        type: "preventive",
        priority: "Medium",
        assigned_to: "",
        due_date: "",
        notes: "",
        source_rca_id: "",
        source_rca_action: "",
      });
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to schedule work order: " + (err as Error).message);
    }
  };

  const handleConvertRcaToWo = (
    rcaId: string,
    assetId: string,
    actionText: string,
  ) => {
    setWoForm({
      asset_id: assetId || "P-401",
      title: actionText.trim(),
      type: "corrective",
      priority: "Medium",
      assigned_to: "",
      due_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
      notes: `Generated from RCA Report Reference ID: ${rcaId} corrective action.`,
      source_rca_id: rcaId,
      source_rca_action: actionText.trim(),
    });
    setShowWoModal(true);
  };

  const handleAdjustSp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (spForm.isCustom) {
        if (!spForm.name.trim()) {
          toast.error("Please enter a spare part name");
          return;
        }
        const { error } = await supabase.from("spare_parts").insert({
          name: spForm.name,
          current_quantity: Number(spForm.current_quantity),
          min_quantity: Number(spForm.min_quantity),
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("spare_parts")
          .update({
            current_quantity: Number(spForm.current_quantity),
            min_quantity: Number(spForm.min_quantity),
            updated_at: new Date().toISOString(),
          })
          .eq("id", spForm.id);
        if (error) throw error;
      }

      toast.success("Spare parts adjusted successfully");
      setShowSpModal(false);
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to adjust spare parts: " + (err as Error).message);
    }
  };

  const handleCreateRca = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("rca_reports").insert({
        incident_ref: rcaForm.incident_ref,
        asset_id: rcaForm.asset_id,
        symptoms: rcaForm.symptoms,
        root_cause: rcaForm.root_cause,
        corrective_actions: rcaForm.corrective_actions,
      });

      if (error) throw error;
      toast.success("RCA Report logged successfully");
      setShowRcaModal(false);
      setRcaForm({
        incident_ref: "",
        asset_id: "P-401",
        symptoms: "",
        root_cause: "",
        corrective_actions: "",
      });
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to log RCA: " + (err as Error).message);
    }
  };

  // Derive dynamic AI suggestions based on live asset health
  const getAiRecommendations = () => {
    const recs = [];
    const lowHealth = assets.filter((a) => a.health_percentage < 85);
    for (const a of lowHealth) {
      if (a.health_percentage < 70) {
        recs.push({
          t: `Order critical spare parts for ${a.id} (${a.name}) immediately`,
          conf: "95%",
        });
      } else {
        recs.push({
          t: `Schedule vibration analysis / filtration for ${a.id} filters`,
          conf: "86%",
        });
      }
    }
    // Static fallbacks if everything is healthy
    if (recs.length === 0) {
      recs.push({
        t: "Reduce P-401 lubrication interval to 1,400h",
        conf: "94%",
      });
      recs.push({
        t: "Schedule inspection of C-12 compressor valves",
        conf: "81%",
      });
    }
    return recs.slice(0, 3);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Activity className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Maintenance Intelligence"
        description="Predictive analytics, RUL forecasting, RCA and spare parts optimization across your asset base."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAssetModal(true)}
            >
              <Edit className="mr-1.5 h-3.5 w-3.5" /> Update Asset
            </Button>
            <Button size="sm" onClick={() => setShowWoModal(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Log Work Order
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSpModal(true)}
            >
              <Package className="mr-1.5 h-3.5 w-3.5" /> Adjust Spares
            </Button>
            <Button
              size="sm"
              className="btn-hero"
              onClick={() => setShowRcaModal(true)}
            >
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Create RCA
            </Button>
          </div>
        }
      />

      {/* Equipment Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {assets.map((e) => (
          <div
            key={e.id}
            className="rounded-2xl border border-border bg-card p-4 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  {e.id}
                </div>
                <div className="font-display font-bold">{e.name}</div>
              </div>
              <span
                className={`grid h-8 w-8 place-items-center rounded-lg ${
                  e.status === "critical"
                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                    : e.status === "warning"
                      ? "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                      : "bg-emerald/10 text-emerald border border-emerald/20"
                }`}
              >
                <Activity className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between text-xs mb-1">
                <span className="font-medium">Asset Health</span>
                <span className="font-bold">{e.health_percentage}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full ${
                    e.status === "critical"
                      ? "bg-destructive"
                      : e.status === "warning"
                        ? "bg-orange-500"
                        : "bg-emerald"
                  }`}
                  style={{ width: `${e.health_percentage}%` }}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> RUL:{" "}
              <b className="text-foreground">{e.rul_days} days</b>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Vibration Trend */}
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" /> Vibration
            Trend — P-401
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={vibration}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="t" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="v"
                stroke="#F31260"
                strokeWidth={2.5}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* AI Recommendations */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" /> AI Recommendations
          </h3>
          <div className="space-y-2.5 text-sm">
            {getAiRecommendations().map((r, i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <div className="text-sm">{r.t}</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-bold text-emerald border border-emerald/20">
                    {r.conf}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Maintenance Timeline */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-4">
            Maintenance Timeline
          </h3>
          {workOrders.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No work orders scheduled.
            </p>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-1 before:bottom-1 before:w-0.5 before:bg-border">
              {workOrders.slice(0, 5).map((e, i) => {
                const dayStr = e.due_date
                  ? new Date(e.due_date).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })
                  : "—";
                const tone =
                  e.priority === "Critical" || e.priority === "High"
                    ? "warning"
                    : "emerald";
                return (
                  <div
                    key={e.id || i}
                    id={`wo-${e.id}`}
                    className="relative p-1 rounded-lg transition-all duration-300"
                  >
                    <span
                      className={`absolute -left-6 top-1 grid h-4 w-4 place-items-center rounded-full ${
                        tone === "warning"
                          ? "bg-orange-500 animate-pulse"
                          : "bg-emerald"
                      }`}
                    />
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">
                      {dayStr} ({e.status})
                    </div>
                    <div className="text-sm font-medium">
                      {e.type.toUpperCase()}: {e.title} for {e.asset_id}
                    </div>
                    {e.assigned_to && (
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <User className="h-3 w-3" /> {e.assigned_to}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Spare Parts Inventory */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
            <Package className="h-4 w-4 text-accent" /> Spare Parts
          </h3>
          <div className="space-y-2">
            {spareParts.slice(0, 5).map((s) => {
              const lowStock = s.current_quantity <= s.min_quantity;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-sm border-b border-border last:border-0 py-2"
                >
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Min stock level: {s.min_quantity}
                    </div>
                  </div>
                  <span
                    className={`font-display text-lg font-bold ${lowStock ? "text-destructive" : "text-emerald"}`}
                  >
                    {s.current_quantity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RCA Reports */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" /> Root Cause
          Analyses (RCA)
        </h3>
        {rcaReports.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No RCA reports found.
          </p>
        ) : (
          <div className="space-y-4">
            {rcaReports.slice(0, 2).map((r) => (
              <div
                key={r.id}
                className="border border-border p-4 rounded-xl space-y-3"
              >
                <div className="text-xs font-semibold text-muted-foreground">
                  REPORT REF: {r.incident_ref} | ASSET: {r.asset_id}
                </div>
                <div className="grid gap-4 md:grid-cols-3 text-sm">
                  <RcaCol title="Symptom" items={r.symptoms.split(",")} />
                  <RcaCol title="Root Cause" items={r.root_cause.split(",")} />
                  <RcaCol
                    title="Corrective Actions"
                    items={r.corrective_actions.split(",")}
                    isCorrective={true}
                    rcaId={r.id}
                    assetId={r.asset_id}
                    workOrders={workOrders}
                    onConvert={handleConvertRcaToWo}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UPDATE ASSET MODAL */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateAsset}
            className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setShowAssetModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold">
              Update Asset Status
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">
                  Select Asset
                </label>
                <select
                  value={assetForm.id}
                  onChange={(e) =>
                    setAssetForm({ ...assetForm, id: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} — {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Health Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={assetForm.health_percentage}
                  onChange={(e) =>
                    setAssetForm({
                      ...assetForm,
                      health_percentage: Number(e.target.value),
                    })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Status
                </label>
                <select
                  value={assetForm.status}
                  onChange={(e) =>
                    setAssetForm({ ...assetForm, status: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                >
                  <option value="healthy">Healthy</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Remaining Useful Life (Days)
                </label>
                <input
                  type="number"
                  value={assetForm.rul_days}
                  onChange={(e) =>
                    setAssetForm({
                      ...assetForm,
                      rul_days: Number(e.target.value),
                    })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-8"
                onClick={() => setShowAssetModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full text-xs h-8 btn-hero">
                Save Updates
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* SCHEDULE WORK ORDER MODAL */}
      {showWoModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateWo}
            className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setShowWoModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold">
              Schedule Work Order
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">
                  Target Asset
                </label>
                <select
                  value={woForm.asset_id}
                  onChange={(e) =>
                    setWoForm({ ...woForm, asset_id: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} — {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Work Order Title
                </label>
                <input
                  required
                  placeholder="e.g. Pump lubrication replacement"
                  value={woForm.title}
                  onChange={(e) =>
                    setWoForm({ ...woForm, title: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Maintenance Type
                </label>
                <select
                  value={woForm.type}
                  onChange={(e) =>
                    setWoForm({
                      ...woForm,
                      type: e.target.value as
                        | "preventive"
                        | "corrective"
                        | "predictive"
                        | "emergency",
                    })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                >
                  <option value="preventive">Preventive</option>
                  <option value="corrective">Corrective</option>
                  <option value="predictive">Predictive</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Priority
                </label>
                <select
                  value={woForm.priority}
                  onChange={(e) =>
                    setWoForm({ ...woForm, priority: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Assign Engineer
                </label>
                <input
                  placeholder="Engineer Name"
                  value={woForm.assigned_to}
                  onChange={(e) =>
                    setWoForm({ ...woForm, assigned_to: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  required
                  value={woForm.due_date}
                  onChange={(e) =>
                    setWoForm({ ...woForm, due_date: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent text-foreground"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={woForm.notes}
                  onChange={(e) =>
                    setWoForm({ ...woForm, notes: e.target.value })
                  }
                  className="w-full h-16 rounded-lg bg-background border border-border p-2 outline-none focus:border-accent text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-8"
                onClick={() => setShowWoModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full text-xs h-8 btn-hero">
                Log Order
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ADJUST SPARE PARTS MODAL */}
      {showSpModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAdjustSp}
            className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setShowSpModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold">
              Adjust Spares Stock
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="isCustomPart"
                  checked={spForm.isCustom}
                  onChange={(e) =>
                    setSpForm({ ...spForm, isCustom: e.target.checked })
                  }
                />
                <label htmlFor="isCustomPart" className="text-muted-foreground">
                  Add new custom spare part
                </label>
              </div>
              {spForm.isCustom ? (
                <div>
                  <label className="block text-muted-foreground mb-1">
                    Part Name
                  </label>
                  <input
                    required
                    placeholder="e.g. Pump Coupling Seal"
                    value={spForm.name}
                    onChange={(e) =>
                      setSpForm({ ...spForm, name: e.target.value })
                    }
                    className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-muted-foreground mb-1">
                    Select Part
                  </label>
                  <select
                    value={spForm.id}
                    onChange={(e) => {
                      const selectedPart = spareParts.find(
                        (p) => p.id === e.target.value,
                      );
                      setSpForm({
                        ...spForm,
                        id: e.target.value,
                        current_quantity: selectedPart?.current_quantity || 0,
                        min_quantity: selectedPart?.min_quantity || 0,
                      });
                    }}
                    className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                  >
                    {spareParts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-muted-foreground mb-1">
                  Current Stock Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={spForm.current_quantity}
                  onChange={(e) =>
                    setSpForm({
                      ...spForm,
                      current_quantity: Number(e.target.value),
                    })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Minimum Alert Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={spForm.min_quantity}
                  onChange={(e) =>
                    setSpForm({
                      ...spForm,
                      min_quantity: Number(e.target.value),
                    })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-8"
                onClick={() => setShowSpModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full text-xs h-8 btn-hero">
                Save Adjustment
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE RCA REPORT MODAL */}
      {showRcaModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateRca}
            className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setShowRcaModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold">
              Log Root Cause Analysis (RCA)
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">
                  Incident Reference
                </label>
                <input
                  required
                  placeholder="e.g. IR-2026-901"
                  value={rcaForm.incident_ref}
                  onChange={(e) =>
                    setRcaForm({ ...rcaForm, incident_ref: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Asset Affected
                </label>
                <select
                  value={rcaForm.asset_id}
                  onChange={(e) =>
                    setRcaForm({ ...rcaForm, asset_id: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} — {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Symptoms (Comma Separated)
                </label>
                <textarea
                  required
                  placeholder="e.g. Abnormal noise, Temperature rise 12°C"
                  value={rcaForm.symptoms}
                  onChange={(e) =>
                    setRcaForm({ ...rcaForm, symptoms: e.target.value })
                  }
                  className="w-full h-12 rounded-lg bg-background border border-border p-2 outline-none focus:border-accent text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Root Cause (Comma Separated)
                </label>
                <textarea
                  required
                  placeholder="e.g. Bearing starvation, Lube interval too long"
                  value={rcaForm.root_cause}
                  onChange={(e) =>
                    setRcaForm({ ...rcaForm, root_cause: e.target.value })
                  }
                  className="w-full h-12 rounded-lg bg-background border border-border p-2 outline-none focus:border-accent text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Corrective Actions (Comma Separated)
                </label>
                <textarea
                  required
                  placeholder="e.g. Reduce lube interval, Install vibration check"
                  value={rcaForm.corrective_actions}
                  onChange={(e) =>
                    setRcaForm({
                      ...rcaForm,
                      corrective_actions: e.target.value,
                    })
                  }
                  className="w-full h-12 rounded-lg bg-background border border-border p-2 outline-none focus:border-accent text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-8"
                onClick={() => setShowRcaModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full text-xs h-8 btn-hero">
                Log RCA Report
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function RcaCol({
  title,
  items,
  isCorrective,
  rcaId,
  assetId,
  workOrders,
  onConvert,
}: {
  title: string;
  items: string[];
  isCorrective?: boolean;
  rcaId?: string;
  assetId?: string;
  workOrders?: WorkOrder[];
  onConvert?: (rcaId: string, assetId: string, actionText: string) => void;
}) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
        {title}
      </div>
      <ul className="space-y-2 text-xs">
        {items.map((item, idx) => {
          const trimmed = item.trim();
          if (!trimmed) return null;

          const linkedWo =
            isCorrective && workOrders && rcaId
              ? workOrders.find(
                  (w) =>
                    w.source_rca_id === rcaId &&
                    w.source_rca_action?.trim() === trimmed,
                )
              : null;

          return (
            <li
              key={idx}
              className="flex flex-col gap-1 border-b border-border/20 last:border-0 pb-1.5 last:pb-0"
            >
              <div className="flex gap-2 items-start">
                <Wrench className="h-3.5 w-3.5 mt-0.5 text-accent shrink-0" />
                <span className="flex-1">{trimmed}</span>
              </div>
              {isCorrective && (
                <div className="pl-5.5 mt-0.5">
                  {linkedWo ? (
                    <a
                      href={`#wo-${linkedWo.id}`}
                      className="inline-flex items-center gap-1 text-[9px] bg-emerald/10 hover:bg-emerald/20 text-emerald border border-emerald/20 px-1.5 py-0.5 rounded-md font-semibold whitespace-nowrap transition cursor-pointer"
                      onClick={(ev) => {
                        ev.preventDefault();
                        const el = document.getElementById(`wo-${linkedWo.id}`);
                        if (el) {
                          el.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                          el.classList.add(
                            "ring-2",
                            "ring-emerald",
                            "bg-emerald/5",
                          );
                          setTimeout(() => {
                            el.classList.remove(
                              "ring-2",
                              "ring-emerald",
                              "bg-emerald/5",
                            );
                          }, 2000);
                        } else {
                          toast.info(
                            `Work Order: "${linkedWo.title}" (${linkedWo.status})`,
                          );
                        }
                      }}
                    >
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Work Order created
                    </a>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="link"
                      className="h-auto p-0 text-[10px] text-accent font-medium hover:underline flex items-center gap-1"
                      onClick={() =>
                        onConvert?.(rcaId || "", assetId || "", trimmed)
                      }
                    >
                      <Plus className="h-3 w-3" />
                      Convert to Work Order
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
