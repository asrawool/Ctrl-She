import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { ScanFace, Loader2, CheckCircle2, Camera } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/store/auth";

type State = "waiting" | "scanning" | "verifying" | "verified";

export const Route = createFileRoute("/auth/face")({
  head: () => ({ meta: [{ title: "Face ID — IntelliPlant AI" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !useAuth.getState().otpVerified) {
      throw redirect({ to: "/auth/login" });
    }
  },
  component: FacePage,
});

function FacePage() {
  const navigate = useNavigate();
  const setFaceVerified = useAuth((s) => s.setFaceVerified);
  const [state, setState] = useState<State>("waiting");

  const run = async () => {
    setState("scanning");
    await new Promise((r) => setTimeout(r, 1500));
    setState("verifying");
    const res = await authService.verifyFace(null);
    if (res.success) {
      setState("verified");
      setTimeout(() => { setFaceVerified(true); navigate({ to: "/auth/role" }); }, 800);
    } else {
      setState("waiting");
    }
  };

  return (
    <AuthShell step={3} title="Biometric verification" subtitle="Position your face inside the frame for secure identity verification.">
      <div className="space-y-6">
        <div className="relative mx-auto aspect-square w-64 rounded-3xl overflow-hidden bg-gradient-to-br from-navy to-steel border-2 border-accent/30">
          <div className="absolute inset-0 grid-industrial opacity-20" />

          {/* Corner brackets */}
          {["top-3 left-3 border-t-2 border-l-2","top-3 right-3 border-t-2 border-r-2","bottom-3 left-3 border-b-2 border-l-2","bottom-3 right-3 border-b-2 border-r-2"].map((c,i)=>(
            <div key={i} className={`absolute h-6 w-6 rounded ${state==="verified"?"border-emerald":"border-cyan"} ${c}`} />
          ))}

          <div className="absolute inset-0 grid place-items-center">
            {state === "verified" ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="grid h-20 w-20 place-items-center rounded-full bg-emerald text-white shadow-[0_0_60px_rgba(24,195,126,0.7)]">
                <CheckCircle2 className="h-10 w-10" />
              </motion.div>
            ) : (
              <ScanFace className={`h-24 w-24 text-cyan/70 ${state==="scanning" ? "animate-pulse" : ""}`} />
            )}
          </div>

          {state === "scanning" && (
            <motion.div
              initial={{ y: 0 }} animate={{ y: 240 }}
              transition={{ duration: 1.4, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
              className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-cyan to-transparent shadow-[0_0_20px_#00C2FF]"
            />
          )}
        </div>

        <div className="text-center">
          <StatusLabel state={state} />
        </div>

        {state === "waiting" && (
          <Button onClick={run} className="w-full h-11 btn-hero font-semibold">
            <Camera className="mr-2 h-4 w-4" /> Start Face Verification
          </Button>
        )}
        {(state === "scanning" || state === "verifying") && (
          <Button disabled className="w-full h-11 font-semibold">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {state === "scanning" ? "Scanning…" : "Verifying…"}
          </Button>
        )}

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed italic">
          Your biometric data is processed on-device and never leaves this session. This step will connect to your Face Recognition API in production.
        </p>
      </div>
    </AuthShell>
  );
}

function StatusLabel({ state }: { state: State }) {
  const cfg = {
    waiting: { text: "Ready to scan", cls: "text-muted-foreground" },
    scanning: { text: "Scanning your face…", cls: "text-accent" },
    verifying: { text: "Verifying identity…", cls: "text-accent" },
    verified: { text: "Identity verified", cls: "text-emerald" },
  }[state];
  return <div className={`text-sm font-semibold ${cfg.cls}`}>{cfg.text}</div>;
}
