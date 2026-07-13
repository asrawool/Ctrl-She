import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/store/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    // Redirect authenticated users away from auth flow
    if (typeof window !== "undefined") {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const state = useAuth.getState();
      if (session && state.authenticated) {
        throw redirect({ to: "/app/dashboard" });
      }
    }
  },
  component: () => <Outlet />,
});
