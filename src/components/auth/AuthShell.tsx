import { motion } from "motion/react";
import { Cpu } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({ step, title, subtitle, children }: {
  step: 1 | 2 | 3 | 4;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const steps = ["Email", "OTP", "Face ID", "Role"];
  return (
    <div className="min-h-screen grid lg:grid-cols-2" style={{ background: "linear-gradient(180deg,#06132a 0%,#071A2E 55%,#0a2547 100%)" }}>
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden">
        <div className="absolute inset-0 grid-industrial opacity-20" />
        <div className="relative flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-cyan to-emerald shadow-[0_0_28px_rgba(0,194,255,0.55)]">
            <Cpu className="h-5 w-5 text-[#05122a]" strokeWidth={2.5} />
          </span>
          <div className="leading-tight">
            <div className="font-display text-lg font-bold">IntelliPlant<span className="text-cyan">.AI</span></div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/60">Operations Brain</div>
          </div>
        </div>

        <div className="relative">
          <h1 className="font-display text-5xl font-bold leading-tight">
            Unified <span className="text-gradient-cyan">Asset & Operations</span> Brain.
          </h1>
          <p className="mt-5 max-w-md text-white/70">
            Secure enterprise sign-in. Multi-factor authentication with biometric verification for regulated industrial environments.
          </p>
        </div>

        <div className="relative text-xs text-white/50">
          SOC 2 · ISO 27001 · GDPR · Enterprise SSO ready
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="w-full max-w-md rounded-3xl bg-white/95 backdrop-blur border border-white/20 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.5)] p-8"
        >
          {/* Stepper */}
          <div className="flex items-center gap-1.5 mb-6">
            {steps.map((s, i) => {
              const idx = i + 1;
              const state = idx < step ? "done" : idx === step ? "active" : "todo";
              return (
                <div key={s} className="flex-1">
                  <div className={`h-1.5 rounded-full transition-all ${state === "done" ? "bg-emerald" : state === "active" ? "bg-accent" : "bg-muted"}`} />
                  <div className={`mt-1.5 text-[10px] font-semibold uppercase tracking-wider ${state === "todo" ? "text-muted-foreground" : "text-foreground"}`}>{s}</div>
                </div>
              );
            })}
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-6">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
