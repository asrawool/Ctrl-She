import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { Loader2, Bell, Palette } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/store/auth";
import {
  getNotificationSettingsFn,
  saveNotificationSettingsFn,
  type NotificationSettings,
} from "@/services/settings.server";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — IntelliPlant AI" }] }),
  component: Page,
});

// Only tabs with real, working functionality are shown for now.
// AI / Language / Security / Permissions / API / Integrations
// will come back once there's actual data/logic behind them.
const TABS = [
  { id: "general", l: "General", i: Palette },
  { id: "notifications", l: "Notifications", i: Bell },
];

async function getToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Session expired. Please sign in again.");
  return session.access_token;
}

function Page() {
  const [tab, setTab] = useState("general");

  // Theme lives in the local Zustand auth store (already wired to
  // document.documentElement class toggling) so switching it actually
  // changes the UI immediately, and persists via the store's own
  // localStorage persistence.
  const theme = useAuth((s) => s.theme);
  const setTheme = useAuth((s) => s.setTheme);

  // Notifications are workspace-wide, stored in Supabase.
  const [notif, setNotif] = useState<NotificationSettings | null>(null);
  const [loadingNotif, setLoadingNotif] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tab !== "notifications" || notif) return;
    (async () => {
      try {
        const token = await getToken();
        const data = await getNotificationSettingsFn({ data: { token } });
        setNotif(data);
      } catch (err) {
        console.error("Failed to load notification settings:", err);
        toast.error("Could not load notification settings.");
      } finally {
        setLoadingNotif(false);
      }
    })();
  }, [tab, notif]);

  const saveNotifications = async (patch: Partial<NotificationSettings>) => {
    if (!notif) return;
    const prev = notif;
    const next = { ...notif, ...patch };
    setNotif(next);
    setSaving(true);
    try {
      const token = await getToken();
      await saveNotificationSettingsFn({ data: { token, ...next } });
      toast.success("Notification preferences updated");
    } catch (err) {
      setNotif(prev);
      console.error(err);
      toast.error("Failed to save notification settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage workspace preferences and notifications."
      />

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-border bg-card p-2 h-fit">
          {TABS.map((t) => {
            const I = t.i;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${tab === t.id ? "bg-accent/10 text-accent" : "hover:bg-muted"}`}
              >
                <I className="h-4 w-4" /> {t.l}
              </button>
            );
          })}
        </aside>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
          {tab === "general" && (
            <Section title="Appearance">
              <Row label="Theme" desc="Light or dark workspace">
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as "light" | "dark")}
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </Row>
            </Section>
          )}

          {tab === "notifications" && (
            <>
              {loadingNotif || !notif ? (
                <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading
                  settings...
                </div>
              ) : (
                <Section title="Notification channels">
                  <Row label="Email">
                    <Switch
                      checked={notif.notify_email}
                      disabled={saving}
                      onChange={(v) => saveNotifications({ notify_email: v })}
                    />
                  </Row>
                  <Row label="In-app">
                    <Switch
                      checked={notif.notify_inapp}
                      disabled={saving}
                      onChange={(v) => saveNotifications({ notify_inapp: v })}
                    />
                  </Row>
                  <Row label="Mobile push">
                    <Switch
                      checked={notif.notify_mobile_push}
                      disabled={saving}
                      onChange={(v) =>
                        saveNotifications({ notify_mobile_push: v })
                      }
                    />
                  </Row>
                  <Row label="SMS (critical only)">
                    <Switch
                      checked={notif.notify_sms_critical}
                      disabled={saving}
                      onChange={(v) =>
                        saveNotifications({ notify_sms_critical: v })
                      }
                    />
                  </Row>
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-display text-lg font-bold mb-3">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border last:border-0 pb-4 last:pb-0">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        {desc && (
          <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
        )}
      </div>
      {children}
    </div>
  );
}

function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative h-5 w-9 rounded-full transition disabled:opacity-50 ${checked ? "bg-accent" : "bg-muted"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`}
      />
    </button>
  );
}
