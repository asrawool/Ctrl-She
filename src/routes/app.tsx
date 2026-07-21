import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";
import { ensureAuthHydrated, useAuth } from "@/store/auth";
import { canAccess, type ModuleKey } from "@/services/rbac";
import { supabase } from "@/lib/supabase";
import {
  checkSessionVerificationFn,
  getUserRoleFn,
} from "@/services/webauthn.server";

import { detectRedirectLoop } from "@/lib/redirect-guard";

export const Route = createFileRoute("/app")({
  beforeLoad: async ({ location }) => {
    if (typeof window !== "undefined") {
      await ensureAuthHydrated();
      detectRedirectLoop(location.pathname);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw redirect({ to: "/auth/login" });
      }

      const token = session.access_token;

      // 1. Session verification check (Face ID completion)
      const verification = await checkSessionVerificationFn({
        data: { token },
      });
      if (!verification.verified) {
        // SECURITY COMMENT:
        // Redirection logic here enforces that the user must pass the Face ID step to access `/app/*` routes.
        // However, please note that ultimate protection for sensitive data still relies on Supabase RLS policies
        // on the actual data tables (e.g. checks based on auth.uid() or custom roles).
        // This session gate improves front-end UX/flow control, but database-level RLS is the real backstop.
        throw redirect({ to: "/auth/face" });
      }

      // 2. Database role verification (signup role persistence check)
      const roleRes = await getUserRoleFn({
        data: { token },
      });
      if (!roleRes.role) {
        throw redirect({ to: "/auth/role" });
      }

      // Sync server-side verified role to client-side Zustand store to prevent client spoofing
      useAuth.getState().setRole(roleRes.role, roleRes.customRole || undefined);

      // 3. Server-side module access authorization guard
      const path = location.pathname;
      const seg = path.split("/")[2];
      if (seg && seg !== "profile" && seg !== "dashboard") {
        if (!canAccess(roleRes.role, seg as ModuleKey)) {
          throw redirect({ to: "/app/dashboard" });
        }
      }
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const role = useAuth((s) => s.role);
  const navigate = useNavigate();

  // Route-level RBAC guard (redirect to dashboard if not allowed)
  useEffect(() => {
    const seg = path.split("/")[2];
    if (!seg || seg === "profile") return;
    if (!canAccess(role, seg as ModuleKey)) navigate({ to: "/app/dashboard" });
  }, [path, role, navigate]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <div
        style={{ paddingLeft: collapsed ? 76 : 260 }}
        className="min-w-0 transition-[padding] duration-300"
      >
        <AppTopbar />
        <main className="p-4 lg:p-6 xl:p-8 max-w-[1600px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
