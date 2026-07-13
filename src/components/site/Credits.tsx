const row1 = "Mrinal Sah   •   Shreeharsha Rumade";
const row2 = "Aarya Rawool   •   Mahek Shethiya";

export function Credits() {
  return (
    <section
      className="relative py-20 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #06132a 0%, #071A2E 100%)",
      }}
    >
      <div className="absolute inset-0 grid-industrial opacity-20" />
      <div className="relative text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-cyan">
          Team
        </div>
        <h2 className="mt-5 font-display text-4xl md:text-5xl font-bold tracking-tight text-white">
          Created by Group: <span className="text-gradient-cyan">CTRL+SHE</span>
        </h2>
      </div>

      <div className="relative mt-14 space-y-6">
        <MarqueeRow text={row1} direction="left" />
        <MarqueeRow text={row2} direction="right" />
      </div>
    </section>
  );
}

function MarqueeRow({
  text,
  direction,
}: {
  text: string;
  direction: "left" | "right";
}) {
  const items = Array.from({ length: 8 }, () => text);
  return (
    <div className="overflow-hidden">
      <div
        className={`flex gap-16 whitespace-nowrap ${direction === "left" ? "animate-marquee-left" : "animate-marquee-right"} [width:200%]`}
      >
        {items.map((t, i) => (
          <span
            key={i}
            className="font-display text-3xl md:text-4xl font-bold tracking-wide text-white/90"
            style={{ textShadow: "0 0 24px rgba(0,194,255,0.35)" }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
