import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section id="demo" className="py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div
          className="relative overflow-hidden rounded-3xl p-12 md:p-16 text-white"
          style={{ background: "var(--gradient-hero)" }}
        >
          <div className="absolute inset-0 grid-industrial opacity-25" />
          <div className="relative grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                Ready to operationalize your
                <br />
                <span className="text-gradient-cyan">
                  industrial knowledge?
                </span>
              </h2>
              <p className="mt-4 text-white/70 max-w-xl">
                See a live walkthrough with your own sample documents. Our
                solution architects will map IntelliPlant AI to your plant's
                workflows in 30 minutes.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <a
                href="#contact"
                className="btn-hero inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
              >
                Request Enterprise Demo <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#platform"
                className="text-sm text-white/70 hover:text-white"
              >
                Or explore the platform tour →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
