import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  BookOpen,
  Sparkles,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/lessons")({
  head: () => ({ meta: [{ title: "Lessons Learned — SynapseAi" }] }),
  component: Page,
});

interface Lesson {
  d: string;
  t: string;
  cat: string;
  sev: string;
  cause: string;
  ref: string;
}

interface FailurePattern {
  id: string;
  title: string;
  description: string;
  matching_root_cause: string;
  affected_assets: string[];
  created_at: string;
}

function Page() {
  const [incidents, setIncidents] = useState<Lesson[]>([]);
  const [patterns, setPatterns] = useState<FailurePattern[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Query RCAs, NCRs, and systemic failure patterns
      const [{ data: rcaData }, { data: ncrData }, { data: patternData }] =
        await Promise.all([
          supabase
            .from("rca_reports")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("ncrs")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("failure_patterns")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);

      setPatterns(patternData || []);
      const combined: Lesson[] = [];

      if (rcaData) {
        rcaData.forEach((r) => {
          combined.push({
            d: new Date(r.created_at).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            t: `RCA: Incident on ${r.asset_id || "Asset"}`,
            cat: "Mechanical",
            sev: "High",
            cause: r.root_cause,
            ref: r.incident_ref,
          });
        });
      }

      if (ncrData) {
        ncrData.forEach((n) => {
          combined.push({
            d: new Date(n.created_at).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            t: `NCR: ${n.description}`,
            cat: n.framework_ref || "Quality",
            sev: n.severity || "Medium",
            cause: `Quality non-conformance event (${n.status})`,
            ref: n.ncr_number,
          });
        });
      }

      // Default fallback seed if completely empty
      if (combined.length === 0) {
        combined.push(
          {
            d: "Jun 12, 2026",
            t: "Bearing failure on P-401",
            cat: "Mechanical",
            sev: "High",
            cause: "Lube starvation from extended interval",
            ref: "RCA-001",
          },
          {
            d: "May 28, 2026",
            t: "Near-miss: Reactor over-pressure",
            cat: "Process Safety",
            sev: "Critical",
            cause: "PSV setpoint drift",
            ref: "IR-2026-902",
          },
          {
            d: "May 4, 2026",
            t: "Contaminated batch #B-2418",
            cat: "Quality",
            sev: "Medium",
            cause: "Cross-contamination during changeover",
            ref: "NCR-2024-040",
          },
        );
      }

      setIncidents(combined);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load lessons learned timeline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
                  className={`absolute -left-6 top-1 grid h-4 w-4 place-items-center rounded-full ${
                    i.sev === "Critical"
                      ? "bg-destructive"
                      : i.sev === "High"
                        ? "bg-orange-500"
                        : "bg-accent"
                  }`}
                >
                  <AlertTriangle className="h-2.5 w-2.5 text-white" />
                </span>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">
                  {i.d} · {i.cat} ({i.ref})
                </div>
                <div className="text-sm font-semibold">{i.t}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Root cause: {i.cause}
                </div>
                <span
                  className={`inline-block mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    i.sev === "Critical"
                      ? "bg-destructive/10 text-destructive"
                      : i.sev === "High"
                        ? "bg-orange-500/10 text-orange-500"
                        : "bg-accent/10 text-accent"
                  }`}
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
            {patterns.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No systemic patterns detected yet. Scanning incoming incident
                logs...
              </p>
            ) : (
              <div className="space-y-3">
                {patterns.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl bg-accent/5 border border-accent/20 p-3 text-sm text-foreground"
                  >
                    <div className="font-semibold text-xs text-accent">
                      {p.title}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.affected_assets.map((a) => (
                        <span
                          key={a}
                          className="bg-accent/10 border border-accent/20 text-accent text-[9px] font-bold px-1.5 py-0.5 rounded"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
