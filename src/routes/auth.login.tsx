import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/store/auth";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Sign in — IntelliPlant AI" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const setEmail = useAuth((s) => s.setEmail);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return setError("Enter a valid work email");
    setError(null); setLoading(true);
    try {
      const res = await authService.sendOtp(value);
      if (!res.success) throw new Error(res.message);
      setEmail(value);
      navigate({ to: "/auth/verify" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <AuthShell step={1} title="Sign in to IntelliPlant" subtitle="We'll send a one-time verification code to your work email.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-foreground/80">Work Email</label>
          <div className="relative mt-1.5">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email" autoFocus value={value} onChange={(e) => setValue(e.target.value)}
              placeholder="you@company.com" className="pl-9 h-11"
              disabled={loading}
            />
          </div>
          {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
        </div>

        <Button type="submit" disabled={!valid || loading} className="w-full h-11 btn-hero font-semibold">
          {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending code…</>) : (<>Send OTP <ArrowRight className="ml-2 h-4 w-4" /></>)}
        </Button>

        <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald" />
          Protected by enterprise-grade encryption
        </div>

        <div className="pt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-accent">← Back to home</Link>
        </div>
      </form>
    </AuthShell>
  );
}
