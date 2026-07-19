import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  ShieldCheck,
  FileBadge,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  Download,
  Upload,
  RefreshCw,
  Eye,
  X,
  Bell,
  Plus,
} from "lucide-react";
import { exportCsv, exportPdfReport } from "@/services/export";
import {
  InsurancePolicy,
  MachineLicense,
  Certification,
  Asset,
} from "@/types/operational";
import { useAuth } from "@/store/auth";
import { hasPermission, getActionRequiredRolesLabel } from "@/services/rbac";

export const Route = createFileRoute("/app/insurance")({
  head: () => ({
    meta: [{ title: "Insurance & Certifications — IntelliPlant AI" }],
  }),
  component: Page,
});

type PolicyStatus = "Active" | "Expiring Soon" | "Expired";

function Page() {
  const { role } = useAuth();
  const canAddPolicy = hasPermission(role, "create:insurance_policies");
  const canAddLicense = hasPermission(role, "create:machine_licenses");
  const canAddCert = hasPermission(role, "create:certifications");

  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [licenses, setLicenses] = useState<MachineLicense[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [assets, setAssets] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<"All" | PolicyStatus>("All");
  const [sortBy, setSortBy] = useState<"expiry" | "machine">("expiry");

  // Modal Display States
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<InsurancePolicy | null>(
    null,
  );

  // Form States
  const [policyForm, setPolicyForm] = useState({
    id: "", // filled for editing/renewal
    machine: "",
    asset_id: "",
    provider: "",
    policy_no: "",
    start_date: "",
    expiry_date: "",
    coverage: "",
  });

  const [licenseForm, setLicenseForm] = useState({
    id: "",
    kind: "Equipment License",
    cert_no: "",
    issue_date: "",
    expiry_date: "",
    department: "",
  });

  const [certForm, setCertForm] = useState({
    id: "",
    name: "",
    category: "",
    issuer: "",
    expiry_date: "",
    version: "v1.0",
  });

  const fetchData = async () => {
    try {
      const [
        { data: polData },
        { data: licData },
        { data: certsData },
        { data: astData },
      ] = await Promise.all([
        supabase.from("insurance_policies").select("*"),
        supabase.from("machine_licenses").select("*"),
        supabase.from("certifications").select("*"),
        supabase.from("assets").select("id, name"),
      ]);

      setPolicies(polData || []);
      setLicenses(licData || []);
      setCertifications(certsData || []);
      setAssets(astData || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load insurance database records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to log user notifications on database events (renewals)
  const logRenewalNotification = async (title: string, message: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.rpc("create_notification", {
        target_user_id: user.id,
        title,
        message,
        type: "info",
        metadata: { category: "compliance", priority: "medium" },
      });
    } catch (err) {
      console.error("Failed to log notification via RPC:", err);
    }
  };

  const handleCheckExpiringItems = async () => {
    try {
      const today = new Date();
      const in30Days = new Date();
      in30Days.setDate(today.getDate() + 30);

      // Query database for expiring/expired items
      const [{ data: expPolicies }, { data: expLicenses }, { data: expCerts }] =
        await Promise.all([
          supabase
            .from("insurance_policies")
            .select("id, machine, policy_no, expiry_date"),
          supabase
            .from("machine_licenses")
            .select("id, kind, cert_no, expiry_date"),
          supabase.from("certifications").select("id, name, expiry_date"),
        ]);

      const expiringItems: Array<{
        id: string;
        name: string;
        expiry_date: string;
        type: "policy" | "license" | "certification";
      }> = [];

      const checkItem = (
        id: string,
        name: string,
        expiryStr: string | null,
        type: "policy" | "license" | "certification",
      ) => {
        if (!expiryStr) return;
        const expiry = new Date(expiryStr);
        if (expiry <= in30Days) {
          expiringItems.push({ id, name, expiry_date: expiryStr, type });
        }
      };

      (expPolicies || []).forEach((p) =>
        checkItem(
          p.id,
          `${p.machine} (Policy No: ${p.policy_no})`,
          p.expiry_date,
          "policy",
        ),
      );
      (expLicenses || []).forEach((l) =>
        checkItem(
          l.id,
          `${l.kind} (Cert No: ${l.cert_no})`,
          l.expiry_date,
          "license",
        ),
      );
      (expCerts || []).forEach((c) =>
        checkItem(c.id, c.name, c.expiry_date, "certification"),
      );

      if (expiringItems.length === 0) {
        toast.info("No expiring or expired items found.");
        return;
      }

      // Fetch existing notifications from "today" (last 24 hours) to deduplicate
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      const { data: existingNotifs } = await supabase
        .from("notifications")
        .select("metadata")
        .eq("metadata->>role", "safety_officer")
        .gte("created_at", dayAgo.toISOString());

      const notifiedIds = new Set<string>();
      (existingNotifs || []).forEach((n) => {
        if (n.metadata && n.metadata.entity_id) {
          notifiedIds.add(n.metadata.entity_id);
        }
      });

      let notifiedCount = 0;
      await Promise.all(
        expiringItems.map(async (item) => {
          if (notifiedIds.has(item.id)) {
            return;
          }

          const expiry = new Date(item.expiry_date);
          const isExpired = expiry < today;
          const statusLabel = isExpired ? "already expired" : "expiring soon";
          const title = `${isExpired ? "Expired" : "Expiring Soon"}: ${item.name}`;
          const message = `The ${item.type} "${item.name}" is ${statusLabel}. Expiry date: ${new Date(item.expiry_date).toLocaleDateString()}.`;

          const { error } = await supabase.rpc("create_notification", {
            target_user_id: null,
            title,
            message,
            type: isExpired ? "warning" : "info",
            metadata: {
              category: "compliance",
              priority: isExpired ? "high" : "medium",
              role: "safety_officer",
              entity_id: item.id,
            },
          });

          if (!error) {
            notifiedCount++;
          }
        }),
      );

      toast.success(
        `${notifiedCount} items flagged for renewal${notifiedCount < expiringItems.length ? ` (${expiringItems.length - notifiedCount} already notified)` : ""}`,
      );
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to run expiration checks: " + (err as Error).message);
    }
  };

  // Helper to calculate status dynamically based on current date
  const deriveStatus = (expiryDateStr: string): PolicyStatus => {
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return "Expired";
    } else if (diffDays <= 30) {
      return "Expiring Soon";
    } else {
      return "Active";
    }
  };

  // Save or Renew Policy
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const status = deriveStatus(policyForm.expiry_date);
      const isNew = !policyForm.id;

      let error;
      if (isNew) {
        ({ error } = await supabase.from("insurance_policies").insert({
          machine: policyForm.machine,
          asset_id: policyForm.asset_id || null,
          provider: policyForm.provider,
          policy_no: policyForm.policy_no,
          start_date: policyForm.start_date,
          expiry_date: policyForm.expiry_date,
          coverage: policyForm.coverage,
          status,
        }));
      } else {
        ({ error } = await supabase
          .from("insurance_policies")
          .update({
            machine: policyForm.machine,
            asset_id: policyForm.asset_id || null,
            provider: policyForm.provider,
            policy_no: policyForm.policy_no,
            start_date: policyForm.start_date,
            expiry_date: policyForm.expiry_date,
            coverage: policyForm.coverage,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", policyForm.id));
      }

      if (error) throw error;

      const title = isNew ? "New Policy Added" : "Policy Renewed";
      const msg = `Insurance policy ${policyForm.policy_no} for ${policyForm.machine} has been registered/renewed.`;
      toast.success(title);
      logRenewalNotification(title, msg);

      setShowPolicyModal(false);
      setPolicyForm({
        id: "",
        machine: "",
        asset_id: "",
        provider: "",
        policy_no: "",
        start_date: "",
        expiry_date: "",
        coverage: "",
      });
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to save policy: " + (err as Error).message);
    }
  };

  // Save or Renew License
  const handleSaveLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const status = deriveStatus(licenseForm.expiry_date);
      const isNew = !licenseForm.id;

      let error;
      if (isNew) {
        ({ error } = await supabase.from("machine_licenses").insert({
          kind: licenseForm.kind,
          cert_no: licenseForm.cert_no,
          issue_date: licenseForm.issue_date,
          expiry_date: licenseForm.expiry_date,
          department: licenseForm.department,
          status,
        }));
      } else {
        ({ error } = await supabase
          .from("machine_licenses")
          .update({
            kind: licenseForm.kind,
            cert_no: licenseForm.cert_no,
            issue_date: licenseForm.issue_date,
            expiry_date: licenseForm.expiry_date,
            department: licenseForm.department,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", licenseForm.id));
      }

      if (error) throw error;

      const title = isNew ? "New License Logged" : "License Renewed";
      const msg = `License ${licenseForm.cert_no} (${licenseForm.kind}) has been updated/renewed.`;
      toast.success(title);
      logRenewalNotification(title, msg);

      setShowLicenseModal(false);
      setLicenseForm({
        id: "",
        kind: "Equipment License",
        cert_no: "",
        issue_date: "",
        expiry_date: "",
        department: "",
      });
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to save license: " + (err as Error).message);
    }
  };

  // Save or Renew Certification
  const handleSaveCert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const status = deriveStatus(certForm.expiry_date);
      const isNew = !certForm.id;

      let error;
      if (isNew) {
        ({ error } = await supabase.from("certifications").insert({
          name: certForm.name,
          category: certForm.category,
          issuer: certForm.issuer,
          expiry_date: certForm.expiry_date,
          version: certForm.version,
          status,
        }));
      } else {
        ({ error } = await supabase
          .from("certifications")
          .update({
            name: certForm.name,
            category: certForm.category,
            issuer: certForm.issuer,
            expiry_date: certForm.expiry_date,
            version: certForm.version,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", certForm.id));
      }

      if (error) throw error;

      const title = isNew ? "New Certification Saved" : "Certification Renewed";
      const msg = `Certification ${certForm.name} (Version: ${certForm.version}) has been updated.`;
      toast.success(title);
      logRenewalNotification(title, msg);

      setShowCertModal(false);
      setCertForm({
        id: "",
        name: "",
        category: "",
        issuer: "",
        expiry_date: "",
        version: "v1.0",
      });
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to save certification: " + (err as Error).message);
    }
  };

  // Process data lists with derived status
  const processedPolicies = useMemo(() => {
    return policies.map((p) => ({
      ...p,
      derivedStatus: deriveStatus(p.expiry_date),
    }));
  }, [policies]);

  const processedLicenses = useMemo(() => {
    return licenses.map((l) => ({
      ...l,
      derivedStatus: deriveStatus(l.expiry_date),
    }));
  }, [licenses]);

  const processedCerts = useMemo(() => {
    return certifications.map((c) => ({
      ...c,
      derivedStatus: deriveStatus(c.expiry_date),
    }));
  }, [certifications]);

  // Filtering & Sorting for Policies
  const filteredPolicies = useMemo(() => {
    let list = processedPolicies.filter(
      (p) =>
        (statusF === "All" || p.derivedStatus === statusF) &&
        (q === "" ||
          [p.machine, p.asset_id || "", p.provider, p.policy_no].some((f) =>
            f.toLowerCase().includes(q.toLowerCase()),
          )),
    );

    list = [...list].sort((a, b) =>
      sortBy === "expiry"
        ? a.expiry_date.localeCompare(b.expiry_date)
        : a.machine.localeCompare(b.machine),
    );
    return list;
  }, [processedPolicies, q, statusF, sortBy]);

  // KPI Computations
  const totalPolicies = processedPolicies.length;
  const expiredCount =
    processedPolicies.filter((p) => p.derivedStatus === "Expired").length +
    processedLicenses.filter((l) => l.derivedStatus === "Expired").length +
    processedCerts.filter((c) => c.derivedStatus === "Expired").length;

  const expiringSoonCount =
    processedPolicies.filter((p) => p.derivedStatus === "Expiring Soon")
      .length +
    processedLicenses.filter((l) => l.derivedStatus === "Expiring Soon")
      .length +
    processedCerts.filter((c) => c.derivedStatus === "Expiring Soon").length;

  const activeCount =
    processedPolicies.filter((p) => p.derivedStatus === "Active").length +
    processedLicenses.filter((l) => l.derivedStatus === "Active").length +
    processedCerts.filter((c) => c.derivedStatus === "Active").length;

  const kpis = [
    { i: ShieldCheck, l: "Total Insured", v: totalPolicies, tone: "cyan" },
    { i: Clock, l: "Expiring soon", v: expiringSoonCount, tone: "warning" },
    { i: AlertTriangle, l: "Expired", v: expiredCount, tone: "destructive" },
    { i: CheckCircle2, l: "Active items", v: activeCount, tone: "emerald" },
  ];

  const handleExport = () => {
    const cols = [
      "Policy ID",
      "Machine",
      "Asset ID",
      "Provider",
      "Policy No",
      "Start Date",
      "Expiry Date",
      "Coverage",
      "Status",
    ];
    exportCsv(
      "Insurance_Policies",
      cols,
      filteredPolicies.map((p) => [
        p.id,
        p.machine,
        p.asset_id || "—",
        p.provider,
        p.policy_no,
        p.start_date,
        p.expiry_date,
        p.coverage,
        p.derivedStatus,
      ]),
    );
  };

  const handlePdf = () => {
    exportPdfReport({
      title: "Insurance & Certifications Report",
      subtitle:
        "Active policies, machine licenses and compliance certifications",
      kpis: kpis.map((k) => ({ label: k.l, value: String(k.v) })),
      sections: [
        {
          heading: "Insurance Policies",
          columns: [
            "Machine",
            "Asset ID",
            "Provider",
            "Policy No",
            "Expiry",
            "Coverage",
            "Status",
          ],
          rows: filteredPolicies.map((p) => [
            p.machine,
            p.asset_id || "—",
            p.provider,
            p.policy_no,
            p.expiry_date,
            p.coverage,
            p.derivedStatus,
          ]),
        },
        {
          heading: "Machine Licenses",
          columns: ["Type", "Certificate No", "Department", "Expiry", "Status"],
          rows: processedLicenses.map((l) => [
            l.kind,
            l.cert_no,
            l.department,
            l.expiry_date,
            l.derivedStatus,
          ]),
        },
        {
          heading: "Certifications",
          columns: [
            "Certification",
            "Category",
            "Issuer",
            "Version",
            "Expiry",
            "Status",
          ],
          rows: processedCerts.map((c) => [
            c.name,
            c.category,
            c.issuer,
            c.version,
            c.expiry_date,
            c.derivedStatus,
          ]),
        },
      ],
      filename: `Insurance_Certifications_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  function StatusBadge({ s }: { s: PolicyStatus }) {
    const map: Record<PolicyStatus, string> = {
      Active: "bg-emerald/10 text-emerald border-emerald/30",
      "Expiring Soon": "bg-orange-500/10 text-orange-500 border-orange-500/30",
      Expired: "bg-destructive/10 text-destructive border-destructive/30",
    };
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${map[s]}`}
      >
        {s}
      </span>
    );
  }

  return (
    <>
      <PageHeader
        title="Insurance & Certifications"
        description="Track machine insurance policies, operating licenses and regulatory certifications with expiry alerts."
        actions={
          <div className="flex flex-wrap gap-2">
            {role === "safety_officer" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckExpiringItems}
              >
                <Bell className="mr-1.5 h-3.5 w-3.5" /> Check for Expiring Items
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePdf}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPolicyModal(true)}
              disabled={!canAddPolicy}
              title={
                !canAddPolicy
                  ? `Requires ${getActionRequiredRolesLabel("create:insurance_policies")} role`
                  : undefined
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Policy
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowLicenseModal(true)}
              disabled={!canAddLicense}
              title={
                !canAddLicense
                  ? `Requires ${getActionRequiredRolesLabel("create:machine_licenses")} role`
                  : undefined
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add License
            </Button>
            <Button
              size="sm"
              className="btn-hero"
              onClick={() => setShowCertModal(true)}
              disabled={!canAddCert}
              title={
                !canAddCert
                  ? `Requires ${getActionRequiredRolesLabel("create:certifications")} role`
                  : undefined
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Cert
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ i: I, l, v, tone }) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-4">
            <div
              className={`grid h-9 w-9 place-items-center rounded-lg ${
                tone === "emerald"
                  ? "bg-emerald/10 text-emerald"
                  : tone === "warning"
                    ? "bg-orange-500/10 text-orange-500"
                    : tone === "destructive"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-accent/10 text-accent"
              }`}
            >
              <I className="h-4.5 w-4.5" />
            </div>
            <div className="mt-3 font-display text-2xl font-bold">{v}</div>
            <div className="text-xs text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search machine, provider, policy…"
            className="h-10 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-sm outline-none focus:border-accent focus:bg-background transition"
          />
        </div>
        <select
          value={statusF}
          onChange={(e) => setStatusF(e.target.value as "All" | PolicyStatus)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
        >
          {["All", "Active", "Expiring Soon", "Expired"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "expiry" | "machine")}
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
        >
          <option value="expiry">Sort: Expiry Date</option>
          <option value="machine">Sort: Machine Name</option>
        </select>
      </div>

      {/* Policies grid */}
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredPolicies.length === 0 && (
          <div className="col-span-full rounded-2xl border border-border bg-card">
            <EmptyState
              icon={FileBadge}
              title="No policies match"
              description="Try clearing filters or search parameters."
            />
          </div>
        )}
        {filteredPolicies.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-border bg-card p-5 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  {p.asset_id || "—"}
                </div>
                <div className="font-display font-semibold text-sm truncate max-w-[200px]">
                  {p.machine}
                </div>
              </div>
              <StatusBadge s={p.derivedStatus} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <Field label="Provider" value={p.provider} />
              <Field label="Policy No" value={p.policy_no} />
              <Field label="Start Date" value={p.start_date} />
              <Field label="Expiry Date" value={p.expiry_date} />
              <Field label="Coverage" value={p.coverage} />
              <Field
                label="Reminder"
                value={
                  p.derivedStatus === "Expiring Soon"
                    ? "Under 30 days"
                    : p.derivedStatus === "Expired"
                      ? "Overdue"
                      : "Active"
                }
              />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  setPolicyForm({
                    id: p.id,
                    machine: p.machine,
                    asset_id: p.asset_id || "",
                    provider: p.provider,
                    policy_no: p.policy_no,
                    start_date: p.start_date,
                    expiry_date: p.expiry_date,
                    coverage: p.coverage,
                  });
                  setShowPolicyModal(true);
                }}
              >
                Renew / Edit
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Licenses */}
      <h2 className="mt-10 font-display text-xl font-bold">
        Machine License Management
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Equipment licenses, permits, calibration & OEM authorizations.
      </p>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              {[
                "Type",
                "Certificate No",
                "Issue Date",
                "Expiry",
                "Department",
                "Status",
                "Actions",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processedLicenses.map((l) => (
              <tr
                key={l.id}
                className="border-t border-border hover:bg-muted/30"
              >
                <td className="px-4 py-3 font-medium text-xs">{l.kind}</td>
                <td className="px-4 py-3 font-mono text-xs">{l.cert_no}</td>
                <td className="px-4 py-3 text-xs">{l.issue_date}</td>
                <td className="px-4 py-3 text-xs">{l.expiry_date}</td>
                <td className="px-4 py-3 text-xs">{l.department}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                      l.derivedStatus === "Expired"
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : l.derivedStatus === "Expiring Soon"
                          ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                          : "bg-emerald/10 text-emerald border-emerald/20"
                    }`}
                  >
                    {l.derivedStatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      setLicenseForm({
                        id: l.id,
                        kind: l.kind,
                        cert_no: l.cert_no,
                        issue_date: l.issue_date,
                        expiry_date: l.expiry_date,
                        department: l.department,
                      });
                      setShowLicenseModal(true);
                    }}
                  >
                    Renew
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Certifications */}
      <h2 className="mt-10 font-display text-xl font-bold">
        Compliance Certifications
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        ISO audit standards and organizational credentials.
      </p>
      <div className="rounded-2xl border border-border bg-card overflow-hidden mb-10">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              {[
                "Name",
                "Category",
                "Issuer",
                "Expiry",
                "Version",
                "Status",
                "Actions",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processedCerts.map((c) => (
              <tr
                key={c.id}
                className="border-t border-border hover:bg-muted/30"
              >
                <td className="px-4 py-3 font-semibold text-xs">{c.name}</td>
                <td className="px-4 py-3 text-xs">{c.category}</td>
                <td className="px-4 py-3 text-xs">{c.issuer}</td>
                <td className="px-4 py-3 text-xs">{c.expiry_date}</td>
                <td className="px-4 py-3 text-xs font-mono">{c.version}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                      c.derivedStatus === "Expired"
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : c.derivedStatus === "Expiring Soon"
                          ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                          : "bg-emerald/10 text-emerald border-emerald/20"
                    }`}
                  >
                    {c.derivedStatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      setCertForm({
                        id: c.id,
                        name: c.name,
                        category: c.category,
                        issuer: c.issuer,
                        expiry_date: c.expiry_date,
                        version: c.version,
                      });
                      setShowCertModal(true);
                    }}
                  >
                    Update
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* POLICY MODAL */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePolicy}
            className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setShowPolicyModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold">
              {policyForm.id ? "Renew / Edit Policy" : "Add Insurance Policy"}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">
                  Machine Name
                </label>
                <input
                  required
                  placeholder="e.g. Centrifugal Pump 01"
                  value={policyForm.machine}
                  onChange={(e) =>
                    setPolicyForm({ ...policyForm, machine: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Asset Mapping (Optional)
                </label>
                <select
                  value={policyForm.asset_id}
                  onChange={(e) =>
                    setPolicyForm({ ...policyForm, asset_id: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                >
                  <option value="">No Mapping</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} — {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Insurance Provider
                </label>
                <input
                  required
                  placeholder="e.g. ICICI Lombard"
                  value={policyForm.provider}
                  onChange={(e) =>
                    setPolicyForm({ ...policyForm, provider: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Policy Number
                </label>
                <input
                  required
                  placeholder="e.g. IL-44518"
                  value={policyForm.policy_no}
                  onChange={(e) =>
                    setPolicyForm({ ...policyForm, policy_no: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-muted-foreground mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={policyForm.start_date}
                    onChange={(e) =>
                      setPolicyForm({
                        ...policyForm,
                        start_date: e.target.value,
                      })
                    }
                    className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={policyForm.expiry_date}
                    onChange={(e) =>
                      setPolicyForm({
                        ...policyForm,
                        expiry_date: e.target.value,
                      })
                    }
                    className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent text-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Coverage Amount
                </label>
                <input
                  required
                  placeholder="e.g. ₹65 L or ₹1.2 Cr"
                  value={policyForm.coverage}
                  onChange={(e) =>
                    setPolicyForm({ ...policyForm, coverage: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-8"
                onClick={() => setShowPolicyModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full text-xs h-8 btn-hero">
                Save Policy
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* LICENSE MODAL */}
      {showLicenseModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveLicense}
            className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setShowLicenseModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold">
              {licenseForm.id ? "Renew / Edit License" : "Add Machine License"}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">
                  License Kind
                </label>
                <select
                  value={licenseForm.kind}
                  onChange={(e) =>
                    setLicenseForm({ ...licenseForm, kind: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                >
                  <option value="Equipment License">Equipment License</option>
                  <option value="Operating Permit">Operating Permit</option>
                  <option value="Calibration Certificate">
                    Calibration Certificate
                  </option>
                  <option value="Installation Certificate">
                    Installation Certificate
                  </option>
                  <option value="Government Approval">
                    Government Approval
                  </option>
                  <option value="OEM Authorization">OEM Authorization</option>
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Certificate / License No
                </label>
                <input
                  required
                  placeholder="e.g. EQL-2025-0421"
                  value={licenseForm.cert_no}
                  onChange={(e) =>
                    setLicenseForm({ ...licenseForm, cert_no: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-muted-foreground mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    required
                    value={licenseForm.issue_date}
                    onChange={(e) =>
                      setLicenseForm({
                        ...licenseForm,
                        issue_date: e.target.value,
                      })
                    }
                    className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={licenseForm.expiry_date}
                    onChange={(e) =>
                      setLicenseForm({
                        ...licenseForm,
                        expiry_date: e.target.value,
                      })
                    }
                    className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent text-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Responsible Department
                </label>
                <input
                  required
                  placeholder="e.g. Maintenance, Safety, HSE"
                  value={licenseForm.department}
                  onChange={(e) =>
                    setLicenseForm({
                      ...licenseForm,
                      department: e.target.value,
                    })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-8"
                onClick={() => setShowLicenseModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full text-xs h-8 btn-hero">
                Save License
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* CERTIFICATION MODAL */}
      {showCertModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCert}
            className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setShowCertModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold">
              {certForm.id
                ? "Update Certification"
                : "Add Compliance Certification"}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">
                  Certification Name
                </label>
                <input
                  required
                  placeholder="e.g. ISO 9001:2015 — Quality Management"
                  value={certForm.name}
                  onChange={(e) =>
                    setCertForm({ ...certForm, name: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Category
                </label>
                <input
                  required
                  placeholder="e.g. ISO, Environmental, Safety"
                  value={certForm.category}
                  onChange={(e) =>
                    setCertForm({ ...certForm, category: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Issuer Agency
                </label>
                <input
                  required
                  placeholder="e.g. TÜV SÜD, BSI, DNV"
                  value={certForm.issuer}
                  onChange={(e) =>
                    setCertForm({ ...certForm, issuer: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-muted-foreground mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={certForm.expiry_date}
                    onChange={(e) =>
                      setCertForm({ ...certForm, expiry_date: e.target.value })
                    }
                    className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">
                    Document Version
                  </label>
                  <input
                    required
                    placeholder="e.g. v3.2"
                    value={certForm.version}
                    onChange={(e) =>
                      setCertForm({ ...certForm, version: e.target.value })
                    }
                    className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-8"
                onClick={() => setShowCertModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full text-xs h-8 btn-hero">
                Save Cert
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
        {label}
      </span>
      <div className="font-semibold text-foreground truncate">{value}</div>
    </div>
  );
}
