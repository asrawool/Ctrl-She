export function LogoStrip() {
  const logos = ["SIEMENS", "HONEYWELL", "ABB", "SCHNEIDER", "EMERSON", "ROCKWELL", "GE VERNOVA", "YOKOGAWA"];
  return (
    <section className="border-y border-border/60 bg-white py-8">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Trusted architecture · Integrates with the plants you already run
        </p>
        <div className="mt-6 overflow-hidden">
          <div className="flex gap-16 whitespace-nowrap animate-marquee-left [width:200%]">
            {[...logos, ...logos].map((l, i) => (
              <span key={i} className="font-display text-xl font-bold tracking-widest text-muted-foreground/60">
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
