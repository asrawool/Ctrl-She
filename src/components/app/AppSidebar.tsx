import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Bot,
  FileText,
  Share2,
  Wrench,
  ShieldCheck,
  BookOpen,
  BarChart3,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  Cpu,
  FileBadge,
  Boxes,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/store/auth";
import { canAccess, type ModuleKey } from "@/services/rbac";
import { useNavigate } from "@tanstack/react-router";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  module: ModuleKey;
};

const ITEMS: Item[] = [
  {
    to: "/app/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    module: "dashboard",
  },
  { to: "/app/copilot", label: "AI Copilot", icon: Bot, module: "copilot" },

  {
    to: "/app/documents",
    label: "Documents",
    icon: FileText,
    module: "documents",
  },
  { to: "/app/graph", label: "Knowledge Graph", icon: Share2, module: "graph" },
  {
    to: "/app/maintenance",
    label: "Maintenance Intelligence",
    icon: Wrench,
    module: "maintenance",
  },
  {
    to: "/app/quality",
    label: "Quality & Compliance",
    icon: ShieldCheck,
    module: "quality",
  },
  {
    to: "/app/lessons",
    label: "Lessons Learned",
    icon: BookOpen,
    module: "lessons",
  },
  {
    to: "/app/insurance",
    label: "Insurance & Certs",
    icon: FileBadge,
    module: "insurance",
  },
  {
    to: "/app/inventory",
    label: "Asset Inventory",
    icon: Boxes,
    module: "inventory",
  },
  {
    to: "/app/procurement",
    label: "Procurement Workflow",
    icon: ShoppingCart,
    module: "procurement",
  },
  {
    to: "/app/analytics",
    label: "Analytics",
    icon: BarChart3,
    module: "analytics",
  },
  {
    to: "/app/notifications",
    label: "Notifications",
    icon: Bell,
    module: "notifications",
  },
  {
    to: "/app/settings",
    label: "Settings",
    icon: Settings,
    module: "settings",
  },
  { to: "/app/help", label: "Help", icon: HelpCircle, module: "help" },
];

export function AppSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const role = useAuth((s) => s.role);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 260 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-card"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-border px-4 h-16">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan to-emerald shadow-[0_0_20px_rgba(0,194,255,0.4)]">
          <Cpu className="h-4 w-4 text-[#05122a]" strokeWidth={2.5} />
        </span>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="leading-tight overflow-hidden"
            >
              <div className="font-display text-sm font-bold whitespace-nowrap">
                IntelliPlant<span className="text-accent">.AI</span>
              </div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">
                Operations Brain
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {ITEMS.map((it) => {
          const allowed = canAccess(role, it.module);
          const active = path === it.to;
          const Icon = it.icon;
          const cls = `group flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition ${
            active
              ? "bg-accent/10 text-accent"
              : allowed
                ? "text-foreground/70 hover:bg-muted hover:text-foreground"
                : "text-muted-foreground/40 cursor-not-allowed"
          }`;
          const inner = (
            <>
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {it.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {active && !collapsed && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </>
          );
          return allowed ? (
            <Link
              key={it.to}
              to={it.to}
              className={cls}
              title={collapsed ? it.label : undefined}
            >
              {inner}
            </Link>
          ) : (
            <div
              key={it.to}
              className={cls}
              title={`${it.label} — not available for your role`}
            >
              {inner}
            </div>
          );
        })}
      </nav>

      {/* Footer actions */}
      <div className="border-t border-border p-2 space-y-1">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium text-foreground/70 hover:bg-destructive/10 hover:text-destructive transition"
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={onToggle}
          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted transition"
        >
          <ChevronLeft
            className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}
