import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Loader2, Mail, ArrowRight, ShieldCheck, X } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/store/auth";
import {
  checkUserExistsFn,
  verifyEmailDomainFn,
} from "@/services/webauthn.server";

type AuthSearch = {
  intent?: "login" | "signup";
};

export const Route = createFileRoute("/auth/login")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => {
    return {
      intent: (search.intent === "signup" ? "signup" : "login") as
        "signup" | "login" | undefined,
    };
  },
  head: () => ({
    meta: [
      {
        title: "Authentication — IntelliPlant AI",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const setEmail = useAuth((s) => s.setEmail);
  const { intent } = Route.useSearch();
  const isSignUp = intent === "signup";
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(
      "[LoginPage] submit handler triggered. Current input value:",
      value,
    );

    if (!value) {
      setError("Email is required");
      console.error("[LoginPage] Submit aborted: value is falsy");
      return;
    }

    if (!valid) {
      setError("Enter a valid work email");
      console.error(
        "[LoginPage] Submit aborted: value is invalid email format:",
        value,
      );
      return;
    }

    setError(null);
    setLoading(true);
    try {
      console.log("[LoginPage] Checking user existence for:", value);
      const checkRes = await checkUserExistsFn({ data: { email: value } });

      if (!isSignUp && !checkRes.exists) {
        // LOGIN intent + email NOT found:
        setError("mismatch-signup");
        setLoading(false);
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 50);
        return;
      }

      if (isSignUp && checkRes.exists) {
        // SIGNUP intent + email ALREADY exists:
        setError("mismatch-login");
        setLoading(false);
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 50);
        return;
      }

      if (isSignUp) {
        console.log("[LoginPage] Checking domain MX records for:", value);
        const domainCheck = await verifyEmailDomainFn({
          data: { email: value },
        });
        if (!domainCheck.isValid) {
          setError("invalid-domain");
          setLoading(false);
          setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
          }, 50);
          return;
        }
      }

      console.log("[LoginPage] Calling authService.sendOtp with email:", value);
      const res = await authService.sendOtp(value);
      if (!res.success) throw new Error(res.message);
      setEmail(value, res.exists);
      navigate({ to: "/auth/verify" });
    } catch (err) {
      console.error("[LoginPage] Error during OTP request:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      step={1}
      isSignUp={isSignUp}
      title={isSignUp ? "Create your account" : "Welcome back, sign in"}
      subtitle={
        isSignUp
          ? "Register for IntelliPlant. We'll send a one-time verification code to your work email."
          : "Sign in to IntelliPlant. We'll send a one-time verification code to your work email."
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-foreground/80">
            Work Email
          </label>
          <div className="relative mt-1.5">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="email"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="you@company.com"
              className="pl-9 pr-8 h-11"
              disabled={loading}
            />
            {value && !loading && (
              <button
                type="button"
                onClick={() => {
                  setValue("");
                  setError(null);
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <span className="sr-only">Clear email</span>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {error === "mismatch-signup" && (
            <div className="mt-1.5 text-xs text-destructive flex flex-col gap-1">
              <p>No account found with this email. Please sign up instead.</p>
              <button
                type="button"
                onClick={() => {
                  navigate({ to: "/auth/login", search: { intent: "signup" } });
                  setValue("");
                  setError(null);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="text-left font-semibold text-accent hover:underline w-fit"
              >
                Switch to Sign Up
              </button>
            </div>
          )}
          {error === "mismatch-login" && (
            <div className="mt-1.5 text-xs text-destructive flex flex-col gap-1">
              <p>
                An account already exists with this email. Please log in
                instead.
              </p>
              <button
                type="button"
                onClick={() => {
                  navigate({ to: "/auth/login", search: { intent: "login" } });
                  setValue("");
                  setError(null);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="text-left font-semibold text-accent hover:underline w-fit"
              >
                Switch to Log In
              </button>
            </div>
          )}
          {error === "invalid-domain" && (
            <p className="mt-1.5 text-xs text-destructive">
              This email domain doesn't appear to be able to receive mail.
              Please double check for a typo.
            </p>
          )}
          {error &&
            error !== "mismatch-signup" &&
            error !== "mismatch-login" &&
            error !== "invalid-domain" && (
              <p className="mt-1.5 text-xs text-destructive">{error}</p>
            )}
        </div>

        <Button
          type="submit"
          disabled={!valid || loading}
          className="w-full h-11 btn-hero font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending code…
            </>
          ) : (
            <>
              Send OTP <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald" />
          Protected by enterprise-grade encryption
        </div>

        <div className="pt-4 text-center text-xs text-muted-foreground space-y-2.5">
          <div className="border-t border-muted pt-3">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <Link
                  to="/auth/login"
                  search={{ intent: "login" }}
                  className="font-semibold text-accent hover:underline"
                >
                  Sign In
                </Link>
              </>
            ) : (
              <>
                New to IntelliPlant?{" "}
                <Link
                  to="/auth/login"
                  search={{ intent: "signup" }}
                  className="font-semibold text-accent hover:underline"
                >
                  Create an account
                </Link>
              </>
            )}
          </div>
          <div>
            <Link to="/" className="hover:text-accent">
              ← Back to home
            </Link>
          </div>
        </div>
      </form>
    </AuthShell>
  );
}