import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCheck,
  Plus,
  X,
  User,
  Calendar,
  Check,
  RefreshCw,
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
import { ComplianceFramework, Inspection, NCR } from "@/types/operational";

export const Route = createFileRoute("/app/quality")({
  head: () => ({ meta: [{ title: "Quality & Compliance — IntelliPlant AI" }] }),
  component: Page,
});

const trend = [
  { m: "Jan", s: 88 },
  { m: "Feb", s: 90 },
  { m: "Mar", s: 91 },
  { m: "Apr", s: 93 },
  { m: "May", s: 95 },
  { m: "Jun", s: 97 },
];

function Page() {
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [ncrs, setNcrs] = useState<NCR[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showNcrModal, setShowNcrModal] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedNcr, setSelectedNcr] = useState<NCR | null>(null);

  // Form states
  const [ncrForm, setNcrForm] = useState({
    ncr_number: "",
    description: "",
    severity: "Medium",
    framework_ref: "ISO 9001",
  });

  const [inspectForm, setInspectForm] = useState({
    name: "",
    framework: "ISO 9001",
    scheduled_date: "",
    assigned_to: "",
  });

  const [resolveForm, setResolveForm] = useState({
    resolution_notes: "",
  });

  const fetchData = async () => {
    try {
      const [{ data: fwData }, { data: insData }, { data: ncrData }] =
        await Promise.all([
          supabase
            .from("compliance_frameworks")
            .select("*")
            .order("name", { ascending: true }),
          supabase
            .from("inspections")
            .select("*")
            .order("scheduled_date", { ascending: true }),
          supabase
            .from("ncrs")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);

      setFrameworks(fwData || []);
      setInspections(insData || []);
      setNcrs(ncrData || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load quality database records");
    } finally {
      setLoading(false);
    }
  };

  const recalcFrameworkScore = async (
    frameworkName: string,
  ): Promise<number> => {
    const { data: frameworkInspections, error: insError } = await supabase
      .from("inspections")
      .select("status")
      .eq("framework", frameworkName);

    if (insError) throw insError;

    const { data: frameworkNcrs, error: ncrError } = await supabase
      .from("ncrs")
      .select("status")
      .eq("framework_ref", frameworkName);

    if (ncrError) throw ncrError;

    const totalInspections = frameworkInspections?.length || 0;
    const completedInspections =
      frameworkInspections?.filter((i) => i.status === "Completed").length || 0;

    const totalNcrs = frameworkNcrs?.length || 0;
    const resolvedNcrs =
      frameworkNcrs?.filter((n) => n.status === "Resolved").length || 0;

    const total = totalInspections + totalNcrs;
    const successes = completedInspections + resolvedNcrs;

    const newScore = total > 0 ? Math.round((successes / total) * 100) : 100;

    const { error: fwError } = await supabase
      .from("compliance_frameworks")
      .update({ current_score: newScore })
      .eq("name", frameworkName);

    if (fwError) throw fwError;

    return newScore;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateNcr = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("ncrs").insert({
        ncr_number: ncrForm.ncr_number,
        description: ncrForm.description,
        severity: ncrForm.severity,
        status: "Open",
        framework_ref: ncrForm.framework_ref,
      });

      if (error) throw error;
      toast.success("NCR logged successfully");
      setShowNcrModal(false);
      setNcrForm({
        ncr_number: "",
        description: "",
        severity: "Medium",
        framework_ref: "ISO 9001",
      });
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to log NCR: " + (err as Error).message);
    }
  };

  const handleScheduleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("inspections").insert({
        name: inspectForm.name,
        framework: inspectForm.framework,
        scheduled_date: new Date(inspectForm.scheduled_date).toISOString(),
        status: "Pending",
        assigned_to: inspectForm.assigned_to || null,
      });

      if (error) throw error;
      toast.success("Inspection scheduled successfully");
      setShowInspectModal(false);
      setInspectForm({
        name: "",
        framework: "ISO 9001",
        scheduled_date: "",
        assigned_to: "",
      });
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to schedule inspection: " + (err as Error).message);
    }
  };

  const handleCompleteInspection = async (inspection: Inspection) => {
    try {
      const { error: insError } = await supabase
        .from("inspections")
        .update({ status: "Completed" })
        .eq("id", inspection.id);

      if (insError) throw insError;

      const newScore = await recalcFrameworkScore(inspection.framework);

      toast.success(
        `Inspection marked as Completed. ${inspection.framework} score updated to ${newScore}%`,
      );
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to complete inspection: " + (err as Error).message);
    }
  };

  const handleResolveNcr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNcr) return;

    try {
      const { error } = await supabase
        .from("ncrs")
        .update({
          status: "Resolved",
          resolved_at: new Date().toISOString(),
          resolution_notes: resolveForm.resolution_notes,
        })
        .eq("id", selectedNcr.id);

      if (error) throw error;

      const newScore = await recalcFrameworkScore(
        selectedNcr.framework_ref || "",
      );

      toast.success(
        `NCR ${selectedNcr.ncr_number} resolved. ${selectedNcr.framework_ref} score updated to ${newScore}%`,
      );
      setShowResolveModal(false);
      setSelectedNcr(null);
      setResolveForm({ resolution_notes: "" });
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to resolve NCR: " + (err as Error).message);
    }
  };

  // Derive dynamic KPIs
  const totalFrameworks = frameworks.length;
  const overallScore =
    totalFrameworks > 0
      ? Math.round(
          frameworks.reduce((acc, f) => acc + f.current_score, 0) /
            totalFrameworks,
        )
      : 100;
  const openNcrsCount = ncrs.filter(
    (n) => n.status === "Open" || n.status === "In Review",
  ).length;
  const pendingInspectionsCount = inspections.filter(
    (i) => i.status === "Pending",
  ).length;
  const completedInspectionsCount = inspections.filter(
    (i) => i.status === "Completed",
  ).length;

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
        title="Quality & Compliance"
        description="Real-time compliance posture across regulatory frameworks with CAPA, audits and non-conformance tracking."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNcrModal(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Log NCR Report
            </Button>
            <Button
              size="sm"
              className="btn-hero"
              onClick={() => setShowInspectModal(true)}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" /> Schedule Inspection
            </Button>
          </div>
        }
      />

      {/* Quality KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            i: ShieldCheck,
            l: "Overall Compliance",
            v: `${overallScore}/100`,
            tone: "emerald",
          },
          {
            i: FileCheck,
            l: "Open NCRs / CAPAs",
            v: openNcrsCount.toString(),
            tone: "cyan",
          },
          {
            i: AlertTriangle,
            l: "Pending Inspections",
            v: pendingInspectionsCount.toString(),
            tone: "warning",
          },
          {
            i: CheckCircle2,
            l: "Audit Inspections Done",
            v: completedInspectionsCount.toString(),
            tone: "emerald",
          },
        ].map(({ i: I, l, v, tone }) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-4">
            <div
              className={`grid h-9 w-9 place-items-center rounded-lg ${
                tone === "emerald"
                  ? "bg-emerald/10 text-emerald"
                  : tone === "warning"
                    ? "bg-orange-500/10 text-orange-500"
                    : "bg-accent/10 text-accent"
              }`}
            >
              <I className="h-4.5 w-4.5" />
            </div>
            <div className="mt-3 font-display text-2xl font-bold">{v}</div>
            <div className="text-xs text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Compliance by Framework */}
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h3 className="font-display font-semibold mb-4">
            Compliance by Framework
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {frameworks.map((f) => {
              const tone = f.current_score < 85 ? "warning" : "emerald";
              return (
                <div key={f.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-semibold text-sm">{f.name}</span>
                    <span
                      className={`font-display text-lg font-bold ${tone === "warning" ? "text-orange-500" : "text-emerald"}`}
                    >
                      {f.current_score}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${tone === "warning" ? "bg-orange-500" : "bg-emerald"}`}
                      style={{ width: `${f.current_score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compliance Trend */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-4">Compliance Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="m" fontSize={11} />
              <YAxis fontSize={11} domain={[80, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="s"
                stroke="#18C37E"
                strokeWidth={2.5}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Inspection Schedule */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-4">
            Inspection Schedule
          </h3>
          <div className="space-y-3">
            {inspections.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No inspections scheduled.
              </p>
            ) : (
              inspections.map((it) => {
                const dateStr = new Date(it.scheduled_date).toLocaleDateString(
                  undefined,
                  {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                );
                return (
                  <div
                    key={it.id}
                    className="flex items-center gap-3 border-b border-border last:border-0 py-2"
                  >
                    <Clock className="h-4 w-4 text-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {it.name}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <span>Framework: {it.framework}</span>
                        {it.assigned_to && (
                          <span>· Assigned: {it.assigned_to}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold whitespace-nowrap text-muted-foreground">
                        {dateStr}
                      </span>
                      {it.status === "Pending" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => handleCompleteInspection(it)}
                        >
                          Mark Completed
                        </Button>
                      ) : (
                        <span className="rounded-full bg-emerald/10 text-emerald text-[9px] font-bold px-2 py-0.5 border border-emerald/20">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Non-Conformance Reports (NCR) */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-4">
            Non-Conformance Reports
          </h3>
          <div className="space-y-2.5">
            {ncrs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No non-conformance reports active.
              </p>
            ) : (
              ncrs.map((n) => {
                const isOpen = n.status !== "Resolved";
                return (
                  <div
                    key={n.id}
                    className="rounded-xl border border-border p-3 hover:border-accent transition"
                  >
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                      <span>
                        {n.ncr_number} ({n.framework_ref})
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 ${
                          n.severity === "High"
                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                            : n.severity === "Medium"
                              ? "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                              : "bg-emerald/10 text-emerald border border-emerald/20"
                        }`}
                      >
                        {n.severity}
                      </span>
                    </div>
                    <div className="mt-1 text-sm">{n.description}</div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold ${isOpen ? "text-orange-500" : "text-emerald"}`}
                      >
                        Status: {n.status}
                      </span>
                      {isOpen && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[10px] text-accent"
                          onClick={() => {
                            setSelectedNcr(n);
                            setShowResolveModal(true);
                          }}
                        >
                          Resolve NCR
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* LOG NCR REPORT MODAL */}
      {showNcrModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNcr}
            className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setShowNcrModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold">Log NCR Report</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">
                  NCR Reference Number
                </label>
                <input
                  required
                  placeholder="e.g. NCR-2026-092"
                  value={ncrForm.ncr_number}
                  onChange={(e) =>
                    setNcrForm({ ...ncrForm, ncr_number: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Description
                </label>
                <textarea
                  required
                  placeholder="Describe the quality non-conformance event..."
                  value={ncrForm.description}
                  onChange={(e) =>
                    setNcrForm({ ...ncrForm, description: e.target.value })
                  }
                  className="w-full h-16 rounded-lg bg-background border border-border p-2 outline-none focus:border-accent text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Severity
                </label>
                <select
                  value={ncrForm.severity}
                  onChange={(e) =>
                    setNcrForm({ ...ncrForm, severity: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Associated Compliance Framework
                </label>
                <select
                  value={ncrForm.framework_ref}
                  onChange={(e) =>
                    setNcrForm({ ...ncrForm, framework_ref: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                >
                  {frameworks.map((f) => (
                    <option key={f.id} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-8"
                onClick={() => setShowNcrModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full text-xs h-8 btn-hero">
                Log Report
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* SCHEDULE INSPECTION MODAL */}
      {showInspectModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleScheduleInspect}
            className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setShowInspectModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold">
              Schedule Compliance Inspection
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">
                  Inspection Title
                </label>
                <input
                  required
                  placeholder="e.g. Emission Monitoring, Safety Checklist"
                  value={inspectForm.name}
                  onChange={(e) =>
                    setInspectForm({ ...inspectForm, name: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Framework
                </label>
                <select
                  value={inspectForm.framework}
                  onChange={(e) =>
                    setInspectForm({
                      ...inspectForm,
                      framework: e.target.value,
                    })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                >
                  {frameworks.map((f) => (
                    <option key={f.id} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Scheduled Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={inspectForm.scheduled_date}
                  onChange={(e) =>
                    setInspectForm({
                      ...inspectForm,
                      scheduled_date: e.target.value,
                    })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent text-foreground"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Assigned Inspector
                </label>
                <input
                  placeholder="e.g. HSE Officer, Quality Manager"
                  value={inspectForm.assigned_to}
                  onChange={(e) =>
                    setInspectForm({
                      ...inspectForm,
                      assigned_to: e.target.value,
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
                onClick={() => setShowInspectModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full text-xs h-8 btn-hero">
                Schedule
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* RESOLVE NCR MODAL */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleResolveNcr}
            className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => {
                setShowResolveModal(false);
                setSelectedNcr(null);
              }}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold">
              Resolve Non-Conformance ({selectedNcr?.ncr_number})
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">
                  Resolution Actions Taken
                </label>
                <textarea
                  required
                  placeholder="Log the CAPA actions, calibration fixes or training logs deployed to resolve this deviation..."
                  value={resolveForm.resolution_notes}
                  onChange={(e) =>
                    setResolveForm({
                      ...resolveForm,
                      resolution_notes: e.target.value,
                    })
                  }
                  className="w-full h-24 rounded-lg bg-background border border-border p-2 outline-none focus:border-accent text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-8"
                onClick={() => {
                  setShowResolveModal(false);
                  setSelectedNcr(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full text-xs h-8 btn-hero">
                Mark Resolved
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
