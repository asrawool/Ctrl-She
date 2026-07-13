import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Hero } from "@/components/site/Hero";
import { LogoStrip } from "@/components/site/LogoStrip";
import { Features } from "@/components/site/Features";
import { Roles } from "@/components/site/Roles";
import { CopilotShowcase } from "@/components/site/CopilotShowcase";
import { Stats } from "@/components/site/Stats";
import { Industries } from "@/components/site/Industries";
import { CTA } from "@/components/site/CTA";
import { Credits } from "@/components/site/Credits";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <LogoStrip />
        <Features />
        <Roles />
        <CopilotShowcase />
        <Stats />
        <Industries />
        <CTA />
        <Credits />
      </main>
      <Footer />
    </div>
  );
}
