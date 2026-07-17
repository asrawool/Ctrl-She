import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/store/auth";
import { supabase } from "@/lib/supabase";
import { detectRedirectLoop } from "@/lib/redirect-guard";

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    // Redirect authenticated users away from auth flow
    if (typeof window !== "undefined") {
      detectRedirectLoop(location.pathname);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const state = useAuth.getState();

      // If visiting `/auth/face`, let the child route handle the server-side check
      if (location.pathname === "/auth/face") {
        return;
      }

      if (session && state.authenticated) {
        throw redirect({ to: "/app/dashboard" });
      }
    }
  },
  component: () => <Outlet />,
});
