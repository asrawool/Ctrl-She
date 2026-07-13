import { Fuel, Zap, FlaskConical, Cog, Pill, Truck } from "lucide-react";

const items = [
  {
    i: Fuel,
    n: "Oil & Gas",
    d: "Upstream, midstream and downstream operations with OISD/PESO compliance.",
  },
  {
    i: Zap,
    n: "Power & Utilities",
    d: "Thermal, hydro and renewable plants with grid-scale asset intelligence.",
  },
  {
    i: FlaskConical,
    n: "Chemicals & Petrochem",
    d: "Process safety, MOC and hazardous ops decision support.",
  },
  {
    i: Cog,
    n: "Discrete Manufacturing",
    d: "Auto, heavy engineering and machinery with OEE and quality intelligence.",
  },
  {
    i: Pill,
    n: "Pharma & Life Sciences",
    d: "GMP, deviations, CAPA and validated computerized systems.",
  },
  {
    i: Truck,
    n: "Metals, Mining & Cement",
    d: "Heavy asset reliability and predictive maintenance at scale.",
  },
];

export function Industries() {
  return (
    <section id="industries" className="py-28 bg-muted/40">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent">
            Industries
          </span>
          <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight">
            Built for the world's
            <br />
            most demanding operations.
          </h2>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map(({ i: I, n, d }) => (
            <div
              key={n}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(7,26,46,0.25)]"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-cyan to-emerald text-[#05122a]">
                <I className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-semibold">{n}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-cyan to-emerald scale-x-0 group-hover:scale-x-100 origin-left transition-transform" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
