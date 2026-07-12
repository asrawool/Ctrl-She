import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { HelpCircle, MessageSquare, BookOpen, Video } from "lucide-react";

export const Route = createFileRoute("/app/help")({
  head: () => ({ meta: [{ title: "Help — IntelliPlant AI" }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Help & Support" description="Guides, tutorials and direct support from the IntelliPlant AI team." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { i:BookOpen, t:"Documentation", d:"User guides and reference." },
          { i:Video, t:"Video tutorials", d:"Watch walkthroughs of key features." },
          { i:MessageSquare, t:"Live chat", d:"Talk to a solutions engineer." },
          { i:HelpCircle, t:"FAQs", d:"Common questions and troubleshooting." },
        ].map(({i:I,t,d})=>(
          <a key={t} className="rounded-2xl border border-border bg-card p-5 hover:border-accent cursor-pointer transition">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent"><I className="h-5 w-5" /></div>
            <div className="mt-3 font-display font-bold">{t}</div>
            <div className="text-xs text-muted-foreground mt-1">{d}</div>
          </a>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display font-bold mb-4">Frequently asked questions</h3>
        <div className="space-y-3">
          {[
            {q:"How do I upload a new equipment manual?", a:"Navigate to Documents, drop the file into the upload zone or use the Upload button. Assign category and equipment tag."},
            {q:"Can I switch languages after login?", a:"Yes, use the language selector in the top bar or Settings → Language."},
            {q:"Where do AI answers come from?", a:"The Copilot is grounded on your uploaded documents, work orders and incident records. Every response includes source citations."},
          ].map((f,i)=>(
            <details key={i} className="rounded-xl border border-border p-3 open:bg-muted/40">
              <summary className="cursor-pointer font-semibold text-sm">{f.q}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}
