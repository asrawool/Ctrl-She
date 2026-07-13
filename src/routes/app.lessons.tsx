import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { AlertTriangle, BookOpen, Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/app/lessons")({
  head: () => ({ meta: [{ title: "Lessons Learned — IntelliPlant AI" }] }),
  component: Page,
});

const incidents = [
  {
    d: "Jun 12, 2026",
    t: "Bearing failure on P-401",
    cat: "Mechanical",
    sev: "High",
    cause: "Lube starvation from extended interval",
  },
  {
    d: "May 28, 2026",
    t: "Near-miss: Reactor over-pressure",
    cat: "Process Safety",
    sev: "Critical",
    cause: "PSV setpoint drift",
  },
  {
    d: "May 4, 2026",
    t: "Contaminated batch #B-2418",
    cat: "Quality",
    sev: "Medium",
    cause: "Cross-contamination during changeover",
  },
  {
    d: "Apr 19, 2026",
    t: "HVAC downtime — clean room",
    cat: "Utilities",
    sev: "Medium",
    cause: "Filter clog, missed PM",
  },
];

function Page() {
  return (
    <>
      <PageHeader
        title="Lessons Learned"
        description="Institutional memory: incidents, near misses, RCAs and AI-detected patterns to prevent recurrence."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-4">Incident Timeline</h3>
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {incidents.map((i, idx) => (
              <div key={idx} className="relative">
                <span
                  className={`absolute -left-6 top-1 grid h-4 w-4 place-items-center rounded-full ${i.sev === "Critical" ? "bg-destructive" : i.sev === "High" ? "bg-orange-500" : "bg-accent"}`}
                >
                  <AlertTriangle className="h-2.5 w-2.5 text-white" />
                </span>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">
                  {i.d} · {i.cat}
                </div>
                <div className="text-sm font-semibold">{i.t}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Root cause: {i.cause}
                </div>
                <span
                  className={`inline-block mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${i.sev === "Critical" ? "bg-destructive/10 text-destructive" : i.sev === "High" ? "bg-orange-500/10 text-orange-500" : "bg-accent/10 text-accent"}`}
                >
                  {i.sev}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> AI Pattern Detection
            </h3>
            <div className="rounded-xl bg-accent/5 border border-accent/20 p-3 text-sm">
              <div className="font-semibold">
                Recurring lube starvation on pumps
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                3 similar incidents in 8 months across pumping stations.
                Recommend fleet-wide lube interval review.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-accent" /> Knowledge Articles
            </h3>
            <div className="space-y-2">
              {[
                "Best practices: PSV setpoint verification",
                "Preventing changeover contamination",
                "Filter monitoring checklist",
              ].map((a) => (
                <a
                  key={a}
                  className="block rounded-lg border border-border p-2.5 text-sm hover:border-accent cursor-pointer transition"
                >
                  {a}
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald" /> Near Miss
              </h3>
              <span className="text-xs text-muted-foreground">
                this quarter
              </span>
            </div>
            <div className="mt-2 font-display text-3xl font-bold">17</div>
            <div className="text-xs text-emerald">↓ 22% vs last quarter</div>
          </div>
        </div>
      </div>
    </>
  );
}
