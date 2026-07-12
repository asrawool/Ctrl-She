import { createFileRoute, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";
import { useAuth } from "@/store/auth";
import { canAccess, type ModuleKey } from "@/services/rbac";

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !useAuth.getState().authenticated) {
      throw redirect({ to: "/auth/login" });
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
    <div className="min-h-screen bg-background">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div style={{ paddingLeft: collapsed ? 76 : 260 }} className="transition-[padding] duration-300">
        <AppTopbar />
        <main className="p-4 lg:p-6 xl:p-8 max-w-[1600px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
