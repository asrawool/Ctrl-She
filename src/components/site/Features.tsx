import { motion } from "motion/react";
import {
  Brain,
  FileSearch,
  Network,
  ShieldCheck,
  Wrench,
  Gauge,
  Sparkles,
  Languages,
  Bot,
  LineChart,
  BookOpenCheck,
  Bell,
} from "lucide-react";

const features = [
  {
    icon: FileSearch,
    title: "Universal Document Ingestion",
    desc: "PDFs, drawings, P&IDs, scans, emails, Excel, PowerPoint — parsed with OCR, indexed and structured automatically.",
  },
  {
    icon: Network,
    title: "Living Knowledge Graph",
    desc: "Equipment, people, plants, SOPs and failures woven into an explorable graph with animated relationships.",
  },
  {
    icon: Bot,
    title: "Enterprise AI Copilot",
    desc: "Grounded answers with citations, confidence scores and multilingual support across ten Indian languages.",
  },
  {
    icon: Wrench,
    title: "Maintenance Intelligence",
    desc: "Predictive maintenance, RUL forecasting, RCA assistant and preventive work-order generation.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance & Audit Ready",
    desc: "Factory Act, OISD, PESO, ISO — automatic evidence generation and gap detection.",
  },
  {
    icon: BookOpenCheck,
    title: "Lessons Learned Engine",
    desc: "Every incident, near-miss and failure becomes a searchable pattern that prevents recurrence.",
  },
  {
    icon: Gauge,
    title: "Role-Based Dashboards",
    desc: "Every engineer, manager and controller sees a completely tailored workspace and permissions.",
  },
  {
    icon: Languages,
    title: "10+ Language Support",
    desc: "English, Hindi, Marathi, Tamil, Telugu, Kannada, Gujarati, Bengali, Punjabi, Malayalam.",
  },
];

export function Features() {
  return (
    <section id="platform" className="py-28 bg-background">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent">
            The Platform
          </span>
          <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight">
            One operational brain. <br />
            Every discipline. Every plant.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            IntelliPlant AI unifies decades of engineering knowledge — manuals,
            drawings, SOPs, incident logs and tribal wisdom — into a secure,
            explorable intelligence layer.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-[0_20px_50px_-20px_rgba(7,26,46,0.25)] hover:-translate-y-1 transition-all"
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-cyan/10 to-emerald/10 blur-2xl group-hover:from-cyan/30 group-hover:to-emerald/30 transition" />
              <div className="relative">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-navy to-steel text-cyan shadow-inner">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
