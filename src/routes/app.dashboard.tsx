import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState, useEffect, useMemo } from "react";
import {
  Activity,
  FileText,
  MessageSquare,
  ShieldCheck,
  Zap,
  ClipboardList,
  Bell,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from "recharts";
import { PageHeader } from "@/components/app/PageHeader";
import { useAuth, ROLES } from "@/store/auth";
import { supabase } from "@/lib/supabase";
import {
  Asset,
  WorkOrder,
  Notification,
  ComplianceFramework,
  Reminder,
} from "@/types/operational";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — IntelliPlant AI" }] }),
  component: Dashboard,
});

const monthlyTrend = [
  { m: "Jan", health: 82, failures: 12 },
  { m: "Feb", health: 85, failures: 10 },
  { m: "Mar", health: 79, failures: 15 },
  { m: "Apr", health: 88, failures: 8 },
  { m: "May", health: 91, failures: 6 },
  { m: "Jun", health: 94, failures: 4 },
];

function Dashboard() {
  const { email, role, customRole } = useAuth();
  const navigate = useNavigate();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [docCount, setDocCount] = useState(0);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar modal state
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [reminderForm, setReminderForm] = useState({
    description: "",
    due_at: "",
  });
  const [savingReminder, setSavingReminder] = useState(false);

  const roleLabel =
    role === "other" ? customRole : ROLES.find((r) => r.id === role)?.label;
  const name = email?.split("@")[0] ?? "Engineer";

  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [
        { data: astData },
        { count: docTotal },
        { data: woData },
        { data: notifData },
        { data: fwData },
        { data: reminderData },
      ] = await Promise.all([
        supabase.from("assets").select("*"),
        supabase.from("documents").select("*", { count: "exact", head: true }),
        supabase
          .from("work_orders")
          .select("*")
          .order("due_date", { ascending: true }),
        user
          ? supabase
              .from("notifications")
              .select("*")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(5)
          : Promise.resolve({ data: [] }),
        supabase.from("compliance_frameworks").select("*"),
        user
          ? supabase
              .from("reminders")
              .select("*")
              .eq("user_id", user.id)
              .order("due_at", { ascending: true })
          : Promise.resolve({ data: [] }),
      ]);

      setAssets(astData || []);
      setDocCount(docTotal || 0);
      setWorkOrders(woData || []);
      setNotifications(notifData || []);
      setFrameworks(fwData || []);
      setReminders(reminderData || []);

      // Check for due reminders and notify — item 5e (at due time, no lead-time)
      if (user && reminderData && reminderData.length > 0) {
        const now = new Date();
        const dueNow = reminderData.filter(
          (r: Reminder) => !r.is_notified && new Date(r.due_at) <= now,
        );
        if (dueNow.length > 0) {
          await Promise.all(
            dueNow.map((r: Reminder) =>
              supabase.from("notifications").insert({
                user_id: user.id,
                title: `Reminder due: ${r.description.slice(0, 60)}`,
                message: `Your reminder "${r.description}" was due at ${new Date(r.due_at).toLocaleString()}.`,
                type: "info",
                metadata: { category: "maintenance", priority: "medium" },
                is_read: false,
              }),
            ),
          );
          await supabase
            .from("reminders")
            .update({ is_notified: true })
            .in(
              "id",
              dueNow.map((r: Reminder) => r.id),
            );
          setReminders((prev) =>
            prev.map((r) =>
              dueNow.some((d: Reminder) => d.id === r.id)
                ? { ...r, is_notified: true }
                : r,
            ),
          );
        }
      }
    } catch (err) {
      console.error("Dashboard data fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute live KPI values
  const avgHealth = useMemo(() => {
    if (assets.length === 0) return 92;
    return Math.round(
      assets.reduce((sum, a) => sum + a.health_percentage, 0) / assets.length,
    );
  }, [assets]);

  const activeWorkOrders = useMemo(() => {
    return workOrders.filter(
      (w) => w.status === "Pending" || w.status === "Scheduled",
    );
  }, [workOrders]);

  const overallCompliance = useMemo(() => {
    if (frameworks.length === 0) return 97;
    return Math.round(
      frameworks.reduce((sum, f) => sum + f.current_score, 0) /
        frameworks.length,
    );
  }, [frameworks]);

  // Compute status distributions
  const statusCounts = useMemo(() => {
    const counts = { healthy: 0, warning: 0, critical: 0, offline: 0 };
    assets.forEach((a) => {
      if (a.status === "healthy") counts.healthy++;
      else if (a.status === "warning") counts.warning++;
      else if (a.status === "critical") counts.critical++;
      else counts.offline++;
    });
    // Add default seeds if empty
    if (assets.length === 0) {
      return { healthy: 1104, warning: 124, critical: 38, offline: 18 };
    }
    return counts;
  }, [assets]);

  const totalAssets = assets.length || 1284;

  const failureDistribution = [
    { name: "Bearing", value: 34, color: "#00C2FF" },
    { name: "Seal", value: 22, color: "#18C37E" },
    { name: "Electrical", value: 18, color: "#F5A524" },
    { name: "Cavitation", value: 14, color: "#F31260" },
    { name: "Other", value: 12, color: "#71717A" },
  ];

  const barChartDepartments = [
    { d: "Pumps", oee: 87 },
    { d: "Compressors", oee: 79 },
    { d: "Heat Exch.", oee: 82 },
    { d: "Reactors", oee: 91 },
    { d: "Utilities", oee: 84 },
  ];

  const handleQuickAction = (label: string) => {
    if (label === "Ask Copilot") navigate({ to: "/app/copilot" });
    else if (label === "Upload Doc") navigate({ to: "/app/documents" });
    else if (label === "Log Work Order") navigate({ to: "/app/maintenance" });
    else if (label === "Report Incident") navigate({ to: "/app/quality" });
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
        title={`Welcome back, ${name.charAt(0).toUpperCase() + name.slice(1)}`}
        description={`${roleLabel} · Plant Alpha · Shift A · ${new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}`}
      />

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Activity}
          label="Avg Asset Health"
          value={`${avgHealth}%`}
          delta="+2.1%"
          tone="emerald"
        />
        <Kpi
          icon={FileText}
          label="Documents Cataloged"
          value={docCount.toLocaleString()}
          delta={`+${docCount}`}
          tone="cyan"
        />
        <Kpi
          icon={MessageSquare}
          label="Open Work Orders"
          value={activeWorkOrders.length.toString()}
          delta={`${activeWorkOrders.length} active`}
          tone="cyan"
        />
        <Kpi
          icon={ShieldCheck}
          label="Compliance Score"
          value={`${overallCompliance}/100`}
          delta="+1.2"
          tone="emerald"
        />
      </div>

      {/* Row 2 */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Equipment Health Trend" subtitle="6-month rolling average">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="m" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="health"
                stroke="#00C2FF"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Failure Distribution" subtitle="Last 90 days">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={failureDistribution}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={80}
              >
                {failureDistribution.map((f) => (
                  <Cell key={f.name} fill={f.color} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title="Equipment Status"
          subtitle={`${totalAssets} assets monitored`}
        >
          <div className="space-y-2.5">
            <StatusRow
              label="Healthy"
              count={statusCounts.healthy}
              pct={Math.round((statusCounts.healthy / totalAssets) * 100) || 86}
              tone="emerald"
            />
            <StatusRow
              label="Warning"
              count={statusCounts.warning}
              pct={Math.round((statusCounts.warning / totalAssets) * 100) || 10}
              tone="warning"
            />
            <StatusRow
              label="Critical"
              count={statusCounts.critical}
              pct={Math.round((statusCounts.critical / totalAssets) * 100) || 3}
              tone="danger"
            />
            <StatusRow
              label="Offline"
              count={statusCounts.offline}
              pct={Math.round((statusCounts.offline / totalAssets) * 100) || 1}
              tone="muted"
            />
          </div>
        </Card>
      </div>

      {/* Row 3 */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card
          title="OEE by Department"
          subtitle="Current shift"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barChartDepartments}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="d" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="oee" fill="#00C2FF" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Quick Actions">
          <div className="grid grid-cols-2 gap-2">
            {[
              { i: Zap, l: "Ask Copilot" },
              { i: FileText, l: "Upload Doc" },
              { i: Wrench, l: "Log Work Order" },
              { i: AlertTriangle, l: "Report Incident" },
            ].map(({ i: I, l }) => (
              <button
                key={l}
                onClick={() => handleQuickAction(l)}
                className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-3 text-left hover:border-accent hover:bg-accent/5 transition w-full"
              >
                <I className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold">{l}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 4 */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card
          title="Active Work Orders"
          subtitle={`${activeWorkOrders.length} pending`}
          className="lg:col-span-2"
        >
          <div className="divide-y divide-border">
            {activeWorkOrders.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4">
                No active work orders.
              </p>
            ) : (
              activeWorkOrders.slice(0, 4).map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-3 py-2.5 text-sm"
                >
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{w.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {w.id} · {w.asset_id} · {w.type}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      w.priority === "Critical"
                        ? "bg-destructive/10 text-destructive"
                        : w.priority === "High"
                          ? "bg-orange-500/10 text-orange-600"
                          : w.priority === "Medium"
                            ? "bg-accent/10 text-accent"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {w.priority}
                  </span>
                  <span className="text-xs font-medium w-24 text-right text-muted-foreground">
                    {w.due_date
                      ? new Date(w.due_date).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Notifications */}
        <Card title="Recent Notifications">
          <div className="space-y-2.5">
            {notifications.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4">
                No recent notifications.
              </p>
            ) : (
              notifications.slice(0, 4).map((n, i) => {
                const I =
                  n.type === "warning"
                    ? AlertTriangle
                    : n.type === "error"
                      ? AlertTriangle
                      : Bell;
                return (
                  <div key={i} className="flex items-start gap-2.5 text-sm">
                    <I
                      className={`h-4 w-4 mt-0.5 shrink-0 ${
                        n.type === "warning"
                          ? "text-orange-500"
                          : n.type === "error"
                            ? "text-destructive"
                            : "text-accent"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate font-medium">
                        {n.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {n.message}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Row 5 */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Knowledge Coverage" subtitle="Documents mapped to assets">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { l: "Manuals", v: "98%" },
              { l: "SOPs", v: "92%" },
              { l: "P&IDs", v: "87%" },
              { l: "Incidents", v: "100%" },
              { l: "Audits", v: "94%" },
              { l: "Training", v: "81%" },
            ].map((k) => (
              <div key={k.l} className="rounded-xl bg-muted/40 p-3">
                <div className="font-display text-xl font-bold text-accent">
                  {k.v}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                  {k.l}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Maintenance Calendar"
          subtitle="Next 7 days — click to open"
          onClick={() => setShowCalendar(true)}
        >
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() + i);
              const count = activeWorkOrders.filter((w) => {
                if (!w.due_date) return false;
                const woDate = new Date(w.due_date).toDateString();
                return woDate === d.toDateString();
              }).length;
              // Dot for days with a reminder — item 5b
              const hasReminder = reminders.some((r) => {
                const rd = new Date(r.due_at);
                return rd.toDateString() === d.toDateString();
              });
              return (
                <div
                  key={i}
                  className={`rounded-lg border border-border p-2 text-center ${
                    i === 0 ? "bg-accent/5 border-accent" : ""
                  }`}
                >
                  <div className="text-[10px] uppercase text-muted-foreground">
                    {d.toLocaleDateString("en", { weekday: "short" })}
                  </div>
                  <div className="font-display font-bold">{d.getDate()}</div>
                  <div className="mt-1 text-[10px] h-4 flex items-center justify-center gap-1">
                    {count > 0 && (
                      <span className="inline-block rounded-full bg-accent/15 text-accent px-1.5 font-bold">
                        {count}
                      </span>
                    )}
                    {hasReminder && (
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400"
                        title="Reminder"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <p className="mt-8 text-[11px] text-muted-foreground italic border-l-2 border-accent/40 pl-3 max-w-2xl">
        AI insights on this dashboard are intended to assist decision-making.
        Verify recommendations using official engineering procedures before
        operational or safety-critical actions.
      </p>

      {/* ── Full Calendar Modal — item 5c/d/e ───────────────────────────── */}
      {showCalendar && (
        <CalendarModal
          calendarDate={calendarDate}
          setCalendarDate={setCalendarDate}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          reminders={reminders}
          activeWorkOrders={activeWorkOrders}
          reminderForm={reminderForm}
          setReminderForm={setReminderForm}
          savingReminder={savingReminder}
          onClose={() => {
            setShowCalendar(false);
            setSelectedDay(null);
          }}
          onSaveReminder={async () => {
            if (!reminderForm.description.trim() || !reminderForm.due_at)
              return;
            setSavingReminder(true);
            try {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user) return;
              const { data, error } = await supabase
                .from("reminders")
                .insert({
                  user_id: user.id,
                  description: reminderForm.description.trim(),
                  due_at: new Date(reminderForm.due_at).toISOString(),
                  is_notified: false,
                })
                .select()
                .single();
              if (error) throw error;
              setReminders((prev) => [...prev, data as Reminder]);
              setReminderForm({ description: "", due_at: "" });
              setSelectedDay(null);
            } catch (err) {
              console.error("Failed to save reminder:", err);
            } finally {
              setSavingReminder(false);
            }
          }}
        />
      )}
    </>
  );
}

function Kpi({
  icon: I,
  label,
  value,
  delta,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta: string;
  tone: "emerald" | "cyan";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4 hover:shadow-md transition"
    >
      <div className="flex items-start justify-between">
        <div
          className={`grid h-9 w-9 place-items-center rounded-lg ${
            tone === "emerald"
              ? "bg-emerald/10 text-emerald"
              : "bg-accent/10 text-accent"
          }`}
        >
          <I className="h-4.5 w-4.5" />
        </div>
        <span
          className={`text-xs font-bold ${tone === "emerald" ? "text-emerald" : "text-accent"}`}
        >
          {delta}
        </span>
      </div>
      <div className="mt-3 font-display text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </motion.div>
  );
}

function Card({
  title,
  subtitle,
  children,
  className = "",
  onClick,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card p-5 ${className} ${onClick ? "cursor-pointer hover:border-accent transition-colors" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display font-semibold">{title}</h3>
        {subtitle && (
          <span className="text-[11px] text-muted-foreground">{subtitle}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function StatusRow({
  label,
  count,
  pct,
  tone,
}: {
  label: string;
  count: number;
  pct: number;
  tone: "emerald" | "warning" | "danger" | "muted";
}) {
  const c = {
    emerald: "bg-emerald",
    warning: "bg-orange-500",
    danger: "bg-destructive",
    muted: "bg-muted-foreground",
  }[tone];
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {count} · {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${c}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Full Calendar Modal — item 5c/d ─────────────────────────────────────────
function CalendarModal({
  calendarDate,
  setCalendarDate,
  selectedDay,
  setSelectedDay,
  reminders,
  activeWorkOrders,
  reminderForm,
  setReminderForm,
  savingReminder,
  onClose,
  onSaveReminder,
}: {
  calendarDate: Date;
  setCalendarDate: (d: Date) => void;
  selectedDay: Date | null;
  setSelectedDay: (d: Date | null) => void;
  reminders: Reminder[];
  activeWorkOrders: WorkOrder[];
  reminderForm: { description: string; due_at: string };
  setReminderForm: (f: { description: string; due_at: string }) => void;
  savingReminder: boolean;
  onClose: () => void;
  onSaveReminder: () => void;
}) {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    const d = new Date(year, month - 1, 1);
    setCalendarDate(d);
  };
  const nextMonth = () => {
    const d = new Date(year, month + 1, 1);
    setCalendarDate(d);
  };

  const monthLabel = calendarDate.toLocaleDateString("en", {
    month: "long",
    year: "numeric",
  });

  const dayCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const remindersByDay = (day: number) =>
    reminders.filter((r) => {
      const d = new Date(r.due_at);
      return (
        d.getFullYear() === year &&
        d.getMonth() === month &&
        d.getDate() === day
      );
    });

  const ordersByDay = (day: number) =>
    activeWorkOrders.filter((w) => {
      if (!w.due_date) return false;
      const d = new Date(w.due_date);
      return (
        d.getFullYear() === year &&
        d.getMonth() === month &&
        d.getDate() === day
      );
    });

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day;

  const handleDayClick = (day: number) => {
    const d = new Date(year, month, day, 9, 0);
    setSelectedDay(d);
    // Pre-fill the datetime field with the selected day at 09:00
    const isoLocal = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T09:00`;
    setReminderForm({ description: "", due_at: isoLocal });
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-bold">
            Maintenance Calendar
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold w-36 text-center">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="text-center text-[10px] uppercase tracking-wider text-muted-foreground py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {dayCells.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} />;
            const dayReminders = remindersByDay(day);
            const dayOrders = ordersByDay(day);
            const isSelected =
              selectedDay?.getFullYear() === year &&
              selectedDay?.getMonth() === month &&
              selectedDay?.getDate() === day;

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDayClick(day)}
                className={`rounded-lg border p-1.5 text-center min-h-[56px] flex flex-col items-center transition ${
                  isSelected
                    ? "border-accent bg-accent/10"
                    : isToday(day)
                      ? "border-accent/50 bg-accent/5"
                      : "border-border hover:border-accent/40 hover:bg-muted/40"
                }`}
              >
                <span
                  className={`text-xs font-bold ${isToday(day) ? "text-accent" : ""}`}
                >
                  {day}
                </span>
                <div className="flex items-center gap-0.5 mt-1 flex-wrap justify-center">
                  {dayOrders.length > 0 && (
                    <span className="rounded-full bg-accent/15 text-accent text-[9px] font-bold px-1">
                      {dayOrders.length}
                    </span>
                  )}
                  {dayReminders.map((r) => (
                    <span
                      key={r.id}
                      className="h-1.5 w-1.5 rounded-full bg-orange-400"
                      title={r.description}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="rounded-full bg-accent/15 text-accent font-bold px-1.5">
              N
            </span>
            Work orders due
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-orange-400 inline-block" />
            Reminder
          </div>
        </div>

        {/* Add reminder form — appears when a day is selected */}
        {selectedDay && (
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">
                Add reminder for{" "}
                {selectedDay.toLocaleDateString("en", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">
                  Description
                </label>
                <input
                  placeholder="e.g. Check pressure relief valves"
                  value={reminderForm.description}
                  onChange={(e) =>
                    setReminderForm({
                      ...reminderForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Due date & time
                </label>
                <input
                  type="datetime-local"
                  value={reminderForm.due_at}
                  onChange={(e) =>
                    setReminderForm({ ...reminderForm, due_at: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent text-foreground"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="flex-1 h-8 rounded-lg border border-border text-xs font-medium hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  savingReminder ||
                  !reminderForm.description.trim() ||
                  !reminderForm.due_at
                }
                onClick={onSaveReminder}
                className="flex-1 h-8 rounded-lg bg-accent text-accent-foreground text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50 hover:opacity-90 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                {savingReminder ? "Saving…" : "Save Reminder"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
