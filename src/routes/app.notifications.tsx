import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import {
  Bell,
  Wrench,
  ShieldCheck,
  FileText,
  Bot,
  Cpu,
  Archive,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — IntelliPlant AI" }] }),
  component: Page,
});

type Cat = "all" | "maintenance" | "compliance" | "documents" | "ai" | "system";
interface Notif {
  id: string;
  cat: Exclude<Cat, "all">;
  title: string;
  body: string;
  time: string;
  read: boolean;
  priority: "high" | "medium" | "low";
}

const SEED: Notif[] = [
  {
    id: "1",
    cat: "maintenance",
    title: "Vibration anomaly on P-401",
    body: "Sensor exceeded threshold 4.2 mm/s at 14:22.",
    time: "12m ago",
    read: false,
    priority: "high",
  },
  {
    id: "2",
    cat: "compliance",
    title: "ISO 9001 audit completed",
    body: "Score 96/100. 3 minor findings assigned.",
    time: "1h ago",
    read: false,
    priority: "medium",
  },
  {
    id: "3",
    cat: "documents",
    title: "New SOP: Reactor R-3 start-up",
    body: "v4.1 uploaded and approved by document controller.",
    time: "3h ago",
    read: true,
    priority: "low",
  },
  {
    id: "4",
    cat: "ai",
    title: "AI insight generated",
    body: "Fleet-wide lube interval optimization opportunity detected.",
    time: "5h ago",
    read: false,
    priority: "medium",
  },
  {
    id: "5",
    cat: "system",
    title: "Weekly digest ready",
    body: "Your weekly operations summary is available to download.",
    time: "1d ago",
    read: true,
    priority: "low",
  },
  {
    id: "6",
    cat: "maintenance",
    title: "Work order WO-4820 assigned",
    body: "Corrective maintenance on Compressor C-12 · Critical.",
    time: "2d ago",
    read: true,
    priority: "high",
  },
];

const ICONS = {
  maintenance: Wrench,
  compliance: ShieldCheck,
  documents: FileText,
  ai: Bot,
  system: Cpu,
};

function Page() {
  const [items, setItems] = useState<Notif[]>(SEED);
  const [tab, setTab] = useState<Cat>("all");
  const [showUnread, setShowUnread] = useState(false);

  const filtered = items
    .filter((n) => tab === "all" || n.cat === tab)
    .filter((n) => !showUnread || !n.read);

  const markAllRead = () =>
    setItems((it) => it.map((n) => ({ ...n, read: true })));
  const archive = (id: string) =>
    setItems((it) => it.filter((n) => n.id !== id));
  const toggleRead = (id: string) =>
    setItems((it) =>
      it.map((n) => (n.id === id ? { ...n, read: !n.read } : n)),
    );

  const unread = items.filter((n) => !n.read).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={`${unread} unread across all categories`}
        actions={
          <>
            <Button variant="outline" onClick={markAllRead}>
              <Check className="mr-2 h-4 w-4" /> Mark all read
            </Button>
          </>
        }
      />

      <div className="flex items-center gap-1 flex-wrap mb-4">
        {(
          [
            "all",
            "maintenance",
            "compliance",
            "documents",
            "ai",
            "system",
          ] as Cat[]
        ).map((c) => (
          <button
            key={c}
            onClick={() => setTab(c)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition ${tab === c ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          >
            {c}
          </button>
        ))}
        <button
          onClick={() => setShowUnread(!showUnread)}
          className={`ml-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${showUnread ? "bg-accent/10 text-accent border border-accent/30" : "border border-border"}`}
        >
          Unread only
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="p-16 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto h-6 w-6 mb-2" /> No notifications
          </div>
        ) : (
          filtered.map((n) => {
            const I = ICONS[n.cat];
            return (
              <div
                key={n.id}
                onClick={() => toggleRead(n.id)}
                className={`flex items-start gap-3 p-4 hover:bg-muted/30 cursor-pointer ${!n.read ? "bg-accent/5" : ""}`}
              >
                {!n.read && (
                  <span className="mt-2 h-2 w-2 rounded-full bg-accent shrink-0" />
                )}
                <div
                  className={`grid h-9 w-9 place-items-center rounded-lg shrink-0 ${n.priority === "high" ? "bg-destructive/10 text-destructive" : n.priority === "medium" ? "bg-orange-500/10 text-orange-500" : "bg-accent/10 text-accent"}`}
                >
                  <I className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div
                      className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}
                    >
                      {n.title}
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase font-bold text-muted-foreground">
                      {n.cat}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {n.body}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {n.time}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    archive(n.id);
                  }}
                  className="grid h-7 w-7 place-items-center rounded hover:bg-muted"
                >
                  <Archive className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
