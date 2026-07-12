import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLES, useAuth, type Role } from "@/store/auth";

export const Route = createFileRoute("/auth/role")({
  head: () => ({ meta: [{ title: "Select Role — IntelliPlant AI" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !useAuth.getState().faceVerified) {
      throw redirect({ to: "/auth/login" });
    }
  },
  component: RolePage,
});

function RolePage() {
  const navigate = useNavigate();
  const setRole = useAuth((s) => s.setRole);
  const [selected, setSelected] = useState<Role | null>(null);
  const [custom, setCustom] = useState("");

  const confirm = () => {
    if (!selected) return;
    if (selected === "other" && !custom.trim()) return;
    setRole(selected, selected === "other" ? custom.trim() : undefined);
    navigate({ to: "/app/dashboard" });
  };

  return (
    <AuthShell step={4} title="Select your role" subtitle="We'll tailor your workspace, permissions and AI copilot to your discipline.">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-2 max-h-[380px] overflow-y-auto pr-1">
          {ROLES.map((r) => {
            const active = selected === r.id;
            return (
              <motion.button
                key={r.id} onClick={() => setSelected(r.id)}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center justify-between rounded-xl border-2 px-3.5 py-3 text-left text-sm transition ${
                  active ? "border-accent bg-accent/5 shadow-[0_0_0_4px_rgba(0,194,255,0.08)]" : "border-border hover:border-accent/40"
                }`}
              >
                <span className="font-medium">{r.label}</span>
                {active && <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-white"><Check className="h-3 w-3" /></span>}
              </motion.button>
            );
          })}
        </div>

        {selected === "other" && (
          <Input value={custom} onChange={(e) => setCustom(e.target.value)}
            placeholder="Enter your designation" className="h-11" autoFocus />
        )}

        <Button onClick={confirm}
          disabled={!selected || (selected === "other" && !custom.trim())}
          className="w-full h-11 btn-hero font-semibold">
          Enter Workspace <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </AuthShell>
  );
}
