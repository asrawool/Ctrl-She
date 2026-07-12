import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/store/auth";

export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    // Redirect authenticated users away from auth flow
    if (typeof window !== "undefined") {
      const state = useAuth.getState();
      if (state.authenticated) throw redirect({ to: "/app/dashboard" });
    }
  },
  component: () => <Outlet />,
});
