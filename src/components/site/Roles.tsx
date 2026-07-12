import { motion } from "motion/react";
import { HardHat, Factory, ClipboardCheck, ShieldAlert, Building2, FolderCog, Cpu, Wrench } from "lucide-react";

const roles = [
  { icon: Wrench, name: "Maintenance Engineer", tags: ["Work Orders", "RCA Assistant", "Failure History", "Spares"] },
  { icon: Factory, name: "Plant Operations", tags: ["Live SOPs", "Shift Reports", "Ops Alerts", "Trends"] },
  { icon: HardHat, name: "Production Engineer", tags: ["OEE", "Cycle Times", "Downtime", "Batch Reports"] },
  { icon: ClipboardCheck, name: "Quality / QA Manager", tags: ["CAPA", "Deviations", "Audits", "Compliance"] },
  { icon: ShieldAlert, name: "HSE / Safety Officer", tags: ["Permits", "Incidents", "PPE", "Risk"] },
  { icon: Building2, name: "Plant Manager", tags: ["Enterprise KPIs", "Approvals", "Exec AI Insights"] },
  { icon: FolderCog, name: "Document Controller", tags: ["Versioning", "Approvals", "Audit Trail"] },
  { icon: Cpu, name: "Industry 4.0 Engineer", tags: ["Digital Twin", "IoT", "Knowledge Graph"] },
];

export function Roles() {
  return (
    <section id="solutions" className="relative py-28 overflow-hidden" style={{ background: "linear-gradient(180deg, #071A2E 0%, #0a2547 100%)" }}>
      <div className="absolute inset-0 grid-industrial opacity-20" />
      <div className="relative mx-auto max-w-7xl px-6 text-white">
        <div className="flex items-end justify-between flex-wrap gap-6">
          <div className="max-w-xl">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-cyan">Role-Based Experience</span>
            <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight">
              Every discipline gets its<br />own <span className="text-gradient-cyan">intelligent workspace</span>.
            </h2>
          </div>
          <p className="max-w-md text-white/70">
            From the shop floor to the board room — 14+ pre-configured personas with tailored dashboards, permissions and AI copilots.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {roles.map((r, i) => (
            <motion.div
              key={r.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.04 }}
              className="glass-dark rounded-2xl p-5 hover:border-cyan/50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-cyan/15 text-cyan">
                  <r.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{r.name}</h3>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {r.tags.map(t => (
                  <span key={t} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70">{t}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
