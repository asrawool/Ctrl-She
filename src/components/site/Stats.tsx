import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";

const stats = [
  { v: 68, s: "%", label: "Faster mean-time-to-resolve" },
  { v: 12842, s: "+", label: "Documents ingested per plant" },
  { v: 94, s: "%", label: "Answer accuracy with citations" },
  { v: 40, s: "%", label: "Reduction in unplanned downtime" },
];

export function Stats() {
  return (
    <section className="py-24 bg-gradient-to-br from-navy to-steel text-white">
      <div className="mx-auto max-w-7xl px-6 grid gap-8 md:grid-cols-4">
        {stats.map((s, i) => (
          <StatCard key={i} {...s} delay={i * 0.1} />
        ))}
      </div>
    </section>
  );
}

function StatCard({
  v,
  s,
  label,
  delay,
}: {
  v: number;
  s: string;
  label: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf: number;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1500);
      setN(Math.floor(v * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, v]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
    >
      <div className="font-display text-5xl md:text-6xl font-bold tracking-tight text-gradient-cyan">
        {n.toLocaleString()}
        {s}
      </div>
      <div className="mt-2 text-sm text-white/70">{label}</div>
    </motion.div>
  );
}
