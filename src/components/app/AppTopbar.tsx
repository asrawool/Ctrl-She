import { useState, useEffect } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Search,
  LogOut,
  User,
  Settings as SettingsIcon,
  ChevronDown,
  FileText,
  Wrench,
  ShieldCheck,
  FileBadge,
  Boxes,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth, ROLES, getInitials } from "@/store/auth";
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

interface SearchResults {
  documents: { id: string; name: string }[];
  assets: { id: string; name: string }[];
  workOrders: { id: string; title: string }[];
  ncrs: { id: string; ncr_number: string; description: string }[];
  insurance: { id: string; machine: string; policy_no: string }[];
  inventory: { id: string; name: string; item_code: string }[];
}

export function AppTopbar() {
  const { email, role, customRole, fullName, logout } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>({
    documents: [],
    assets: [],
    workOrders: [],
    ncrs: [],
    insurance: [],
    inventory: [],
  });

  useEffect(() => {
    if (!q.trim()) {
      setResults({
        documents: [],
        assets: [],
        workOrders: [],
        ncrs: [],
        insurance: [],
        inventory: [],
      });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const [
          { data: docs },
          { data: asts },
          { data: wos },
          { data: ncrList },
          { data: ins },
          { data: inv },
        ] = await Promise.all([
          supabase
            .from("documents")
            .select("id, name")
            .ilike("name", `%${q}%`)
            .limit(3),
          supabase
            .from("assets")
            .select("id, name")
            .ilike("name", `%${q}%`)
            .limit(3),
          supabase
            .from("work_orders")
            .select("id, title")
            .ilike("title", `%${q}%`)
            .limit(3),
          supabase
            .from("ncrs")
            .select("id, ncr_number, description")
            .or(`ncr_number.ilike.%${q}%,description.ilike.%${q}%`)
            .limit(3),
          supabase
            .from("insurance_policies")
            .select("id, machine, policy_no")
            .or(`machine.ilike.%${q}%,policy_no.ilike.%${q}%`)
            .limit(3),
          supabase
            .from("spare_parts")
            .select("id, name, item_code:part_code")
            .or(`name.ilike.%${q}%,part_code.ilike.%${q}%`)
            .limit(3),
        ]);

        setResults({
          documents: docs || [],
          assets: asts || [],
          workOrders: wos || [],
          ncrs: ncrList || [],
          insurance: ins || [],
          inventory: inv || [],
        });
      } catch (err) {
        console.error("Global search failed:", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (!fullName) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase
            .from("user_profiles")
            .select("full_name")
            .eq("user_id", user.id)
            .maybeSingle()
            .then(({ data }) => {
              if (data?.full_name) {
                useAuth.getState().setFullName(data.full_name);
              }
            });
        }
      });
    }
  }, [fullName]);

  const segs = path.split("/").filter(Boolean);
  const roleLabel =
    role === "other" ? customRole : ROLES.find((r) => r.id === role)?.label;
  const initials = getInitials(fullName, email);

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  const hasAnyResults = Object.values(results).some((arr) => arr.length > 0);

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
          <div className="absolute right-0 top-12 w-[450px] rounded-xl border border-border bg-popover shadow-lg p-3.5 max-h-[480px] overflow-y-auto z-50 space-y-3.5">
            {!hasAnyResults ? (
              <div className="text-xs text-muted-foreground italic text-center py-4">
                No matching records found for "{q}"
              </div>
            ) : (
              <>
                {results.documents.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                      Documents
                    </div>
                    <div className="space-y-1">
                      {results.documents.map((d) => (
                        <Link
                          key={d.id}
                          to="/app/documents"
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted text-foreground transition"
                        >
                          <FileText className="h-3.5 w-3.5 text-accent shrink-0" />
                          <span className="truncate">{d.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {results.assets.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                      Assets & Equipment
                    </div>
                    <div className="space-y-1">
                      {results.assets.map((a) => (
                        <Link
                          key={a.id}
                          to="/app/maintenance"
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted text-foreground transition"
                        >
                          <Wrench className="h-3.5 w-3.5 text-accent shrink-0" />
                          <span className="truncate">
                            {a.name} ({a.id})
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {results.workOrders.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                      Active Work Orders
                    </div>
                    <div className="space-y-1">
                      {results.workOrders.map((w) => (
                        <Link
                          key={w.id}
                          to="/app/maintenance"
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted text-foreground transition"
                        >
                          <SettingsIcon className="h-3.5 w-3.5 text-accent shrink-0" />
                          <span className="truncate">
                            {w.title} ({w.id})
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {results.ncrs.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                      Non-Conformance Reports (NCRs)
                    </div>
                    <div className="space-y-1">
                      {results.ncrs.map((n) => (
                        <Link
                          key={n.id}
                          to="/app/quality"
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted text-foreground transition"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-accent shrink-0" />
                          <span className="truncate">
                            {n.ncr_number}: {n.description}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {results.insurance.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                      Insurance & Licenses
                    </div>
                    <div className="space-y-1">
                      {results.insurance.map((insur) => (
                        <Link
                          key={insur.id}
                          to="/app/insurance"
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted text-foreground transition"
                        >
                          <FileBadge className="h-3.5 w-3.5 text-accent shrink-0" />
                          <span className="truncate">
                            {insur.machine} ({insur.policy_no})
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {results.inventory.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                      Asset Inventory Spares
                    </div>
                    <div className="space-y-1">
                      {results.inventory.map((inve) => (
                        <Link
                          key={inve.id}
                          to="/app/inventory"
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted text-foreground transition"
                        >
                          <Boxes className="h-3.5 w-3.5 text-accent shrink-0" />
                          <span className="truncate">
                            {inve.name} ({inve.item_code})
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Profile */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg pl-1 pr-2 py-1 hover:bg-muted transition">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-navy to-steel text-xs font-bold text-white">
            {initials}
          </span>
          <div className="text-left leading-tight">
            <div className="text-xs font-semibold truncate max-w-[140px]">
              {fullName || roleLabel}
            </div>
            <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">
              {roleLabel}
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="text-xs font-semibold truncate">{fullName || email}</div>
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
