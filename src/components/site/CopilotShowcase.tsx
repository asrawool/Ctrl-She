import { motion } from "motion/react";
import {
  Bot,
  Mic,
  Sparkles,
  FileText,
  ShieldCheck,
  Languages,
} from "lucide-react";

export function CopilotShowcase() {
  return (
    <section id="copilot" className="py-28 bg-background">
      <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent">
            AI Copilot
          </span>
          <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight">
            Ask any question.
            <br />
            Get a{" "}
            <span className="text-gradient-cyan">
              cited, engineer-grade
            </span>{" "}
            answer.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground max-w-lg">
            Grounded in your own manuals, SOPs, drawings, incident logs and
            audit records — every answer includes source citations, confidence
            scoring and the exact page it came from.
          </p>

          <div className="mt-8 grid gap-3">
            {[
              { icon: FileText, t: "Source citations on every response" },
              {
                icon: ShieldCheck,
                t: "Confidence scores + hallucination guardrails",
              },
              {
                icon: Languages,
                t: "10+ Indian languages with technical term preservation",
              },
              {
                icon: Mic,
                t: "Voice input / output for hands-free shop-floor use",
              },
            ].map(({ icon: I, t }) => (
              <div
                key={t}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5"
              >
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">
                  <I className="h-4.5 w-4.5" />
                </div>
                <span className="text-sm font-medium">{t}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted-foreground leading-relaxed max-w-lg italic border-l-2 border-accent/40 pl-3">
            AI-generated responses are intended to assist decision-making.
            Always verify recommendations using official engineering procedures,
            approved documentation and qualified personnel before taking
            operational or safety-critical actions.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative rounded-3xl border border-border bg-white shadow-[0_40px_100px_-30px_rgba(7,26,46,0.35)] overflow-hidden"
        >
          <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-navy to-steel px-5 py-3.5 text-white">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan to-emerald text-[#05122a]">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">SynapseAi Copilot</div>
              <div className="text-[11px] text-white/60">
                Grounded on 12,842 documents · Plant Alpha
              </div>
            </div>
            <span className="rounded-full bg-emerald/20 px-2 py-0.5 text-[10px] font-semibold text-emerald border border-emerald/30">
              ONLINE
            </span>
          </div>

          <div className="space-y-4 p-6 bg-gradient-to-b from-white to-muted/40">
            <ChatBubble side="user">
              What is the recommended lubrication interval for Pump P-401 based
              on the last 3 failures?
            </ChatBubble>
            <ChatBubble side="ai">
              Based on failure records <Cite>FR-2023-118</Cite>,{" "}
              <Cite>FR-2024-041</Cite> and <Cite>FR-2024-207</Cite>, and OEM
              manual <Cite>KSB-P401 §6.3</Cite>, reduce the lubrication interval
              from
              <b> 2,000 hours to 1,400 hours</b>. Root cause in all three cases
              traced to bearing starvation under high-vibration operating
              regimes.
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-emerald font-semibold border border-emerald/20">
                  Confidence 94%
                </span>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent font-semibold border border-accent/20">
                  4 sources
                </span>
              </div>
            </ChatBubble>
          </div>

          <div className="flex items-center gap-2 border-t border-border p-3">
            <div className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm text-muted-foreground">
              Ask about equipment, SOPs, incidents…
            </div>
            <button className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground hover:bg-accent/10 hover:text-accent transition">
              <Mic className="h-4 w-4" />
            </button>
            <button className="grid h-10 w-10 place-items-center rounded-xl btn-hero">
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ChatBubble({
  side,
  children,
}: {
  side: "user" | "ai";
  children: React.ReactNode;
}) {
  const isUser = side === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "bg-gradient-to-br from-navy to-steel text-white rounded-br-md"
            : "bg-white border border-border text-foreground rounded-bl-md"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Cite({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[11px] font-semibold text-accent border border-accent/20 mx-0.5">
      {children}
    </span>
  );
}
