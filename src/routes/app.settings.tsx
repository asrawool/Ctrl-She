import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Bot, Palette, Globe, ShieldCheck, KeyRound, Zap, Plug } from "lucide-react";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — IntelliPlant AI" }] }),
  component: Page,
});

const TABS = [
  { id:"general", l:"General", i:Palette },
  { id:"ai", l:"AI", i:Bot },
  { id:"notifications", l:"Notifications", i:Bell },
  { id:"language", l:"Language", i:Globe },
  { id:"security", l:"Security", i:ShieldCheck },
  { id:"permissions", l:"Permissions", i:KeyRound },
  { id:"api", l:"API", i:Zap },
  { id:"integrations", l:"Integrations", i:Plug },
];

function Page() {
  const [tab, setTab] = useState("general");

  return (
    <>
      <PageHeader title="Settings" description="Manage workspace preferences, AI behavior, notifications and integrations." />

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-border bg-card p-2 h-fit">
          {TABS.map((t) => {
            const I = t.i;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${tab===t.id?"bg-accent/10 text-accent":"hover:bg-muted"}`}>
                <I className="h-4 w-4" /> {t.l}
              </button>
            );
          })}
        </aside>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
          {tab==="general" && (<>
            <Section title="Appearance">
              <Row label="Theme" desc="Light or dark workspace">
                <select className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
                  <option>System</option><option>Light</option><option>Dark</option>
                </select>
              </Row>
              <Row label="Density" desc="Compact reduces spacing across the app">
                <select className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
                  <option>Comfortable</option><option>Compact</option>
                </select>
              </Row>
            </Section>
          </>)}

          {tab==="ai" && (
            <Section title="AI Copilot">
              <Row label="Response style" desc="How the AI presents answers">
                <select className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
                  <option>Engineer-grade (detailed)</option><option>Executive summary</option><option>Step-by-step</option>
                </select>
              </Row>
              <Row label="Confidence threshold" desc="Minimum confidence to show a recommendation">
                <input type="range" min="50" max="99" defaultValue="80" className="w-40" />
              </Row>
              <Row label="Voice output" desc="Read AI responses aloud"><Switch /></Row>
            </Section>
          )}

          {tab==="notifications" && (
            <Section title="Notification channels">
              {["Email","In-app","Mobile push","SMS (critical only)"].map(c=>(
                <Row key={c} label={c}><Switch defaultOn /></Row>
              ))}
            </Section>
          )}

          {tab==="language" && (
            <Section title="Language & Region">
              <Row label="Interface language">
                <select className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
                  <option>English</option><option>हिन्दी</option><option>मराठी</option><option>ગુજરાતી</option><option>தமிழ்</option>
                </select>
              </Row>
              <Row label="Units"><select className="h-9 rounded-lg border border-border bg-background px-3 text-sm"><option>Metric (SI)</option><option>Imperial</option></select></Row>
            </Section>
          )}

          {tab==="security" && (
            <Section title="Account security">
              <Row label="Change password"><Button variant="outline" size="sm">Update</Button></Row>
              <Row label="Two-factor authentication" desc="Face ID + OTP enabled"><span className="text-xs font-semibold text-emerald">Enabled</span></Row>
              <Row label="Active sessions" desc="Sign out from other devices"><Button variant="outline" size="sm">Manage</Button></Row>
            </Section>
          )}

          {tab==="permissions" && (
            <Section title="Role permissions">
              <p className="text-sm text-muted-foreground">Fine-grained permissions are managed by your plant administrator. Contact them to request access to additional modules.</p>
            </Section>
          )}

          {tab==="api" && (
            <Section title="API connections">
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground text-center">
                No API keys configured. Wire this section to your backend to manage keys.
              </div>
            </Section>
          )}

          {tab==="integrations" && (
            <Section title="Integrations">
              <div className="grid gap-2 sm:grid-cols-2">
                {["SAP PM","IBM Maximo","Oracle EAM","Microsoft 365","Slack","Google Workspace"].map((n)=>(
                  <div key={n} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                    <span className="font-medium">{n}</span>
                    <Button variant="outline" size="sm">Connect</Button>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h3 className="font-display text-lg font-bold mb-3">{title}</h3><div className="space-y-4">{children}</div></div>;
}
function Row({ label, desc, children }: { label: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border last:border-0 pb-4 last:pb-0">
      <div><div className="text-sm font-semibold">{label}</div>{desc && <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>}</div>
      {children}
    </div>
  );
}
function Switch({ defaultOn }: { defaultOn?: boolean } = {}) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <button onClick={()=>setOn(!on)} className={`relative h-5 w-9 rounded-full transition ${on?"bg-accent":"bg-muted"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${on?"translate-x-4":"translate-x-0.5"}`} />
    </button>
  );
}
// silence unused
void Input;
