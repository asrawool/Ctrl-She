import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Wrench, Activity, Clock, AlertTriangle, TrendingDown, Package, Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/app/maintenance")({
  head: () => ({ meta: [{ title: "Maintenance Intelligence — IntelliPlant AI" }] }),
  component: Page,
});

const equip = [
  { id:"P-401", name:"Centrifugal Pump", health:82, rul:145, status:"warning" },
  { id:"C-12", name:"Screw Compressor", health:94, rul:320, status:"healthy" },
  { id:"HX-7", name:"Heat Exchanger", health:67, rul:52, status:"critical" },
  { id:"R-3", name:"Batch Reactor", health:88, rul:210, status:"healthy" },
];
const vibration = [
  { t:"Mon", v:2.1 },{t:"Tue",v:2.3},{t:"Wed",v:2.6},{t:"Thu",v:3.1},{t:"Fri",v:3.8},{t:"Sat",v:4.2},{t:"Sun",v:4.6},
];

function Page() {
  return (
    <>
      <PageHeader title="Maintenance Intelligence" description="Predictive analytics, RUL forecasting, RCA and spare parts optimization across your asset base." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {equip.map((e) => (
          <div key={e.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{e.id}</div>
                <div className="font-display font-bold">{e.name}</div>
              </div>
              <span className={`grid h-8 w-8 place-items-center rounded-lg ${e.status==="critical"?"bg-destructive/10 text-destructive":e.status==="warning"?"bg-orange-500/10 text-orange-500":"bg-emerald/10 text-emerald"}`}>
                <Activity className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between text-xs mb-1">
                <span className="font-medium">Asset Health</span><span className="font-bold">{e.health}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${e.status==="critical"?"bg-destructive":e.status==="warning"?"bg-orange-500":"bg-emerald"}`} style={{width:`${e.health}%`}} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> RUL: <b className="text-foreground">{e.rul} days</b>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-destructive" /> Vibration Trend — P-401</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={vibration}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="t" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="v" stroke="#F31260" strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> AI Recommendations</h3>
          <div className="space-y-2.5 text-sm">
            {[
              { t:"Reduce P-401 lubrication interval to 1,400h", conf:"94%" },
              { t:"Order 2× bearing 6316-C3 for HX-7", conf:"88%" },
              { t:"Schedule inspection of C-12 filters", conf:"81%" },
            ].map((r,i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <div className="text-sm">{r.t}</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-bold text-emerald border border-emerald/20">{r.conf}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-4">Maintenance Timeline</h3>
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-1 before:bottom-1 before:w-0.5 before:bg-border">
            {[
              { d:"Today", t:"Preventive: P-401 lubrication", tone:"cyan" },
              { d:"2d", t:"Predictive: HX-7 gasket replacement", tone:"warning" },
              { d:"5d", t:"Inspection: C-12 vibration analysis", tone:"cyan" },
              { d:"12d", t:"Preventive: R-3 seal check", tone:"emerald" },
            ].map((e,i) => (
              <div key={i} className="relative">
                <span className={`absolute -left-6 top-1 grid h-4 w-4 place-items-center rounded-full ${e.tone==="warning"?"bg-orange-500":e.tone==="emerald"?"bg-emerald":"bg-accent"}`} />
                <div className="text-[10px] uppercase font-bold text-muted-foreground">{e.d}</div>
                <div className="text-sm font-medium">{e.t}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Package className="h-4 w-4 text-accent" /> Spare Parts</h3>
          <div className="space-y-2">
            {[
              { p:"Bearing 6316-C3", stock:4, min:8, tone:"destructive" },
              { p:"Mechanical Seal MS-201", stock:12, min:6, tone:"emerald" },
              { p:"Gasket 8\" ANSI", stock:22, min:10, tone:"emerald" },
              { p:"Filter Element FE-77", stock:3, min:10, tone:"destructive" },
            ].map((s) => (
              <div key={s.p} className="flex items-center justify-between text-sm border-b border-border last:border-0 py-2">
                <div>
                  <div className="font-medium">{s.p}</div>
                  <div className="text-xs text-muted-foreground">Min: {s.min}</div>
                </div>
                <span className={`font-display text-lg font-bold ${s.tone==="destructive"?"text-destructive":"text-emerald"}`}>{s.stock}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" /> Root Cause Analysis — IR-2024-118</h3>
        <div className="grid gap-4 md:grid-cols-3 text-sm">
          <RcaCol title="Symptom" items={["Excessive vibration >4.2 mm/s","Temperature rise 12°C above baseline","Abnormal noise"]} />
          <RcaCol title="Root Cause" items={["Bearing starvation","Lube interval too long (2000h)","High-vibration operating regime"]} />
          <RcaCol title="Action" items={["Reduce lube interval to 1400h","Install vibration monitoring","Update SOP §6.3"]} />
        </div>
      </div>
    </>
  );
}
function RcaCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2">{title}</div>
      <ul className="space-y-1.5 text-sm">{items.map((i)=><li key={i} className="flex gap-2"><Wrench className="h-3 w-3 mt-1 text-accent shrink-0" /><span>{i}</span></li>)}</ul>
    </div>
  );
}
