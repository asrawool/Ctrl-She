import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth, ROLES } from "@/store/auth";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Profile — IntelliPlant AI" }] }),
  component: Page,
});

function Page() {
  const { email, role, customRole, language } = useAuth();
  const roleLabel = role==="other" ? customRole : ROLES.find(r=>r.id===role)?.label;
  const initials = (email??"U").slice(0,2).toUpperCase();

  return (
    <>
      <PageHeader title="Profile" description="Personal information, role and security preferences." />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6 text-center h-fit">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-2xl bg-gradient-to-br from-navy to-steel text-white font-display text-3xl font-bold">{initials}</div>
          <div className="mt-4 font-display text-lg font-bold truncate">{email}</div>
          <div className="text-xs text-muted-foreground">{roleLabel}</div>
          <Button variant="outline" size="sm" className="mt-4">Change avatar</Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><Input defaultValue={email?.split("@")[0]} /></Field>
            <Field label="Email"><Input value={email ?? ""} readOnly /></Field>
            <Field label="Designation"><Input defaultValue={roleLabel ?? ""} readOnly /></Field>
            <Field label="Department"><Input defaultValue="Operations" /></Field>
            <Field label="Plant"><Input defaultValue="Plant Alpha" /></Field>
            <Field label="Language"><Input defaultValue={language} /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline">Cancel</Button>
            <Button className="btn-hero">Save changes</Button>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
