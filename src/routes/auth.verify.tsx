import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, RefreshCw, ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/store/auth";

export const Route = createFileRoute("/auth/verify")({
  head: () => ({ meta: [{ title: "Verify OTP — IntelliPlant AI" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !useAuth.getState().email) {
      throw redirect({ to: "/auth/login" });
    }
  },
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const { email, setOtpVerified } = useAuth();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(45);
  const [resending, setResending] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const code = digits.join("");
  const complete = code.length === 6;

  const handleChange = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "").slice(-1);
    const next = [...digits]; next[i] = clean; setDigits(next); setError(null);
    if (clean && i < 5) refs.current[i + 1]?.focus();
  };
  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length) {
      const arr = paste.split(""); const next = Array(6).fill("");
      arr.forEach((d, i) => (next[i] = d));
      setDigits(next); refs.current[Math.min(paste.length, 5)]?.focus();
    }
  };

  const verify = async () => {
    if (!complete) return;
    setLoading(true); setError(null);
    try {
      const res = await authService.verifyOtp(email!, code);
      if (!res.success) throw new Error("Invalid code");
      setSuccess(true);
      setTimeout(() => { setOtpVerified(true); navigate({ to: "/auth/face" }); }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally { setLoading(false); }
  };

  const resend = async () => {
    setResending(true);
    await authService.resendOtp(email!);
    setResending(false); setSeconds(45); setDigits(Array(6).fill(""));
  };

  return (
    <AuthShell step={2} title="Enter verification code" subtitle={`We sent a 6-digit code to ${email}`}>
      <div className="space-y-5">
        <div className="flex gap-2 justify-between" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKey(i, e)}
              inputMode="numeric"
              maxLength={1}
              className={`h-14 w-full max-w-[54px] rounded-xl border-2 text-center text-2xl font-bold font-display transition ${
                success ? "border-emerald bg-emerald/10 text-emerald" :
                error ? "border-destructive/60 bg-destructive/5" :
                d ? "border-accent bg-accent/5" : "border-border bg-background"
              }`}
              disabled={loading || success}
            />
          ))}
        </div>

        {error && <p className="text-xs text-destructive text-center">{error}</p>}
        {success && (
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald">
            <CheckCircle2 className="h-4 w-4" /> Verified
          </p>
        )}

        <Button onClick={verify} disabled={!complete || loading || success} className="w-full h-11 btn-hero font-semibold">
          {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</>) :
           success ? "Verified" : (<>Verify & Continue <ArrowRight className="ml-2 h-4 w-4" /></>)}
        </Button>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {seconds > 0 ? `Resend in ${seconds}s` : "Didn't get the code?"}
          </span>
          <button onClick={resend} disabled={seconds > 0 || resending}
            className="flex items-center gap-1.5 font-semibold text-accent disabled:text-muted-foreground disabled:cursor-not-allowed">
            {resending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Resend OTP
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
