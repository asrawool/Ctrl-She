import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Cpu, ShieldCheck, Globe, Zap } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — SynapseAi" },
      {
        name: "description",
        content:
          "SynapseAi is the unified asset & operations brain for Fortune 500 manufacturing.",
      },
      { property: "og:title", content: "About SynapseAi" },
      {
        property: "og:description",
        content:
          "The unified asset & operations brain for industrial enterprises.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-24">
        <section className="mx-auto max-w-4xl px-6 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent">
            About
          </span>
          <h1 className="mt-3 font-display text-4xl md:text-6xl font-bold tracking-tight">
            The <span className="text-gradient-cyan">Operations Brain</span> for
            Industry 4.0
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            SynapseAi unifies decades of scattered engineering knowledge —
            manuals, SOPs, drawings, incident logs and audit records — into a
            single AI-powered operational intelligence platform for the world's
            most demanding manufacturing environments.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-6 mt-20 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              i: Cpu,
              t: "AI-native",
              d: "Every workflow is grounded on our proprietary industrial knowledge graph.",
            },
            {
              i: ShieldCheck,
              t: "Enterprise-grade",
              d: "SOC 2, ISO 27001 and GDPR compliant by design.",
            },
            {
              i: Globe,
              t: "Multilingual",
              d: "Works in 10+ Indian and global languages with technical term preservation.",
            },
            {
              i: Zap,
              t: "Deployable in weeks",
              d: "Not years. Turnkey onboarding for existing document estates.",
            },
          ].map(({ i: I, t, d }) => (
            <div
              key={t}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                <I className="h-5 w-5" />
              </div>
              <div className="mt-3 font-display font-bold">{t}</div>
              <div className="text-sm text-muted-foreground mt-1">{d}</div>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-4xl px-6 mt-20 text-center">
          <h2 className="font-display text-3xl font-bold">
            Ready to see it in action?
          </h2>
          <Link
            to="/auth/login"
            search={{ intent: "login" }}
            className="btn-hero mt-6 inline-block rounded-full px-6 py-3 text-sm font-semibold"
          >
            Sign in to your workspace
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
