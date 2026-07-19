import { useState, useEffect, useMemo } from "react";
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
  Calendar,
  Check,
  RefreshCw,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { ComplianceFramework, Inspection, NCR } from "@/types/operational";
import { useAuth } from "@/store/auth";
import { hasPermission, getActionRequiredRolesLabel } from "@/services/rbac";

export const Route = createFileRoute("/app/quality")({
  head: () => ({ meta: [{ title: "Quality & Compliance — IntelliPlant AI" }] }),
  component: Page,
});

// ─── Local helper: notification insert ───────────────────────────────────────
async function insertNotification(
  userId: string,
  title: string,
  message: string,
  type: string = "info",
  priority: "high" | "medium" | "low" = "medium",
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    metadata: { category: "compliance", priority },
    is_read: false,
  });
}

// ─── Chip / tag input ─────────────────────────────────────────────────────────
function ChipInput({
  values,
  onChange,
  placeholder = "Type name and press Enter or comma…",
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const addChip = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("");
  };

  const removeChip = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      addChip(input);
    } else if (e.key === "Backspace" && !input && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="min-h-8 w-full rounded-lg bg-background border border-border px-2 py-1 flex flex-wrap gap-1 focus-within:border-accent">
      {values.map((v, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded bg-accent/10 text-accent text-[10px] font-semibold px-1.5 py-0.5"
        >
          {v}
          <button
            type="button"
            onClick={() => removeChip(i)}
            className="opacity-60 hover:opacity-100"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (input.trim()) addChip(input);
        }}
        placeholder={values.length === 0 ? placeholder : ""}
        className="flex-1 min-w-24 bg-transparent text-xs outline-none"
      />
    </div>
  );
}

// ─── Creatable combobox ───────────────────────────────────────────────────────
function CreatableCombobox({
  options,
  value,
  onChange,
  placeholder = "Select or type a framework…",
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);

  useEffect(() => {
    setInputVal(value);
  }, [value]);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(inputVal.toLowerCase()),
  );
  const exactMatch = options.some(
    (o) => o.label.toLowerCase() === inputVal.toLowerCase(),
  );

  return (
    <div className="relative">
      <input
        value={inputVal}
        onChange={(e) => {
          setInputVal(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent text-xs"
      />
      {open && (filtered.length > 0 || (!exactMatch && inputVal.trim())) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-0.5 rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={() => {
                onChange(o.label);
                setInputVal(o.label);
                setOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted flex items-center gap-1"
            >
              {o.label.toLowerCase() === inputVal.toLowerCase() && (
                <Check className="h-3 w-3 text-accent shrink-0" />
              )}
              {o.label}
            </button>
          ))}
          {!exactMatch && inputVal.trim() && (
            <button
              type="button"
              onMouseDown={() => {
                onChange(inputVal.trim());
                setOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted text-accent italic"
            >
              + Use &ldquo;{inputVal.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}


// ─── Page ─────────────────────────────────────────────────────────────────────
function Page() {
  const { role } = useAuth();
  const canLogNcr = hasPermission(role, "create:ncrs");
  const canScheduleInspect = hasPermission(role, "create:inspections");

  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [ncrs, setNcrs] = useState<NCR[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

  const [profiles, setProfiles] = useState<
    { user_id: string; full_name: string }[]
  >([]);

  const [inspectForm, setInspectForm] = useState({
    name: "",
    framework: "ISO 9001",
    scheduled_date: "",
    assignee_ids: [] as string[],

  });

  const [resolveForm, setResolveForm] = useState({
    resolution_notes: "",
  });

  // ── fetch ──
  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const [
        { data: fwData },
        { data: insData },
        { data: ncrData },
        { data: profData },
      ] = await Promise.all([
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
        supabase
          .from("user_profiles")
          .select("user_id, full_name")
          .order("full_name", { ascending: true }),
      ]);


      setFrameworks(fwData || []);
      setInspections(insData || []);
      setNcrs(ncrData || []);
      setProfiles(profData || []);


      // Check and auto-mark overdue inspections (non-blocking)
      if (insData && insData.length > 0) {
        checkAndMarkOverdue(insData);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load quality database records");
    } finally {
      setLoading(false);
    }
  };

  // ── overdue detection ──
  // Notifications go to `created_by` only — the person who scheduled the inspection.
  // Assignees are stored as free-text names (no user-ID directory exists), so
  // we cannot resolve them to UUIDs; the assigner is the accountable party in-app.
  const checkAndMarkOverdue = async (inspectionList: Inspection[]) => {

    const now = new Date();
    const overdueItems = inspectionList.filter(
      (i) => i.status === "Pending" && new Date(i.scheduled_date) < now,
    );
    if (overdueItems.length === 0) return;

    await Promise.all(
      overdueItems.map((item) =>
        supabase
          .from("inspections")
          .update({ status: "Overdue" })
          .eq("id", item.id),
      ),
    );

    // Update local state immediately — no re-fetch loop
    setInspections((prev) =>
      prev.map((i) =>
        overdueItems.some((oi) => oi.id === i.id)
          ? { ...i, status: "Overdue" }
          : i,
      ),
    );

    // Notify the assigner (created_by) for each overdue inspection.
    // We deliberately do NOT notify the current viewer: they may be a different
    // user browsing the page who has no stake in the inspection.
    await Promise.all(
      overdueItems
        .filter((item) => Boolean(item.created_by))
        .map((item) =>
          insertNotification(
            item.created_by!,
            `Inspection overdue: ${item.name}`,
            `"${item.name}" (${item.framework}) scheduled for ${new Date(item.scheduled_date).toLocaleDateString()} is now overdue. Assignee(s): ${item.assigned_to || "none listed"}.`,
            "warning",
            "high",
          ),
        ),
    );
  };

  // ── recalc framework score ──
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

    await supabase
      .from("compliance_frameworks")
      .update({ current_score: newScore })
      .eq("name", frameworkName);

    return newScore;
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── handlers ──
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
      setNcrForm({ ncr_number: "", description: "", severity: "Medium", framework_ref: "ISO 9001" });
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to log NCR: " + (err as Error).message);
    }
  };

  const handleScheduleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const selectedNames = inspectForm.assignee_ids
        .map((id) => profiles.find((p) => p.user_id === id)?.full_name)
        .filter(Boolean) as string[];
      const assigned_to = selectedNames.join(", ") || null;


      const { error } = await supabase.from("inspections").insert({
        name: inspectForm.name,
        framework: inspectForm.framework,
        scheduled_date: new Date(inspectForm.scheduled_date).toISOString(),
        status: "Pending",
        assigned_to: assigned_to,
        assignee_ids: inspectForm.assignee_ids,

        created_by: user?.id ?? null,
      });
      if (error) throw error;

      // Notify every assignee individually
      if (inspectForm.assignee_ids.length > 0) {
        const scheduledStr = new Date(
          inspectForm.scheduled_date,
        ).toLocaleString();
        await Promise.all(
          inspectForm.assignee_ids.map((assigneeId) =>
            insertNotification(
              assigneeId,
              `Inspection assigned: ${inspectForm.name}`,
              `You have been assigned to "${inspectForm.name}" (${inspectForm.framework}) scheduled for ${scheduledStr}.`,
              "info",
              "medium",
            ),
          ),

        );
      }

      toast.success("Inspection scheduled successfully");
      setShowInspectModal(false);
      setInspectForm({
        name: "",
        framework: frameworks[0]?.name || "ISO 9001",
        scheduled_date: "",
        assignee_ids: [],

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
        .update({
          status: "Completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", inspection.id);
      if (insError) throw insError;

      const newScore = await recalcFrameworkScore(inspection.framework);

      // Notify the assigner (created_by)
      if (inspection.created_by) {
        await insertNotification(
          inspection.created_by,
          `Inspection completed: ${inspection.name}`,
          `"${inspection.name}" (${inspection.framework}) has been marked as Completed.`,
          "info",
          "medium",
        );
      }

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

  // ── derived KPIs ──
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
  const overdueInspectionsCount = inspections.filter(
    (i) => i.status === "Overdue",
  ).length;

  // ── my assigned inspections (item 12b/c) ──
  const myInspections = useMemo(() => {
    if (!currentUserId) return [];
    return inspections.filter((i) => i.created_by === currentUserId);
  }, [inspections, currentUserId]);

  const myPending = myInspections.filter((i) => i.status === "Pending").length;
  const myCompleted = myInspections.filter(
    (i) => i.status === "Completed",
  ).length;

  const myOverdue = myInspections.filter((i) => i.status === "Overdue").length;

  // ── on-time trend + NCR trend (item 12d) ──
  const trendData = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en", { month: "short" });

      const monthInspections = inspections.filter((ins) => {
        const sd = new Date(ins.scheduled_date);
        return (
          sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth()

        );
      });
      const monthNcrs = ncrs.filter((n) => {
        if (!n.created_at) return false;
        const cd = new Date(n.created_at);
        return (
          cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth()
        );
      });

      const total = monthInspections.length;
      const completed = monthInspections.filter(
        (ins) => ins.status === "Completed",
      ).length;

      const rate = total > 0 ? Math.round((completed / total) * 100) : null;

      result.push({
        m: label,
        rate:
          rate ??
          (i === 0
            ? completedInspectionsCount > 0
              ? Math.round(
                  (completedInspectionsCount /
                    Math.max(
                      pendingInspectionsCount + completedInspectionsCount,
                      1,
                    )) *
                    100,
                )
              : 100
            : 100),

        ncrs: monthNcrs.length,
        _monthKey: monthKey,
      });
    }
    return result;
  }, [inspections, ncrs, completedInspectionsCount, pendingInspectionsCount]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const frameworkOptions = frameworks.map((f) => ({
    value: f.name,
    label: f.name,
  }));

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
              disabled={!canLogNcr}
              title={
                !canLogNcr
                  ? `Requires ${getActionRequiredRolesLabel("create:ncrs")} role`
                  : undefined
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Log NCR Report
            </Button>
            <Button
              size="sm"
              className="btn-hero"
              onClick={() => setShowInspectModal(true)}
              disabled={!canScheduleInspect}
              title={
                !canScheduleInspect
                  ? `Requires ${getActionRequiredRolesLabel("create:inspections")} role`
                  : undefined
              }
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

      {/* My Assigned Inspections — item 12b/c (shown when user has assigned inspections) */}
      {(myInspections.length > 0 || canScheduleInspect) && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="h-4 w-4 text-accent" />
            <h3 className="font-display font-semibold">
              My Assigned Inspections
            </h3>
            <span className="text-xs text-muted-foreground">
              — inspections you scheduled
            </span>

          </div>
          <div className="grid gap-3 sm:grid-cols-3 mb-4">
            {[
              { l: "Pending", v: myPending, tone: "warning", I: Clock },
              {
                l: "Completed",
                v: myCompleted,
                tone: "emerald",
                I: CheckCircle2,
              },
              { l: "Overdue", v: myOverdue, tone: "danger", I: TriangleAlert },
            ].map(({ l, v, tone, I }) => (
              <div
                key={l}
                className="rounded-xl border border-border p-3 flex items-center gap-3"
              >
                <div
                  className={`grid h-8 w-8 place-items-center rounded-lg shrink-0 ${
                    tone === "emerald"
                      ? "bg-emerald/10 text-emerald"
                      : tone === "danger"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-orange-500/10 text-orange-500"
                  }`}
                >

                  <I className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-display text-xl font-bold">{v}</div>
                  <div className="text-xs text-muted-foreground">{l}</div>
                </div>
              </div>
            ))}
          </div>
          {myInspections.length > 0 && (
            <div className="space-y-2">
              {myInspections.map((it) => {
                const dateStr = new Date(it.scheduled_date).toLocaleDateString(
                  undefined,
                  {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                );
                const statusColor =
                  it.status === "Completed"
                    ? "text-emerald bg-emerald/10 border-emerald/20"
                    : it.status === "Overdue"
                      ? "text-destructive bg-destructive/10 border-destructive/20"
                      : "text-orange-500 bg-orange-500/10 border-orange-500/20";
                return (
                  <div
                    key={it.id}
                    className="flex items-center gap-3 border-b border-border last:border-0 py-1.5"
                  >
                    <Calendar className="h-3.5 w-3.5 text-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {it.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {it.framework}
                        {it.assigned_to ? ` · ${it.assigned_to}` : ""} ·{" "}
                        {dateStr}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${statusColor}`}
                    >

                      {it.status}
                    </span>
                    {(it.status === "Pending" || it.status === "Overdue") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px]"
                        onClick={() => handleCompleteInspection(it)}
                      >
                        Mark Completed
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {myInspections.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No inspections assigned by you yet. Use "Schedule Inspection" to
              create one.

            </p>
          )}
        </div>
      )}

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

        {/* On-Time Completion Trend + NCR Count — item 12d */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-1">Compliance Trend</h3>
          <p className="text-[11px] text-muted-foreground mb-3">
            On-time rate vs NCR count
          </p>

          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="m" fontSize={11} />
              <YAxis yAxisId="left" fontSize={11} domain={[0, 100]} />
              <YAxis yAxisId="right" orientation="right" fontSize={11} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="rate"
                name="On-time %"
                stroke="#18C37E"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ncrs"
                name="NCR count"
                stroke="#F31260"
                strokeWidth={2}
                dot={{ r: 3 }}
                strokeDasharray="4 2"
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
          {overdueInspectionsCount > 0 && (
            <div className="mb-3 rounded-lg bg-destructive/8 border border-destructive/20 px-3 py-2 flex items-center gap-2 text-xs text-destructive">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
              {overdueInspectionsCount} inspection
              {overdueInspectionsCount > 1 ? "s" : ""} overdue — assignees and
              schedulers have been notified.

            </div>
          )}
          <div className="space-y-3">
            {inspections.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No inspections scheduled.
              </p>
            ) : (
              inspections.map((it) => {
                const dateStr = new Date(it.scheduled_date).toLocaleDateString(
                  undefined,
                  { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
                );
                const isOverdue = it.status === "Overdue";
                const isPending = it.status === "Pending";
                const isCompleted = it.status === "Completed";
                return (
                  <div
                    key={it.id}
                    className="flex items-center gap-3 border-b border-border last:border-0 py-2"
                  >
                    <Clock
                      className={`h-4 w-4 shrink-0 ${isOverdue ? "text-destructive" : "text-accent"}`}
                    />

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
                      {isCompleted && (
                        <span className="rounded-full bg-emerald/10 text-emerald text-[9px] font-bold px-2 py-0.5 border border-emerald/20">
                          Completed
                        </span>
                      )}
                      {isOverdue && (
                        <span className="rounded-full bg-destructive/10 text-destructive text-[9px] font-bold px-2 py-0.5 border border-destructive/20">
                          Overdue
                        </span>
                      )}
                      {(isPending || isOverdue) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => handleCompleteInspection(it)}
                        >
                          Mark Completed
                        </Button>
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

      {/* SCHEDULE INSPECTION MODAL — item 3 */}
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
                <CreatableCombobox
                  options={frameworkOptions}
                  value={inspectForm.framework}
                  onChange={(v) =>
                    setInspectForm({ ...inspectForm, framework: v })
                  }
                />
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
                  Assigned Inspectors
                </label>
                <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-2 space-y-1.5 bg-background">
                  {profiles.map((p) => (
                    <label
                      key={p.user_id}
                      className="flex items-center gap-2 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={inspectForm.assignee_ids.includes(p.user_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setInspectForm({
                              ...inspectForm,
                              assignee_ids: [
                                ...inspectForm.assignee_ids,
                                p.user_id,
                              ],
                            });
                          } else {
                            setInspectForm({
                              ...inspectForm,
                              assignee_ids: inspectForm.assignee_ids.filter(
                                (id) => id !== p.user_id,
                              ),
                            });
                          }
                        }}
                        className="accent-accent"
                      />
                      <span>{p.full_name || p.user_id}</span>
                    </label>
                  ))}
                  {profiles.length === 0 && (
                    <span className="text-muted-foreground italic text-[11px]">
                      No inspector profiles found
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Select team members to assign to this inspection. Each
                  assignee will receive an individual notification.

                </p>
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
