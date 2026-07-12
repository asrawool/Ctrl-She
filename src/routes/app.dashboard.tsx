import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Activity, FileText, MessageSquare, ShieldCheck, Zap, ClipboardList, Bell,
  Library, Wrench, AlertTriangle, TrendingUp, CheckCircle2,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, Legend } from "recharts";
import { PageHeader } from "@/components/app/PageHeader";
import { useAuth, ROLES } from "@/store/auth";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — IntelliPlant AI" }] }),
  component: Dashboard,
});

const trend = [
  { m: "Jan", health: 82, failures: 12 },{ m: "Feb", health: 85, failures: 10 },
  { m: "Mar", health: 79, failures: 15 },{ m: "Apr", health: 88, failures: 8 },
  { m: "May", health: 91, failures: 6 },{ m: "Jun", health: 94, failures: 4 },
];
const failures = [
  { name: "Bearing", value: 34, color: "#00C2FF" },
  { name: "Seal", value: 22, color: "#18C37E" },
  { name: "Electrical", value: 18, color: "#F5A524" },
  { name: "Cavitation", value: 14, color: "#F31260" },
  { name: "Other", value: 12, color: "#71717A" },
];
const departments = [
  { d: "Pumps", oee: 87 },{ d: "Compressors", oee: 79 },
  { d: "Heat Exch.", oee: 82 },{ d: "Reactors", oee: 91 },{ d: "Utilities", oee: 84 },
];

function Dashboard() {
  const { email, role, customRole } = useAuth();
  const roleLabel = role === "other" ? customRole : ROLES.find((r) => r.id === role)?.label;
  const name = email?.split("@")[0] ?? "Engineer";

  return (
    <>
      <PageHeader
        title={`Welcome back, ${name.charAt(0).toUpperCase()+name.slice(1)}`}
        description={`${roleLabel} · Plant Alpha · Shift A · ${new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}`}
      />

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Activity} label="Asset Health" value="94.2%" delta="+2.1%" tone="emerald" />
        <Kpi icon={FileText} label="Documents Uploaded" value="12,842" delta="+128" tone="cyan" />
        <Kpi icon={MessageSquare} label="AI Queries Today" value="486" delta="+62" tone="cyan" />
        <Kpi icon={ShieldCheck} label="Compliance Score" value="97/100" delta="+1.2" tone="emerald" />
      </div>

      {/* Row 2 */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Equipment Health Trend" subtitle="6-month rolling average">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="m" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="health" stroke="#00C2FF" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Failure Distribution" subtitle="Last 90 days">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={failures} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                {failures.map((f) => <Cell key={f.name} fill={f.color} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Equipment Status" subtitle="1,284 assets monitored">
          <div className="space-y-2.5">
            <StatusRow label="Healthy" count={1104} pct={86} tone="emerald" />
            <StatusRow label="Warning" count={124} pct={10} tone="warning" />
            <StatusRow label="Critical" count={38} pct={3} tone="danger" />
            <StatusRow label="Offline" count={18} pct={1} tone="muted" />
          </div>
        </Card>
      </div>

      {/* Row 3 */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="OEE by Department" subtitle="Current shift" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={departments}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="d" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="oee" fill="#00C2FF" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Quick Actions">
          <div className="grid grid-cols-2 gap-2">
            {[{i:Zap,l:"Ask Copilot"},{i:FileText,l:"Upload Doc"},{i:Wrench,l:"Log Work Order"},{i:AlertTriangle,l:"Report Incident"}].map(({i:I,l})=>(
              <button key={l} className="flex flex-col items-start gap-2 rounded-xl border border-border p-3 text-left hover:border-accent hover:bg-accent/5 transition">
                <I className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold">{l}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 4 */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Active Work Orders" subtitle="12 open" className="lg:col-span-2">
          <div className="divide-y divide-border">
            {[
              { id: "WO-4821", asset: "Pump P-401", type: "Preventive", pri: "High", due: "Today" },
              { id: "WO-4820", asset: "Compressor C-12", type: "Corrective", pri: "Critical", due: "2h" },
              { id: "WO-4818", asset: "Heat Exchanger HX-7", type: "Inspection", pri: "Medium", due: "Tomorrow" },
              { id: "WO-4815", asset: "Reactor R-3", type: "Predictive", pri: "Low", due: "5d" },
            ].map((w) => (
              <div key={w.id} className="flex items-center gap-3 py-2.5 text-sm">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{w.asset}</div>
                  <div className="text-xs text-muted-foreground">{w.id} · {w.type}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  w.pri==="Critical" ? "bg-destructive/10 text-destructive" :
                  w.pri==="High" ? "bg-orange-500/10 text-orange-600" :
                  w.pri==="Medium" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                }`}>{w.pri}</span>
                <span className="text-xs font-medium w-16 text-right">{w.due}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Recent Notifications">
          <div className="space-y-2.5">
            {[
              { i: AlertTriangle, t: "Vibration anomaly on P-401", tone: "warning", time: "12m" },
              { i: CheckCircle2, t: "Audit ISO-9001 completed", tone: "emerald", time: "1h" },
              { i: Bell, t: "New SOP uploaded: Reactor start-up", tone: "cyan", time: "3h" },
              { i: TrendingUp, t: "OEE improved 4% this week", tone: "emerald", time: "1d" },
            ].map((n, i) => {
              const I = n.i;
              return (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <I className={`h-4 w-4 mt-0.5 shrink-0 ${
                    n.tone==="warning"?"text-orange-500":n.tone==="emerald"?"text-emerald":"text-accent"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{n.t}</div>
                    <div className="text-[11px] text-muted-foreground">{n.time} ago</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Row 5 */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Knowledge Coverage" subtitle="Documents mapped to assets">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[{l:"Manuals",v:"98%"},{l:"SOPs",v:"92%"},{l:"P&IDs",v:"87%"},{l:"Incidents",v:"100%"},{l:"Audits",v:"94%"},{l:"Training",v:"81%"}].map((k)=>(
              <div key={k.l} className="rounded-xl bg-muted/40 p-3">
                <div className="font-display text-xl font-bold text-accent">{k.v}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{k.l}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Maintenance Calendar" subtitle="Next 7 days">
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({length:7}).map((_,i)=>{
              const d = new Date(); d.setDate(d.getDate()+i);
              const count = [3,1,2,0,4,1,2][i];
              return (
                <div key={i} className={`rounded-lg border border-border p-2 text-center ${i===0?"bg-accent/5 border-accent":""}`}>
                  <div className="text-[10px] uppercase text-muted-foreground">{d.toLocaleDateString("en",{weekday:"short"})}</div>
                  <div className="font-display font-bold">{d.getDate()}</div>
                  <div className="mt-1 text-[10px]">
                    {count>0 && <span className="inline-block rounded-full bg-accent/15 text-accent px-1.5 font-bold">{count}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <p className="mt-8 text-[11px] text-muted-foreground italic border-l-2 border-accent/40 pl-3 max-w-2xl">
        AI insights on this dashboard are intended to assist decision-making. Verify recommendations using official engineering procedures before operational or safety-critical actions.
      </p>
    </>
  );
}

function Kpi({ icon: I, label, value, delta, tone }: { icon: React.ComponentType<{className?:string}>; label: string; value: string; delta: string; tone: "emerald" | "cyan" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4 hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div className={`grid h-9 w-9 place-items-center rounded-lg ${tone==="emerald"?"bg-emerald/10 text-emerald":"bg-accent/10 text-accent"}`}>
          <I className="h-4.5 w-4.5" />
        </div>
        <span className={`text-xs font-bold ${tone==="emerald"?"text-emerald":"text-accent"}`}>{delta}</span>
      </div>
      <div className="mt-3 font-display text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </motion.div>
  );
}

function Card({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display font-semibold">{title}</h3>
        {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function StatusRow({ label, count, pct, tone }: { label: string; count: number; pct: number; tone: "emerald" | "warning" | "danger" | "muted" }) {
  const c = { emerald: "bg-emerald", warning: "bg-orange-500", danger: "bg-destructive", muted: "bg-muted-foreground" }[tone];
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{count} · {pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${c}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
