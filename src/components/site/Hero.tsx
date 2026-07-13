import { motion } from "motion/react";
import {
  ArrowRight,
  PlayCircle,
  ShieldCheck,
  Brain,
  Factory,
  FileText,
  Network,
  Wrench,
} from "lucide-react";

export function Hero() {
  return (
    <section
      className="relative overflow-hidden pt-32 pb-24"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="absolute inset-0 grid-industrial opacity-40" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-cyan/20 blur-3xl" />
        <div className="absolute top-40 right-0 h-[420px] w-[420px] rounded-full bg-emerald/15 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-2 lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-white"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1.5 text-xs font-medium text-cyan">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-cyan animate-pulse-ring" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan" />
            </span>
            Industry 4.0 · Enterprise AI Platform
          </div>

          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-[68px]">
            Industrial Knowledge <br />
            <span className="text-gradient-cyan">Intelligence</span> for
            <br />
            Smarter Operations
          </h1>

          <p className="mt-6 max-w-xl text-lg text-white/70">
            Transform fragmented engineering knowledge into an intelligent,
            searchable, AI-powered operational brain. Empower maintenance,
            production, quality and safety teams to make faster, safer and
            better decisions.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#demo"
              className="btn-hero inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
            >
              Request Demo <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#platform"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/10 transition"
            >
              <PlayCircle className="h-4 w-4" /> Explore Platform
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-white/60">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald" /> SOC 2 · ISO 27001
            </div>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-cyan" /> RAG + Knowledge Graph
            </div>
            <div className="flex items-center gap-2">
              <Factory className="h-4 w-4 text-cyan" /> Deployed at Fortune 500
              plants
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="relative aspect-square w-full max-w-[560px] justify-self-end"
        >
          <OrbitVisual />
        </motion.div>
      </div>
    </section>
  );
}

function OrbitVisual() {
  const nodes = [
    { icon: Factory, label: "Plants", cls: "top-0 left-1/2 -translate-x-1/2" },
    {
      icon: FileText,
      label: "Documents",
      cls: "top-1/2 right-0 -translate-y-1/2",
    },
    {
      icon: Wrench,
      label: "Assets",
      cls: "bottom-0 left-1/2 -translate-x-1/2",
    },
    { icon: Network, label: "Graph", cls: "top-1/2 left-0 -translate-y-1/2" },
  ];
  return (
    <div className="relative h-full w-full">
      {/* Rings */}
      <div className="absolute inset-8 rounded-full border border-cyan/20" />
      <div className="absolute inset-20 rounded-full border border-cyan/15" />
      <div className="absolute inset-32 rounded-full border border-cyan/10" />

      {/* Center brain */}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="relative grid h-40 w-40 place-items-center rounded-full bg-gradient-to-br from-cyan to-emerald shadow-[0_0_80px_rgba(0,194,255,0.55)]">
          <div className="absolute inset-0 rounded-full border border-white/30" />
          <Brain className="h-16 w-16 text-[#05122a]" strokeWidth={1.8} />
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#05122a] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan border border-cyan/30">
            AI Core
          </div>
        </div>
      </motion.div>

      {/* Orbit nodes */}
      {nodes.map(({ icon: Icon, label, cls }, i) => (
        <motion.div
          key={label}
          className={`absolute ${cls}`}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.3 }}
        >
          <div className="glass-dark rounded-2xl px-4 py-3 flex items-center gap-2.5 text-white shadow-xl">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-cyan/15 text-cyan">
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-white/50">
                Node
              </div>
              <div className="text-sm font-semibold leading-tight">{label}</div>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Connecting SVG lines */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 400"
        fill="none"
      >
        <defs>
          <linearGradient id="glow" x1="0" x2="1">
            <stop offset="0%" stopColor="#00C2FF" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#18C37E" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        {[
          [200, 40, 200, 200],
          [360, 200, 200, 200],
          [200, 360, 200, 200],
          [40, 200, 200, 200],
        ].map(([x1, y1, x2, y2], i) => (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="url(#glow)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="16"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </line>
        ))}
      </svg>
    </div>
  );
}
