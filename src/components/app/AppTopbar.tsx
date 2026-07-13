import { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Search,
  Moon,
  Sun,
  Globe,
  LogOut,
  User,
  Settings as SettingsIcon,
  ChevronDown,
} from "lucide-react";
import { useAuth, ROLES } from "@/store/auth";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const LABELS: Record<string, string> = {
  app: "Workspace",
  dashboard: "Dashboard",
  copilot: "AI Copilot",
  knowledge: "Knowledge Hub",
  documents: "Documents",
  graph: "Knowledge Graph",
  maintenance: "Maintenance Intelligence",
  quality: "Quality & Compliance",
  lessons: "Lessons Learned",
  analytics: "Analytics",
  notifications: "Notifications",
  settings: "Settings",
  help: "Help",
  profile: "Profile",
};

const LANGS = [
  { c: "en", n: "English" },
  { c: "hi", n: "हिन्दी" },
  { c: "mr", n: "मराठी" },
  { c: "gu", n: "ગુજરાતી" },
  { c: "ta", n: "தமிழ்" },
  { c: "te", n: "తెలుగు" },
  { c: "bn", n: "বাংলা" },
  { c: "kn", n: "ಕನ್ನಡ" },
  { c: "pa", n: "ਪੰਜਾਬੀ" },
];

export function AppTopbar() {
  const {
    email,
    role,
    customRole,
    theme,
    toggleTheme,
    language,
    setLanguage,
    logout,
  } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");

  const segs = path.split("/").filter(Boolean);
  const roleLabel =
    role === "other" ? customRole : ROLES.find((r) => r.id === role)?.label;
  const initials = (email ?? "U").slice(0, 2).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4 lg:px-6 h-16">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm min-w-0 overflow-hidden">
        {segs.map((s, i) => {
          const last = i === segs.length - 1;
          return (
            <div key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground/50">/</span>}
              <span
                className={`${last ? "font-semibold text-foreground" : "text-muted-foreground"} truncate`}
              >
                {LABELS[s] ?? s}
              </span>
            </div>
          );
        })}
      </nav>

      {/* Search */}
      <div className="ml-auto hidden md:block relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSearchOpen(!!e.target.value);
          }}
          onFocus={() => setSearchOpen(!!q)}
          placeholder="Search documents, equipment, assets…"
          className="h-10 w-72 lg:w-96 rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-sm outline-none focus:border-accent focus:bg-background transition"
        />
        {searchOpen && (
          <div className="absolute right-0 top-12 w-96 rounded-xl border border-border bg-popover shadow-lg p-3">
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
              Recent
            </div>
            {[
              "Pump P-401 maintenance log",
              "ISO 9001 audit checklist",
              "Boiler B-12 incident report",
            ].map((r) => (
              <div
                key={r}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted cursor-pointer"
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                {r}
              </div>
            ))}
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-3 mb-2">
              Suggestions
            </div>
            <div className="text-xs text-muted-foreground italic">
              Type to search across documents, equipment, projects and knowledge
              articles.
            </div>
          </div>
        )}
      </div>

      {/* Language */}
      <DropdownMenu>
        <DropdownMenuTrigger className="hidden md:flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition">
          <Globe className="h-4 w-4" /> {language.toUpperCase()}{" "}
          <ChevronDown className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {LANGS.map((l) => (
            <DropdownMenuItem key={l.c} onClick={() => setLanguage(l.c)}>
              {l.n}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Theme */}
      <button
        onClick={toggleTheme}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted transition"
        title="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </button>

      {/* Notifications */}
      <Link
        to="/app/notifications"
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted transition"
      >
        <Bell className="h-4 w-4" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
      </Link>

      {/* Profile */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg pl-1 pr-2 py-1 hover:bg-muted transition">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-navy to-steel text-xs font-bold text-white">
            {initials}
          </span>
          <div className="hidden lg:block text-left leading-tight">
            <div className="text-xs font-semibold truncate max-w-[140px]">
              {email}
            </div>
            <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">
              {roleLabel}
            </div>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="text-xs font-semibold truncate">{email}</div>
            <div className="text-[10px] font-normal text-muted-foreground truncate">
              {roleLabel}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate({ to: "/app/profile" })}>
            <User className="mr-2 h-4 w-4" /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate({ to: "/app/settings" })}>
            <SettingsIcon className="mr-2 h-4 w-4" /> Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
