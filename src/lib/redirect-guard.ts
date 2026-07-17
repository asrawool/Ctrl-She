import { useAuth } from "@/store/auth";

/**
 * Detects client-side routing redirect loops (e.g. 4+ redirects in under 1.5s).
 * If a loop is detected, it clears the local auth session and forces a hard breakout to /auth/login.
 */
export function detectRedirectLoop(currentPath: string) {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const key = "redirect_loop_history";

  try {
    const raw = sessionStorage.getItem(key);
    let history: Array<{ path: string; timestamp: number }> = raw
      ? JSON.parse(raw)
      : [];

    // Append current landing path
    history.push({ path: currentPath, timestamp: now });

    // Keep only entries from the last 1500ms
    history = history.filter((x) => now - x.timestamp < 1500);

    sessionStorage.setItem(key, JSON.stringify(history));

    if (history.length >= 4) {
      console.error(
        `[Redirect Guard] Redirect loop detected! Final landing path: "${currentPath}". Forcing logout breakout.`,
      );
      sessionStorage.removeItem(key);

      // Force client state cleanup and Supabase sign out
      useAuth.getState().logout();

      // Force hard page load to /auth/login to clear all routing memory
      window.location.href = "/auth/login";

      throw new Error("Redirect loop detected");
    }
  } catch (err) {
    if (err instanceof Error && err.message === "Redirect loop detected") {
      throw err;
    }
    console.warn("Redirect guard check skipped/errored:", err);
  }
}
