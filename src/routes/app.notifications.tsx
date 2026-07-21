import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Bell,
  Wrench,
  ShieldCheck,
  FileText,
  Bot,
  Cpu,
  Archive,
  Check,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notification } from "@/types/operational";
import { useAuth } from "@/store/auth";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — SynapseAi" }] }),
  component: Page,
});

type Cat = "all" | "maintenance" | "compliance" | "documents" | "ai" | "system";

const ICONS = {
  maintenance: Wrench,
  compliance: ShieldCheck,
  documents: FileText,
  ai: Bot,
  system: Cpu,
};

function Page() {
  const [items, setItems] = useState<Notification[]>([]);
  const [tab, setTab] = useState<Cat>("all");
  const [showUnread, setShowUnread] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const userRole = useAuth.getState().role;

      let query = supabase.from("notifications").select("*");
      if (userRole) {
        query = query.or(
          `user_id.eq.${user.id},and(user_id.is.null,metadata->>role.eq.${userRole})`,
        );
      } else {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;

      setItems(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const userRole = useAuth.getState().role;

      let query = supabase.from("notifications").update({ is_read: true });
      if (userRole) {
        query = query.or(
          `user_id.eq.${user.id},and(user_id.is.null,metadata->>role.eq.${userRole})`,
        );
      } else {
        query = query.eq("user_id", user.id);
      }

      const { error } = await query;

      if (error) throw error;
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch (err: unknown) {
      toast.error("Failed to mark read: " + (err as Error).message);
    }
  };

  const archive = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      if (error) throw error;

      setItems((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification archived");
    } catch (err: unknown) {
      toast.error("Failed to archive notification: " + (err as Error).message);
    }
  };

  const toggleRead = async (n: Notification) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: !n.is_read })
        .eq("id", n.id);

      if (error) throw error;
      setItems((prev) =>
        prev.map((item) =>
          item.id === n.id ? { ...item, is_read: !n.is_read } : item,
        ),
      );
    } catch (err: unknown) {
      toast.error("Failed to update status: " + (err as Error).message);
    }
  };

  const filtered = items
    .filter((n) => {
      const cat = n.metadata?.category || "system";
      return tab === "all" || cat === tab;
    })
    .filter((n) => !showUnread || !n.is_read);

  const unread = items.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

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
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
              tab === c
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {c}
          </button>
        ))}
        <button
          onClick={() => setShowUnread(!showUnread)}
          className={`ml-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            showUnread
              ? "bg-accent/10 text-accent border border-accent/30"
              : "border border-border"
          }`}
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
            const cat = n.metadata?.category || "system";
            const priority = n.metadata?.priority || "medium";
            const I = ICONS[cat as keyof typeof ICONS] || Cpu;
            return (
              <div
                key={n.id}
                onClick={() => toggleRead(n)}
                className={`flex items-start gap-3 p-4 hover:bg-muted/30 cursor-pointer ${
                  !n.is_read ? "bg-accent/5" : ""
                }`}
              >
                {!n.is_read && (
                  <span className="mt-2 h-2 w-2 rounded-full bg-accent shrink-0" />
                )}
                <div
                  className={`grid h-9 w-9 place-items-center rounded-lg shrink-0 ${
                    priority === "high"
                      ? "bg-destructive/10 text-destructive"
                      : priority === "medium"
                        ? "bg-orange-500/10 text-orange-500"
                        : "bg-accent/10 text-accent"
                  }`}
                >
                  <I className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div
                      className={`text-sm ${!n.is_read ? "font-semibold" : "font-medium"}`}
                    >
                      {n.title}
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase font-bold text-muted-foreground">
                      {cat}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {n.message}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleString()}
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
