import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Library, FileText, BookOpen, Wrench, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/app/knowledge")({
  head: () => ({ meta: [{ title: "Knowledge Hub — IntelliPlant AI" }] }),
  component: Page,
});

function Page() {
  // TODO: Replace with real data from Supabase - document collections by category
  // Query: SELECT category as t, COUNT(*) as n FROM documents GROUP BY category
  const collections = [
    {
      i: FileText,
      t: "Technical Manuals",
      n: 842,
      d: "OEM manuals and equipment specs",
    },
    {
      i: BookOpen,
      t: "Standard Operating Procedures",
      n: 1264,
      d: "Approved SOPs across plants",
    },
    {
      i: Wrench,
      t: "Maintenance Records",
      n: 3820,
      d: "Work orders and failure history",
    },
    {
      i: Library,
      t: "Training Content",
      n: 412,
      d: "Videos, tutorials and courseware",
    },
    {
      i: FileText,
      t: "Audit & Compliance",
      n: 518,
      d: "Reports and inspection records",
    },
    {
      i: BookOpen,
      t: "Best Practices",
      n: 96,
      d: "Curated engineering knowledge articles",
    },
  ];
  return (
    <>
      <PageHeader
        title="Knowledge Hub"
        description="Curated knowledge collections across your entire plant estate. All content is searchable and grounded in your AI Copilot."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {collections.map(({ i: I, t, n, d }) => (
          <Link
            key={t}
            to="/app/documents"
            className="rounded-2xl border border-border bg-card p-5 hover:border-accent transition group"
          >
            <div className="flex items-start justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                <I className="h-5 w-5" />
              </div>
              <span className="font-display font-bold text-lg">
                {n.toLocaleString()}
              </span>
            </div>
            <div className="mt-4 font-display font-bold">{t}</div>
            <div className="text-xs text-muted-foreground mt-1">{d}</div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-accent">
              Explore{" "}
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
