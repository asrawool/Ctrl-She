import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { ShieldCheck, AlertTriangle, CheckCircle2, Clock, FileCheck } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/app/quality")({
  head: () => ({ meta: [{ title: "Quality & Compliance — IntelliPlant AI" }] }),
  component: Page,
});

const frameworks = [
  { n:"Factory Act", s:98, tone:"emerald" }, { n:"OISD", s:94, tone:"emerald" },
  { n:"PESO", s:88, tone:"emerald" }, { n:"ISO 9001", s:96, tone:"emerald" },
  { n:"ISO 14001", s:91, tone:"emerald" }, { n:"ISO 45001", s:83, tone:"warning" },
  { n:"Environmental", s:79, tone:"warning" }, { n:"OSHA-equiv", s:92, tone:"emerald" },
];
const trend = [{m:"Jan",s:88},{m:"Feb",s:90},{m:"Mar",s:91},{m:"Apr",s:93},{m:"May",s:95},{m:"Jun",s:97}];

function Page() {
  return (
    <>
      <PageHeader title="Quality & Compliance" description="Real-time compliance posture across regulatory frameworks with CAPA, audits and non-conformance tracking." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { i: ShieldCheck, l:"Overall Score", v:"97/100", tone:"emerald" },
          { i: FileCheck, l:"Open CAPAs", v:"14", tone:"cyan" },
          { i: AlertTriangle, l:"NCRs This Month", v:"6", tone:"warning" },
          { i: CheckCircle2, l:"Audit Readiness", v:"92%", tone:"emerald" },
        ].map(({ i:I, l, v, tone }) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-4">
            <div className={`grid h-9 w-9 place-items-center rounded-lg ${tone==="emerald"?"bg-emerald/10 text-emerald":tone==="warning"?"bg-orange-500/10 text-orange-500":"bg-accent/10 text-accent"}`}>
              <I className="h-4.5 w-4.5" />
            </div>
            <div className="mt-3 font-display text-2xl font-bold">{v}</div>
            <div className="text-xs text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h3 className="font-display font-semibold mb-4">Compliance by Framework</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {frameworks.map((f) => (
              <div key={f.n} className="rounded-xl border border-border p-3">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-semibold text-sm">{f.n}</span>
                  <span className={`font-display text-lg font-bold ${f.tone==="warning"?"text-orange-500":"text-emerald"}`}>{f.s}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${f.tone==="warning"?"bg-orange-500":"bg-emerald"}`} style={{ width:`${f.s}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-4">Compliance Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="m" fontSize={11} /><YAxis fontSize={11} domain={[80,100]} />
              <Tooltip />
              <Line type="monotone" dataKey="s" stroke="#18C37E" strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-4">Inspection Schedule</h3>
          <div className="space-y-3">
            {[
              { t:"Boiler Pressure Test", d:"Today", by:"PESO" },
              { t:"Fire Safety Audit", d:"3 days", by:"HSE" },
              { t:"Emission Monitoring", d:"7 days", by:"Environmental" },
              { t:"Internal ISO Audit", d:"14 days", by:"QA" },
            ].map((it,i)=>(
              <div key={i} className="flex items-center gap-3 border-b border-border last:border-0 py-2">
                <Clock className="h-4 w-4 text-accent" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{it.t}</div>
                  <div className="text-xs text-muted-foreground">{it.by}</div>
                </div>
                <span className="text-xs font-semibold">{it.d}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-4">Non-Conformance Reports</h3>
          <div className="space-y-2.5">
            {[
              { id:"NCR-2024-042", t:"Missing calibration record for gauge PG-201", sev:"High", s:"Open" },
              { id:"NCR-2024-041", t:"SOP deviation in reactor cleaning", sev:"Medium", s:"In Review" },
              { id:"NCR-2024-040", t:"Documented training gap — 3 operators", sev:"Low", s:"Closed" },
            ].map((n)=>(
              <div key={n.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                  <span>{n.id}</span>
                  <span className={`rounded-full px-2 py-0.5 ${n.sev==="High"?"bg-destructive/10 text-destructive":n.sev==="Medium"?"bg-orange-500/10 text-orange-500":"bg-emerald/10 text-emerald"}`}>{n.sev}</span>
                </div>
                <div className="mt-1 text-sm">{n.t}</div>
                <div className="mt-1 text-xs text-muted-foreground">{n.s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
