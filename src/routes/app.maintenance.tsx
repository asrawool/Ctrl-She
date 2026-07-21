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
import { useAuth } from "@/store/auth";
import { hasPermission, getActionRequiredRolesLabel } from "@/services/rbac";
import {
  useAssets,
  usePartsStock,
  computeHealthStatus,
} from "@/hooks/useMaintenanceData";
import { Combobox } from "@/components/ui/combobox";
import {
  isInspectionOverdue,
  checkAndMarkOverdue,
  type Inspection,
} from "@/services/inspections";

export const Route = createFileRoute("/app/maintenance")({
  head: () => ({
    meta: [{ title: "Maintenance Intelligence — SynapseAi" }],
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
  const { role } = useAuth();
  const canUpdateAsset = hasPermission(role, "update:assets");
  const canLogWo = hasPermission(role, "create:work_orders");
  const canAdjustSpares = hasPermission(role, "create:spare_parts");
  const canCreateRca = hasPermission(role, "create:rca_reports");

  const sendWoNotification = async (
    targetUserId: string | null,
    title: string,
    message: string,
    priority: string = "medium",
    role?: string,
  ) => {
    try {
      let targetUserIds: string[] = [];
      if (targetUserId) {
        targetUserIds = [targetUserId];
      } else if (role) {
        const { data: roleUsers } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", role);
        if (roleUsers && roleUsers.length > 0) {
          targetUserIds = roleUsers.map((r) => r.user_id);
        }
      }

      if (targetUserIds.length === 0) return;

      await Promise.all(
        targetUserIds.map((tid) =>
          supabase.rpc("create_notification", {
            target_user_id: tid,
            title,
            message,
            type: "info",
            metadata: {
              category: "maintenance",
              priority: priority.toLowerCase(),
              role,
            },
          }),
        ),
      );
    } catch (err) {
      console.warn("Notification delivery warning:", err);
    }
  };

  const { assets } = useAssets();
  const { parts: spareParts } = usePartsStock();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [rcaReports, setRcaReports] = useState<RCAReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Custom states for engineer assignment and completion workflow
  const [engineers, setEngineers] = useState<
    { user_id: string; full_name: string; email: string }[]
  >([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [rejectWoId, setRejectWoId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  // Assigned inspections for maintenance engineers (item 2)
  const [assignedInspections, setAssignedInspections] = useState<Inspection[]>(
    [],
  );
  const [showCompleteInspectModal, setShowCompleteInspectModal] =
    useState(false);
  const [completingInspection, setCompletingInspection] =
    useState<Inspection | null>(null);
  const [completeForm, setCompleteForm] = useState({
    result: "Pass",
    findings: "",
    delayReason: "",
  });
  const [activeWoTab, setActiveWoTab] = useState<
    "active" | "assigned" | "history"
  >("active");

  // Modal display states
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showWoModal, setShowWoModal] = useState(false);
  const [showSpModal, setShowSpModal] = useState(false);
  const [showRcaModal, setShowRcaModal] = useState(false);

  // Form states
  const [assetForm, setAssetForm] = useState({
    id: "",
    health_percentage: 80,
    status: "warning",
    rul_days: 100,
  });

  const [woForm, setWoForm] = useState({
    asset_id: "",
    title: "",
    type: "preventive" as
      "preventive" | "corrective" | "predictive" | "emergency",
    priority: "Medium",
    assigned_to: "",
    assignee_id: "",
    due_date: "",
    notes: "",
    source_rca_id: "",
    source_rca_action: "",
  });

  const [spForm, setSpForm] = useState({
    id: "",
    name: "",
    current_quantity: 5,
    min_quantity: 10,
    isCustom: false,
  });

  const [rcaForm, setRcaForm] = useState({
    incident_ref: "",
    asset_id: "",
    symptoms: "",
    root_cause: "",
    corrective_actions: "",
  });

  // Keep form fields synced with loaded real-time spare parts
  useEffect(() => {
    if (spareParts.length > 0) {
      if (!spForm.id) {
        const firstPart = spareParts[0];
        setSpForm((s) => ({
          ...s,
          id: firstPart.id,
          name: firstPart.name,
          current_quantity: firstPart.current_quantity,
          min_quantity: firstPart.min_quantity,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spareParts]);

  const fetchData = async () => {
    try {
      const [
        { data: woData },
        { data: rcaData },
        { data: profData },
        { data: roleData },
        { data: insData },
        {
          data: { user },
        },
      ] = await Promise.all([
        supabase
          .from("work_orders")
          .select("*")
          .order("due_date", { ascending: true }),
        supabase
          .from("rca_reports")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("user_profiles").select("user_id, full_name, email"),
        supabase
          .from("user_roles")
          .select("user_id, role")
          .eq("role", "maintenance_engineer"),
        supabase
          .from("inspections")
          .select("*")
          .order("scheduled_date", { ascending: true }),
        supabase.auth.getUser(),
      ]);

      setWorkOrders(woData || []);
      setRcaReports(rcaData || []);
      setAssignedInspections(insData || []);

      // Check and auto-mark overdue inspections
      if (insData && insData.length > 0) {
        checkAndMarkOverdue(insData, (overdueIds) => {
          setAssignedInspections((prev) =>
            prev.map((i) =>
              overdueIds.includes(i.id) ? { ...i, status: "Overdue" } : i,
            ),
          );
        });
      }

      if (user) {
        setCurrentUserId(user.id);
      }

      // Filter profiles by maintenance_engineer role
      const engProfiles = (profData || []).filter((p) =>
        (roleData || []).some((r) => r.user_id === p.user_id),
      ) as { user_id: string; full_name: string; email: string }[];
      setEngineers(engProfiles);
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

  // Freshly fetch engineers when work order modal opens
  useEffect(() => {
    if (showWoModal) {
      const refetchEngineers = async () => {
        try {
          const [
            { data: profData },
            { data: roleData },
          ] = await Promise.all([
            supabase.from("user_profiles").select("user_id, full_name, email"),
            supabase
              .from("user_roles")
              .select("user_id, role")
              .eq("role", "maintenance_engineer"),
          ]);
          const engProfiles = (profData || []).filter((p) =>
            (roleData || []).some((r) => r.user_id === p.user_id),
          ) as { user_id: string; full_name: string; email: string }[];
          setEngineers(engProfiles);
        } catch (err) {
          console.error("Failed to refresh engineers list on modal open:", err);
        }
      };
      refetchEngineers();
    }
  }, [showWoModal]);

  const handleUpdateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.id) {
      toast.error("Please select an asset first.");
      return;
    }
    try {
      const derivedHealth = computeHealthStatus(
        Number(assetForm.health_percentage),
        Number(assetForm.rul_days),
      );

      const { error } = await supabase
        .from("assets")
        .update({
          health_percentage: Number(assetForm.health_percentage),
          health_status: derivedHealth,
          rul_days: Number(assetForm.rul_days),
          updated_at: new Date().toISOString(),
        })
        .eq("id", assetForm.id);

      if (error) throw error;
      const selectedAsset = assets.find((a) => a.id === assetForm.id);

      // Notify maintenance_engineer, reliability_engineer, and plant_manager if health changes to critical
      if (
        derivedHealth === "critical" &&
        selectedAsset?.status !== "critical"
      ) {
        await Promise.all([
          sendWoNotification(
            null,
            `Asset Health Critical: ${selectedAsset?.name || "Asset"}`,
            `Asset ${selectedAsset?.name || "Asset"} (${selectedAsset?.asset_code || assetForm.id}) status has changed to CRITICAL (Health: ${assetForm.health_percentage}%, RUL: ${assetForm.rul_days} days).`,
            "high",
            "maintenance_engineer",
          ),
          sendWoNotification(
            null,
            `Asset Health Critical: ${selectedAsset?.name || "Asset"}`,
            `Asset ${selectedAsset?.name || "Asset"} (${selectedAsset?.asset_code || assetForm.id}) status has changed to CRITICAL (Health: ${assetForm.health_percentage}%, RUL: ${assetForm.rul_days} days).`,
            "high",
            "reliability_engineer",
          ),
          sendWoNotification(
            null,
            `Asset Health Critical: ${selectedAsset?.name || "Asset"}`,
            `Asset ${selectedAsset?.name || "Asset"} (${selectedAsset?.asset_code || assetForm.id}) status has changed to CRITICAL (Health: ${assetForm.health_percentage}%, RUL: ${assetForm.rul_days} days).`,
            "high",
            "plant_manager",
          ),
        ]);
      }

      toast.success(
        `Asset ${selectedAsset?.asset_code || assetForm.id} updated successfully`,
      );
      setShowAssetModal(false);
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to update asset: " + (err as Error).message);
    }
  };

  const handleCreateWo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!woForm.asset_id) {
      toast.error("Please select a target asset first.");
      return;
    }
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: newWo, error } = await supabase
        .from("work_orders")
        .insert({
          asset_id: woForm.asset_id,
          title: woForm.title,
          type: woForm.type,
          priority: woForm.priority,
          status: "Pending",
          assigned_to: woForm.assigned_to || null,
          assignee_id: woForm.assignee_id || null,
          due_date: woForm.due_date
            ? new Date(woForm.due_date).toISOString()
            : null,
          notes: woForm.notes || null,
          source_rca_id: woForm.source_rca_id || null,
          source_rca_action: woForm.source_rca_action || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Notify maintenance_engineer and reliability_engineer roles
      await Promise.all([
        sendWoNotification(
          null,
          `New Work Order Created: ${woForm.title}`,
          `Work order "${woForm.title}" has been created (Priority: ${woForm.priority}).`,
          woForm.priority,
          "maintenance_engineer",
        ),
        sendWoNotification(
          null,
          `New Work Order Created: ${woForm.title}`,
          `Work order "${woForm.title}" has been created (Priority: ${woForm.priority}).`,
          woForm.priority,
          "reliability_engineer",
        ),
      ]);

      // Notify the assigned engineer if assignee_id is selected
      if (woForm.assignee_id && newWo) {
        const targetAsset = assets.find((a) => a.id === woForm.asset_id);
        const assetName = targetAsset ? targetAsset.name : "Asset";
        const dueStr = woForm.due_date
          ? new Date(woForm.due_date).toLocaleString()
          : "no due date";
        await sendWoNotification(
          woForm.assignee_id,
          `New Work Order: ${woForm.title}`,
          `You have been assigned the work order "${woForm.title}" for ${assetName} (Priority: ${woForm.priority}), due by ${dueStr}.`,
          woForm.priority,
        );
      }

      // Auto-create a linked reminder if a due_date is specified
      if (woForm.due_date && newWo) {
        const reminderTargetUser = woForm.assignee_id || user?.id;
        if (reminderTargetUser) {
          const { error: remErr } = await supabase.from("reminders").insert({
            user_id: reminderTargetUser,
            work_order_id: newWo.id,
            description: `Work Order Due: ${woForm.title}`,
            due_at: new Date(woForm.due_date).toISOString(),
            is_notified: false,
          });
          if (remErr) {
            console.error("Failed to auto-create linked reminder:", remErr);
          }
        }
      }

      toast.success("Work Order scheduled successfully");
      setShowWoModal(false);
      setWoForm({
        asset_id: "",
        title: "",
        type: "preventive",
        priority: "Medium",
        assigned_to: "",
        assignee_id: "",
        due_date: "",
        notes: "",
        source_rca_id: "",
        source_rca_action: "",
      });
      setAssigneeSearch("");
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to schedule work order: " + (err as Error).message);
    }
  };

  const handleMarkComplete = async (wo: WorkOrder) => {
    try {
      const { error } = await supabase
        .from("work_orders")
        .update({ status: "Completed — Pending Verification" })
        .eq("id", wo.id);
      if (error) throw error;

      // Resolve/close linked reminder for this work order
      await supabase
        .from("reminders")
        .update({ is_notified: true })
        .eq("work_order_id", wo.id);

      // Fetch all plant managers & safety officers to notify
      const [{ data: managers }, { data: safetyOfficers }] = await Promise.all([
        supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "plant_manager"),
        supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "safety_officer"),
      ]);

      const notifyIds = new Set<string>();
      if (wo.created_by) notifyIds.add(wo.created_by);
      (managers || []).forEach((m) => notifyIds.add(m.user_id));
      (safetyOfficers || []).forEach((s) => notifyIds.add(s.user_id));

      await Promise.all(
        Array.from(notifyIds).map((targetId) =>
          sendWoNotification(
            targetId,
            `Work Order Completed: ${wo.title}`,
            `Work order "${wo.title}" has been marked as Completed by ${wo.assigned_to || "the engineer"} and is pending your verification.`,
            wo.priority,
          ),
        ),
      );

      toast.success("Work order marked as Completed — Pending Verification");
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to update status: " + (err as Error).message);
    }
  };

  const handleVerify = async (wo: WorkOrder) => {
    try {
      const { error } = await supabase
        .from("work_orders")
        .update({
          status: "Completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", wo.id);
      if (error) throw error;

      // Resolve/close linked reminder for this work order
      await supabase
        .from("reminders")
        .update({ is_notified: true })
        .eq("work_order_id", wo.id);

      if (wo.assignee_id) {
        await sendWoNotification(
          wo.assignee_id,
          `Work Order Verified: ${wo.title}`,
          `Your work on "${wo.title}" has been verified and closed.`,
          wo.priority,
        );
      }

      toast.success("Work order verified and closed");
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to verify work order: " + (err as Error).message);
    }
  };

  const handleReject = async (woId: string, note: string) => {
    if (!note.trim()) {
      toast.error("Please enter a rework note.");
      return;
    }
    try {
      const wo = workOrders.find((w) => w.id === woId);
      if (!wo) return;

      const { error } = await supabase
        .from("work_orders")
        .update({ status: "Pending" })
        .eq("id", woId);
      if (error) throw error;

      if (wo.assignee_id) {
        await sendWoNotification(
          wo.assignee_id,
          `Work Order Rework Required: ${wo.title}`,
          `Your work on "${wo.title}" was sent back for rework. Note: "${note}"`,
          "high",
        );
      }

      toast.success("Work order sent back for rework");
      setRejectWoId(null);
      setRejectNote("");
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to reject work order: " + (err as Error).message);
    }
  };

  const handleCompleteInspection = (inspection: Inspection) => {
    setCompletingInspection(inspection);
    setShowCompleteInspectModal(true);
    setCompleteForm({ result: "Pass", findings: "", delayReason: "" });
  };

  const submitCompleteInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingInspection) return;

    const isOverdue = isInspectionOverdue(completingInspection);
    if (isOverdue && !completeForm.delayReason.trim()) {
      toast.error("Please enter a reason for delay.");
      return;
    }

    try {
      const completedAt = new Date().toISOString();
      const completedLate = isOverdue;
      const { error: insError } = await supabase
        .from("inspections")
        .update({
          status: "Completed",
          completed_at: completedAt,
          result: completeForm.result,
          findings: completeForm.findings,
          completed_late: completedLate,
          delay_reason: completedLate ? completeForm.delayReason : null,
        })
        .eq("id", completingInspection.id);
      if (insError) throw insError;

      // Wrap in try-catch in case of compliance_frameworks RLS limits
      try {
        const { data: frameworkInspections, error: fError } = await supabase
          .from("inspections")
          .select("status")
          .eq("framework", completingInspection.framework);

        if (!fError && frameworkInspections) {
          const { data: frameworkNcrs } = await supabase
            .from("ncrs")
            .select("status")
            .eq("framework_ref", completingInspection.framework);

          const totalInspections = frameworkInspections.length;
          const completedInspections = frameworkInspections.filter(
            (i) => i.status === "Completed",
          ).length;
          const totalNcrs = frameworkNcrs?.length || 0;
          const resolvedNcrs =
            frameworkNcrs?.filter((n) => n.status === "Resolved").length || 0;

          const total = totalInspections + totalNcrs;
          const successes = completedInspections + resolvedNcrs;
          const newScore =
            total > 0 ? Math.round((successes / total) * 100) : 100;

          await supabase
            .from("compliance_frameworks")
            .update({ current_score: newScore })
            .eq("name", completingInspection.framework);
        }
      } catch (err) {
        console.warn(
          "Skipping framework score update due to permissions/RLS:",
          err,
        );
      }

      // Fetch all safety officers to notify
      const { data: safetyOfficers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "safety_officer");

      const notifyIds = new Set<string>();
      if (completingInspection.created_by)
        notifyIds.add(completingInspection.created_by);
      (safetyOfficers || []).forEach((s) => notifyIds.add(s.user_id));

      const findingsExcerpt =
        completeForm.findings.length > 60
          ? completeForm.findings.slice(0, 57) + "..."
          : completeForm.findings;

      let delayExcerpt = "";
      if (completedLate && completeForm.delayReason) {
        delayExcerpt = ` · Delay Reason: "${completeForm.delayReason}"`;
      }

      const notifTitle = `Inspection Completed — ${completeForm.result}: ${completingInspection.name}`;
      const notifMessage = `Inspection "${completingInspection.name}" (${completingInspection.framework}) completed with result "${completeForm.result}". Findings: "${findingsExcerpt}"${delayExcerpt}`;

      await Promise.all(
        Array.from(notifyIds).map((targetId) =>
          sendWoNotification(targetId, notifTitle, notifMessage, "medium"),
        ),
      );

      toast.success("Inspection marked as Completed successfully.");
      setShowCompleteInspectModal(false);
      setCompletingInspection(null);
      setCompleteForm({ result: "Pass", findings: "", delayReason: "" });
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to complete inspection: " + (err as Error).message);
    }
  };

  const handleConvertRcaToWo = (
    rcaId: string,
    assetId: string,
    actionText: string,
  ) => {
    setWoForm({
      asset_id: assetId || assets[0]?.id || "",
      title: actionText.trim(),
      type: "corrective",
      priority: "Medium",
      assigned_to: "",
      assignee_id: "",
      due_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
      notes: `Generated from RCA Report Reference ID: ${rcaId} corrective action.`,
      source_rca_id: rcaId,
      source_rca_action: actionText.trim(),
    });
    setShowWoModal(true);
  };

  const handleAdjustSp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spForm.isCustom && !spForm.id) {
      toast.error("Please select a spare part first.");
      return;
    }
    try {
      if (spForm.isCustom) {
        if (!spForm.name.trim()) {
          toast.error("Please enter a spare part name");
          return;
        }
        const { error } = await supabase.from("spare_parts").insert({
          name: spForm.name,
          part_code: `SP-${Date.now().toString().slice(-4)}`,
          category: "Parts",
          manufacturer: "Generic",
          model: "Generic",
          location: "Warehouse A",
          current_qty: Number(spForm.current_quantity),
          min_qty: Number(spForm.min_quantity),
          supplier: "Generic",
          status: "Operational",
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("spare_parts")
          .update({
            current_qty: Number(spForm.current_quantity),
            min_qty: Number(spForm.min_quantity),
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
    if (!rcaForm.asset_id) {
      toast.error("Please select an affected asset first.");
      return;
    }
    try {
      // 1. Insert the RCA report and select the inserted row
      const { data: insertedRca, error } = await supabase
        .from("rca_reports")
        .insert({
          incident_ref: rcaForm.incident_ref,
          asset_id: rcaForm.asset_id,
          symptoms: rcaForm.symptoms,
          root_cause: rcaForm.root_cause,
          corrective_actions: rcaForm.corrective_actions,
        })
        .select()
        .single();

      if (error) throw error;

      // Notify reliability_engineer, maintenance_engineer, and plant_manager roles
      const rcaAsset = assets.find((a) => a.id === rcaForm.asset_id);
      const rcaAssetName = rcaAsset ? rcaAsset.name : "Asset";
      await Promise.all([
        sendWoNotification(
          null,
          `RCA Report Logged: ${rcaForm.incident_ref}`,
          `A new Root Cause Analysis (RCA) report has been logged for incident ${rcaForm.incident_ref} on asset ${rcaAssetName}.`,
          "medium",
          "reliability_engineer",
        ),
        sendWoNotification(
          null,
          `RCA Report Logged: ${rcaForm.incident_ref}`,
          `A new Root Cause Analysis (RCA) report has been logged for incident ${rcaForm.incident_ref} on asset ${rcaAssetName}.`,
          "medium",
          "maintenance_engineer",
        ),
        sendWoNotification(
          null,
          `RCA Report Logged: ${rcaForm.incident_ref}`,
          `A new Root Cause Analysis (RCA) report has been logged for incident ${rcaForm.incident_ref} on asset ${rcaAssetName}.`,
          "medium",
          "plant_manager",
        ),
      ]);

      toast.success("RCA Report logged successfully");
      setShowRcaModal(false);
      setRcaForm({
        incident_ref: "",
        asset_id: assets[0]?.id || "",
        symptoms: "",
        root_cause: "",
        corrective_actions: "",
      });

      // 2. Asynchronously upload to storage and trigger process-document
      if (insertedRca) {
        const rcaText = `RCA Report Reference: ${insertedRca.incident_ref}
Asset: ${insertedRca.asset_id}
Symptoms: ${insertedRca.symptoms}
Root Cause: ${insertedRca.root_cause}
Corrective Actions: ${insertedRca.corrective_actions}`;

        const blob = new Blob([rcaText], { type: "text/plain" });
        const file = new File([blob], `${insertedRca.incident_ref}.txt`, {
          type: "text/plain",
        });
        const filePath = `rca/${insertedRca.id}.txt`;

        // Upload to storage bucket
        const { error: uploadError } = await supabase.storage
          .from("copilot-attachments")
          .upload(filePath, file, { cacheControl: "3600", upsert: true });

        if (uploadError) {
          console.error("Storage upload failed for RCA:", uploadError.message);
        } else {
          // Register document metadata
          const docId = insertedRca.id;
          const { error: docError } = await supabase.from("documents").insert({
            id: docId,
            name: `RCA: ${insertedRca.incident_ref}`,
            category: "Incident & Root Cause Reports",
            asset: insertedRca.asset_id,
            version: "v1.0",
            size: blob.size,
            source: "rca_reports",
            storage_path: filePath,
            status: "pending",
          });

          if (docError) {
            console.error(
              "Document metadata insertion failed:",
              docError.message,
            );
          } else {
            // Trigger background processing (chunking & embeddings)
            supabase.functions
              .invoke("process-document", {
                body: { documentId: docId },
              })
              .catch((err) => {
                console.error(
                  "Failed to invoke process-document function:",
                  err,
                );
              });
          }
        }

        // 3. Scan for recurring failure patterns (Step 4 & 5)
        const newCauses = insertedRca.root_cause
          .split(",")
          .map((c: string) => c.trim().toLowerCase())
          .filter(Boolean);

        const { data: allRcas } = await supabase
          .from("rca_reports")
          .select("asset_id, root_cause");

        if (allRcas) {
          for (const cause of newCauses) {
            // Find other assets that had RCAs with this exact cause (case-insensitive)
            const matchingAssets = new Set<string>();
            matchingAssets.add(insertedRca.asset_id);

            for (const r of allRcas) {
              const otherCauses = r.root_cause
                .split(",")
                .map((c: string) => c.trim().toLowerCase())
                .filter(Boolean);

              if (otherCauses.includes(cause)) {
                matchingAssets.add(r.asset_id);
              }
            }

            // If a match is found across 2+ distinct assets, register/update pattern
            if (matchingAssets.size >= 2) {
              const assetList = Array.from(matchingAssets);
              const title = `Systemic pattern: Recurring ${cause}`;
              const desc = `Similar root cause "${cause}" identified across ${assetList.length} assets (${assetList.join(", ")}) in recent incident reports.`;

              // Check if pattern already exists
              const { data: existing } = await supabase
                .from("failure_patterns")
                .select("*")
                .eq("matching_root_cause", cause)
                .maybeSingle();

              if (!existing) {
                await supabase.from("failure_patterns").insert({
                  title,
                  description: desc,
                  matching_root_cause: cause,
                  affected_assets: assetList,
                });
              } else {
                const combinedAssets = [
                  ...new Set([...existing.affected_assets, ...assetList]),
                ];
                const updatedDesc = `Similar root cause "${cause}" identified across ${combinedAssets.length} assets (${combinedAssets.join(", ")}) in recent incident reports.`;

                await supabase
                  .from("failure_patterns")
                  .update({
                    affected_assets: combinedAssets,
                    description: updatedDesc,
                  })
                  .eq("id", existing.id);
              }
            }
          }
        }
      }

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
          t: `Order critical spare parts for ${a.asset_code || a.id} (${a.name}) immediately`,
          conf: "95%",
        });
      } else {
        recs.push({
          t: `Schedule vibration analysis / filtration for ${a.asset_code || a.id} filters`,
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
              disabled={!canUpdateAsset}
              title={
                !canUpdateAsset
                  ? `Requires ${getActionRequiredRolesLabel("update:assets")} role`
                  : undefined
              }
            >
              <Edit className="mr-1.5 h-3.5 w-3.5" /> Update Asset
            </Button>
            <Button
              size="sm"
              onClick={() => setShowWoModal(true)}
              disabled={!canLogWo}
              title={
                !canLogWo
                  ? `Requires ${getActionRequiredRolesLabel("create:work_orders")} role`
                  : undefined
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Log Work Order
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSpModal(true)}
              disabled={!canAdjustSpares}
              title={
                !canAdjustSpares
                  ? `Requires ${getActionRequiredRolesLabel("create:spare_parts")} role`
                  : undefined
              }
            >
              <Package className="mr-1.5 h-3.5 w-3.5" /> Adjust Spares
            </Button>
            <Button
              size="sm"
              className="btn-hero"
              onClick={() => setShowRcaModal(true)}
              disabled={!canCreateRca}
              title={
                !canCreateRca
                  ? `Requires ${getActionRequiredRolesLabel("create:rca_reports")} role`
                  : undefined
              }
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
                  {e.asset_code || e.id}
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
        <div className="space-y-4">
          {/* Maintenance Timeline */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-display font-semibold">
                Maintenance Timeline
              </h3>
              <div className="flex gap-1 text-xs">
                {(["active", "assigned", "history"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveWoTab(tab)}
                    className={`px-3 py-1 rounded-full font-medium transition ${
                      activeWoTab === tab
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {tab === "active"
                      ? "All Active"
                      : tab === "assigned"
                        ? "Assigned to Me"
                        : "History"}
                  </button>
                ))}
              </div>
            </div>

            {/* Rework / Reject Reason Overlay */}
            {rejectWoId && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 space-y-2 text-xs">
                <div className="font-semibold text-destructive">
                  Enter Rework / Rejection Reason
                </div>
                <textarea
                  placeholder="Describe what needs to be fixed..."
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  className="w-full h-12 rounded bg-background border border-border p-1.5 outline-none text-foreground"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRejectWoId(null);
                      setRejectNote("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(rejectWoId, rejectNote)}
                  >
                    Send Back for Rework
                  </Button>
                </div>
              </div>
            )}

            {(() => {
              const filteredWos = workOrders.filter((w) => {
                if (activeWoTab === "active") return w.status !== "Completed";
                if (activeWoTab === "assigned")
                  return (
                    w.assignee_id === currentUserId && w.status !== "Completed"
                  );
                return w.status === "Completed";
              });

              if (filteredWos.length === 0) {
                return (
                  <p className="text-xs text-muted-foreground italic py-4">
                    No work orders found in this section.
                  </p>
                );
              }

              return (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-1 before:bottom-1 before:w-0.5 before:bg-border">
                  {filteredWos.map((e, idx) => {
                    const dayStr = e.due_date
                      ? new Date(e.due_date).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—";
                    const tone =
                      e.priority === "Critical" || e.priority === "High"
                        ? "warning"
                        : "emerald";

                    const isAssignee =
                      currentUserId && e.assignee_id === currentUserId;
                    const isAssigner =
                      currentUserId &&
                      (e.created_by === currentUserId ||
                        role === "plant_manager" ||
                        role === "safety_officer");

                    // Badge styles matching inspections page
                    const badgeStyle =
                      e.status === "Completed"
                        ? "bg-emerald/10 text-emerald border-emerald/20"
                        : e.status === "Completed — Pending Verification"
                          ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                          : "bg-blue-500/10 text-blue-500 border-blue-500/20";

                    return (
                      <div
                        key={e.id || idx}
                        id={`wo-${e.id}`}
                        className="relative p-2 rounded-xl border border-transparent hover:border-border hover:bg-muted/10 transition-all duration-300 space-y-1.5"
                      >
                        <span
                          className={`absolute -left-[22px] top-3 grid h-3 w-3 place-items-center rounded-full ${
                            tone === "warning"
                              ? "bg-orange-500 animate-pulse"
                              : "bg-emerald"
                          }`}
                        />

                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground">
                            Due: {dayStr}
                          </div>
                          <div className="flex gap-1.5 items-center">
                            {/* Priority badge */}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                                tone === "warning"
                                  ? "border-orange-500/20 bg-orange-500/10 text-orange-500"
                                  : "border-emerald/20 bg-emerald/10 text-emerald"
                              }`}
                            >
                              {e.priority}
                            </span>
                            {/* Status badge */}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${badgeStyle}`}
                            >
                              {e.status}
                            </span>
                          </div>
                        </div>

                        <div className="text-sm font-medium">
                          {e.type.toUpperCase()}: {e.title} for{" "}
                          {assets.find((a) => a.id === e.asset_id)
                            ?.asset_code || e.asset_id}
                        </div>

                        {e.notes && (
                          <p className="text-xs text-muted-foreground italic max-w-md line-clamp-2">
                            {e.notes}
                          </p>
                        )}

                        <div className="flex items-center justify-between flex-wrap gap-2 mt-1">
                          {e.assigned_to && (
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" /> {e.assigned_to}
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex gap-1.5">
                            {(e.status === "Pending" ||
                              e.status === "Scheduled") &&
                              isAssignee && (
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkComplete(e)}
                                  className="text-[10px] py-0.5 px-2 bg-accent text-accent-foreground hover:bg-accent/90"
                                >
                                  Mark Complete
                                </Button>
                              )}
                            {e.status === "Completed — Pending Verification" &&
                              isAssigner && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setRejectWoId(e.id)}
                                    className="text-[10px] py-0.5 px-2 text-destructive border-destructive/20 hover:bg-destructive/10"
                                  >
                                    Reject
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleVerify(e)}
                                    className="text-[10px] py-0.5 px-2 bg-emerald hover:bg-emerald/90 text-white"
                                  >
                                    Verify
                                  </Button>
                                </>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* My Assigned Compliance Inspections — item 2 */}
          {(role === "maintenance_engineer" ||
            assignedInspections.some(
              (ins) =>
                currentUserId &&
                ins.assignee_ids &&
                ins.assignee_ids.includes(currentUserId),
            )) && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h3 className="font-display font-semibold flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-accent" />
                My Assigned Compliance Inspections
              </h3>
              <div className="space-y-3">
                {assignedInspections
                  .filter(
                    (ins) =>
                      ins.status !== "Completed" &&
                      currentUserId &&
                      ins.assignee_ids &&
                      ins.assignee_ids.includes(currentUserId),
                  )
                  .map((ins) => {
                    const dayStr = ins.scheduled_date
                      ? new Date(ins.scheduled_date).toLocaleDateString(
                          undefined,
                          {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "—";
                    const isOverdue = isInspectionOverdue(ins);
                    return (
                      <div
                        key={ins.id}
                        className="p-3 rounded-xl border border-border bg-muted/5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate">
                              {ins.name}
                            </span>
                            {isOverdue && (
                              <span className="rounded-full bg-destructive/10 text-destructive text-[9px] font-bold px-2 py-0.5 border border-destructive/20">
                                Overdue
                              </span>
                            )}
                          </div>
                          <div className="text-muted-foreground">
                            Framework: <b>{ins.framework}</b> · Due: {dayStr}
                          </div>
                          {ins.scope && (
                            <div className="text-[11px] text-muted-foreground bg-muted/10 p-1.5 rounded italic">
                              Scope: {ins.scope}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[10px] shrink-0"
                          onClick={() => handleCompleteInspection(ins)}
                        >
                          Complete
                        </Button>
                      </div>
                    );
                  })}
                {assignedInspections.filter(
                  (ins) =>
                    ins.status !== "Completed" &&
                    currentUserId &&
                    ins.assignee_ids &&
                    ins.assignee_ids.includes(currentUserId),
                ).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    No pending compliance inspections assigned to you.
                  </p>
                )}
              </div>
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
                  REPORT REF: {r.incident_ref} | ASSET:{" "}
                  {assets.find((a) => a.id === r.asset_id)?.asset_code ||
                    r.asset_id}
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
                <Combobox
                  options={assets.map((a) => ({
                    value: a.id,
                    label: `${a.asset_code} — ${a.name}`,
                    searchString: `${a.asset_code} ${a.name}`,
                  }))}
                  value={assetForm.id}
                  onChange={(val) => {
                    const selected = assets.find((a) => a.id === val);
                    if (selected) {
                      setAssetForm({
                        id: selected.id,
                        health_percentage: selected.health_percentage,
                        status: selected.status,
                        rul_days: selected.rul_days,
                      });
                    }
                  }}
                  emptyText="No assets yet — add one first"
                  placeholder="Select Asset..."
                />
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
                  Status (Computed)
                </label>
                <div className="flex h-8 items-center">
                  {(() => {
                    const derived = computeHealthStatus(
                      Number(assetForm.health_percentage),
                      Number(assetForm.rul_days),
                    );
                    return (
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                          derived === "critical"
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : derived === "warning"
                              ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                              : "bg-emerald/10 text-emerald border-emerald/20"
                        }`}
                      >
                        {derived}
                      </span>
                    );
                  })()}
                </div>
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
                <Combobox
                  options={assets.map((a) => ({
                    value: a.id,
                    label: `${a.asset_code} — ${a.name}`,
                    searchString: `${a.asset_code} ${a.name}`,
                  }))}
                  value={woForm.asset_id}
                  onChange={(val) => setWoForm({ ...woForm, asset_id: val })}
                  emptyText="No assets yet — add one first"
                  placeholder="Select Target Asset..."
                />
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
                <div className="relative">
                  <input
                    placeholder="Search engineer by name or email…"
                    value={assigneeSearch}
                    onChange={(e) => setAssigneeSearch(e.target.value)}
                    className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent text-xs"
                  />
                  {assigneeSearch.trim() && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto p-1.5 space-y-1">
                      {engineers
                        .filter(
                          (eng) =>
                            eng.full_name
                              ?.toLowerCase()
                              .includes(assigneeSearch.toLowerCase()) ||
                            eng.email
                              ?.toLowerCase()
                              .includes(assigneeSearch.toLowerCase()),
                        )
                        .map((eng) => (
                          <button
                            key={eng.user_id}
                            type="button"
                            onClick={() => {
                              setWoForm({
                                ...woForm,
                                assignee_id: eng.user_id,
                                assigned_to: eng.full_name,
                              });
                              setAssigneeSearch(eng.full_name);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-muted transition flex justify-between items-center ${
                              woForm.assignee_id === eng.user_id
                                ? "bg-accent/10 text-accent font-bold"
                                : ""
                            }`}
                          >
                            <div className="flex flex-col text-left">
                              <div className="flex items-center gap-1.5">
                                <span>{eng.full_name}</span>
                                <span className="text-[9px] px-1 py-0.2 bg-accent/10 text-accent rounded font-medium">
                                  Maintenance Engineer
                                </span>
                              </div>
                              <span className="text-[10px] opacity-60 font-normal">
                                {eng.email}
                              </span>
                            </div>
                          </button>
                        ))}
                      {engineers.filter(
                        (eng) =>
                          eng.full_name
                            ?.toLowerCase()
                            .includes(assigneeSearch.toLowerCase()) ||
                          eng.email
                            ?.toLowerCase()
                            .includes(assigneeSearch.toLowerCase()),
                      ).length === 0 && (
                        <div className="text-muted-foreground italic text-center py-2 text-[10px]">
                          No engineers match search
                        </div>
                      )}
                    </div>
                  )}
                  {/* Selected engineer display badge if search is empty */}
                  {!assigneeSearch.trim() && woForm.assigned_to && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-accent bg-accent/10 w-fit px-2 py-0.5 rounded">
                      <span>Assigned: {woForm.assigned_to}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setWoForm({
                            ...woForm,
                            assignee_id: "",
                            assigned_to: "",
                          });
                          setAssigneeSearch("");
                        }}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
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
                  <Combobox
                    options={spareParts.map((s) => ({
                      value: s.id,
                      label: `${s.part_code} — ${s.name}`,
                      searchString: `${s.part_code} ${s.name}`,
                    }))}
                    value={spForm.id}
                    onChange={(val) => {
                      const selectedPart = spareParts.find((p) => p.id === val);
                      setSpForm({
                        ...spForm,
                        id: val,
                        name: selectedPart?.name || "",
                        current_quantity: selectedPart?.current_quantity || 0,
                        min_quantity: selectedPart?.min_quantity || 0,
                      });
                    }}
                    placeholder="Select Spare Part..."
                  />
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
                <Combobox
                  options={assets.map((a) => ({
                    value: a.id,
                    label: `${a.asset_code} — ${a.name}`,
                    searchString: `${a.asset_code} ${a.name}`,
                  }))}
                  value={rcaForm.asset_id}
                  onChange={(val) => setRcaForm({ ...rcaForm, asset_id: val })}
                  emptyText="No assets yet — add one first"
                  placeholder="Select Asset..."
                />
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
      {/* COMPLETE INSPECTION MODAL */}
      {showCompleteInspectModal && completingInspection && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={submitCompleteInspection}
            className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => {
                setShowCompleteInspectModal(false);
                setCompletingInspection(null);
              }}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold">
              Complete Inspection
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="block text-muted-foreground font-semibold">
                  Inspection Name
                </span>
                <span className="text-foreground">
                  {completingInspection.name}
                </span>
              </div>
              <div>
                <span className="block text-muted-foreground font-semibold">
                  Framework
                </span>
                <span className="text-foreground">
                  {completingInspection.framework}
                </span>
              </div>
              {completingInspection.scope && (
                <div>
                  <span className="block text-muted-foreground font-semibold">
                    Scope / Instructions
                  </span>
                  <span className="text-foreground italic">
                    {completingInspection.scope}
                  </span>
                </div>
              )}
              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">
                  Result
                </label>
                <div className="flex gap-4">
                  {["Pass", "Fail", "Needs Follow-up"].map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="inspectResult"
                        value={opt}
                        checked={completeForm.result === opt}
                        onChange={(e) =>
                          setCompleteForm({
                            ...completeForm,
                            result: e.target.value,
                          })
                        }
                        className="accent-accent"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">
                  Findings / Notes
                </label>
                <textarea
                  required
                  placeholder="Record your inspection observations, notes, or findings..."
                  value={completeForm.findings}
                  onChange={(e) =>
                    setCompleteForm({
                      ...completeForm,
                      findings: e.target.value,
                    })
                  }
                  className="w-full h-24 rounded-lg bg-background border border-border p-2 outline-none focus:border-accent text-xs"
                />
              </div>
              {isInspectionOverdue(completingInspection) && (
                <div>
                  <label className="block text-amber-500 mb-1 font-semibold">
                    Reason for Delay (Overdue Inspection)
                  </label>
                  <textarea
                    required
                    placeholder="Provide a reason for why this inspection is overdue..."
                    value={completeForm.delayReason}
                    onChange={(e) =>
                      setCompleteForm({
                        ...completeForm,
                        delayReason: e.target.value,
                      })
                    }
                    className="w-full h-16 rounded-lg bg-background border border-amber-500/30 p-2 outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-8"
                onClick={() => {
                  setShowCompleteInspectModal(false);
                  setCompletingInspection(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full text-xs h-8 btn-hero">
                Submit Findings
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
