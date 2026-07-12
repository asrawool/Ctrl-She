import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Mail, Phone, MapPin, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [
    { title: "Contact — IntelliPlant AI" },
    { name: "description", content: "Talk to our team about deploying IntelliPlant AI at your plant." },
    { property: "og:title", content: "Contact IntelliPlant AI" },
    { property: "og:description", content: "Speak with our industrial AI specialists." },
  ]}),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-24">
        <section className="mx-auto max-w-6xl px-6 grid gap-10 lg:grid-cols-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Contact</span>
            <h1 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight">Talk to our <span className="text-gradient-cyan">industrial AI</span> specialists.</h1>
            <p className="mt-4 text-muted-foreground">Deployment discovery, technical architecture review, security assessment — we come prepared.</p>
            <div className="mt-8 space-y-3 text-sm">
              <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-accent" /> contact@intelliplant.ai</div>
              <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-accent" /> +91 22 6900 4400</div>
              <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-accent" /> Mumbai · Bengaluru · Frankfurt · Houston</div>
            </div>
          </div>

          <form onSubmit={(e)=>{e.preventDefault();setSent(true);}} className="rounded-3xl border border-border bg-card p-6 space-y-4">
            {sent ? (
              <div className="text-center py-8">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald" />
                <h3 className="mt-3 font-display text-xl font-bold">Message received</h3>
                <p className="mt-1 text-sm text-muted-foreground">Our team will reach out within one business day.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input placeholder="Full name" required />
                  <Input placeholder="Work email" type="email" required />
                  <Input placeholder="Company" required />
                  <Input placeholder="Role" />
                </div>
                <textarea rows={5} placeholder="Tell us about your plant environment and goals…" required
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent" />
                <Button type="submit" className="w-full h-11 btn-hero">Request Demo</Button>
              </>
            )}
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}
