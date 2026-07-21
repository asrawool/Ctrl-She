import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  ShoppingBag,
  Plus,
  Check,
  X,
  AlertCircle,
  FileText,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/store/auth";
import { hasPermission } from "@/services/rbac";
import { PurchaseRequest, Asset } from "@/types/operational";

export const Route = createFileRoute("/app/procurement")({
  head: () => ({ meta: [{ title: "Procurement Workflow — SynapseAi" }] }),
  component: ProcurementPage,
});

function ProcurementPage() {
  const { role } = useAuth();
  const canCreate = hasPermission(role, "create:purchase_requests");
  const canApprove = hasPermission(role, "approve:purchase_requests");

  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showModifyRequestModal, setShowModifyRequestModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<PurchaseRequest | null>(null);

  // Form States
  const [createForm, setCreateForm] = useState({
    item_name: "",
    item_type: "asset" as "asset" | "spare_part",
    quantity: 1,
    priority: "Medium" as "Low" | "Medium" | "High" | "Critical",
    justification: "",
  });

  const [modificationNotes, setModificationNotes] = useState("");

  const [linkForm, setLinkForm] = useState({
    mode: "create" as "create" | "link",
    existing_asset_id: "",
    new_asset_code: "",
    new_asset_name: "",
    new_asset_category: "Pumps",
    new_asset_plant: "Plant Alpha",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: reqData }, { data: astData }] = await Promise.all([
        supabase
          .from("purchase_requests")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("assets")
          .select("*")
          .order("asset_code", { ascending: true }),
      ]);

      setRequests(reqData || []);
      setAssets(astData || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load procurement records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user session");

      const { error } = await supabase.from("purchase_requests").insert({
        item_name: createForm.item_name,
        item_type: createForm.item_type,
        quantity: createForm.quantity,
        priority: createForm.priority,
        justification: createForm.justification,
        status: "Pending",
        created_by: user.id,
      });

      if (error) throw error;
      toast.success("Purchase request created successfully");
      setShowCreateModal(false);
      setCreateForm({
        item_name: "",
        item_type: "asset",
        quantity: 1,
        priority: "Medium",
        justification: "",
      });
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to create request: " + (err as Error).message);
    }
  };

  const handleApprove = async (reqId: string) => {
    try {
      const { error } = await supabase
        .from("purchase_requests")
        .update({ status: "Approved" })
        .eq("id", reqId);

      if (error) throw error;
      toast.success("Request approved and forwarded for procurement");
      fetchData();
    } catch (err: unknown) {
      toast.error("Approval failed: " + (err as Error).message);
    }
  };

  const handleReject = async (reqId: string) => {
    try {
      const { error } = await supabase
        .from("purchase_requests")
        .update({ status: "Rejected" })
        .eq("id", reqId);

      if (error) throw error;
      toast.success("Request rejected");
      fetchData();
    } catch (err: unknown) {
      toast.error("Rejection failed: " + (err as Error).message);
    }
  };

  const handleRequestModification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      const { error } = await supabase
        .from("purchase_requests")
        .update({
          status: "Modification Requested",
          modification_notes: modificationNotes,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;
      toast.success("Modification requested and sent to engineering");
      setShowModifyRequestModal(false);
      setSelectedRequest(null);
      setModificationNotes("");
      fetchData();
    } catch (err: unknown) {
      toast.error(
        "Failed to submit modification request: " + (err as Error).message,
      );
    }
  };

  const handleMarkProcured = async (reqId: string) => {
    try {
      const { error } = await supabase
        .from("purchase_requests")
        .update({ status: "Procured" })
        .eq("id", reqId);

      if (error) throw error;
      toast.success("Request marked as Procured! Item ready for installation.");
      fetchData();
    } catch (err: unknown) {
      toast.error("Procurement update failed: " + (err as Error).message);
    }
  };

  const handleLinkInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      let targetAssetId = "";

      if (linkForm.mode === "create") {
        if (!linkForm.new_asset_code || !linkForm.new_asset_name) {
          toast.error("Asset code and name are required.");
          return;
        }

        const { data: newAsset, error: assetErr } = await supabase
          .from("assets")
          .insert({
            asset_code: linkForm.new_asset_code,
            name: linkForm.new_asset_name,
            category: linkForm.new_asset_category,
            plant: linkForm.new_asset_plant,
            health_percentage: 100,
            rul_days: 365,
            health_status: "healthy",
            status: "Operational",
          })
          .select()
          .single();

        if (assetErr) throw assetErr;
        targetAssetId = newAsset.id;
        toast.success(`Created new Asset: ${newAsset.asset_code}`);
      } else {
        if (!linkForm.existing_asset_id) {
          toast.error("Please select an existing asset.");
          return;
        }
        targetAssetId = linkForm.existing_asset_id;
      }

      // Update purchase request
      const { error: reqUpdateErr } = await supabase
        .from("purchase_requests")
        .update({ linked_asset_id: targetAssetId })
        .eq("id", selectedRequest.id);

      if (reqUpdateErr) throw reqUpdateErr;
      toast.success("Purchase request successfully linked to asset!");
      setShowLinkModal(false);
      setSelectedRequest(null);
      setLinkForm({
        mode: "create",
        existing_asset_id: "",
        new_asset_code: "",
        new_asset_name: "",
        new_asset_category: "Pumps",
        new_asset_plant: "Plant Alpha",
      });
      fetchData();
    } catch (err: unknown) {
      toast.error("Installation linking failed: " + (err as Error).message);
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "Pending").length;
    const modifications = requests.filter(
      (r) => r.status === "Modification Requested",
    ).length;
    const procured = requests.filter((r) => r.status === "Procured").length;
    return { total, pending, modifications, procured };
  }, [requests]);

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
        title="Procurement & Compliance"
        description="Verify compliance, submit new equipment purchase requests, track approvals and link procured hardware to active plant assets."
        actions={
          canCreate && (
            <Button
              size="sm"
              className="btn-hero"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Request
            </Button>
          )
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Requests",
            value: kpis.total,
            icon: ShoppingBag,
            tone: "cyan",
          },
          {
            label: "Pending Approvals",
            value: kpis.pending,
            icon: Clock,
            tone: "warning",
          },
          {
            label: "Modification Requests",
            value: kpis.modifications,
            icon: AlertTriangle,
            tone: "warning",
          },
          {
            label: "Procured / Delivered",
            value: kpis.procured,
            icon: CheckCircle2,
            tone: "emerald",
          },
        ].map((item) => {
          const I = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div
                className={`grid h-9 w-9 place-items-center rounded-lg ${
                  item.tone === "emerald"
                    ? "bg-emerald/10 text-emerald"
                    : item.tone === "warning"
                      ? "bg-orange-500/10 text-orange-500"
                      : "bg-accent/10 text-accent"
                }`}
              >
                <I className="h-4.5 w-4.5" />
              </div>
              <div className="mt-3 font-display text-2xl font-bold">
                {item.value}
              </div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
            </div>
          );
        })}
      </div>

      {/* Requests Table */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">
            Purchase Request Ledger
          </h3>
          <Button size="sm" variant="outline" onClick={fetchData}>
            <RefreshCw className="h-3 w-3 mr-1" /> Reload
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase font-bold text-[10px] tracking-wider">
                <th className="pb-3 pr-2">Item Detail</th>
                <th className="pb-3 px-2">Type</th>
                <th className="pb-3 px-2">Quantity</th>
                <th className="pb-3 px-2">Priority</th>
                <th className="pb-3 px-2">Status</th>
                <th className="pb-3 px-2">Linked Asset</th>
                <th className="pb-3 pl-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {requests.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground italic"
                  >
                    No purchase requests logged in ledger.
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const linkedAsset = assets.find(
                    (a) => a.id === req.linked_asset_id,
                  );
                  const statusColors = {
                    Pending:
                      "bg-orange-500/10 text-orange-500 border-orange-500/20",
                    Approved: "bg-cyan/10 text-cyan border-cyan/20",
                    Rejected:
                      "bg-destructive/10 text-destructive border-destructive/20",
                    "Modification Requested":
                      "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
                    Procured: "bg-emerald/10 text-emerald border-emerald/20",
                  }[req.status];

                  const priorityColors = {
                    Critical: "text-destructive font-bold",
                    High: "text-orange-500 font-semibold",
                    Medium: "text-accent",
                    Low: "text-muted-foreground",
                  }[req.priority];

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3.5 pr-2">
                        <div className="font-semibold text-sm">
                          {req.item_name}
                        </div>
                        <div
                          className="text-[10px] text-muted-foreground max-w-sm truncate mt-0.5"
                          title={req.justification}
                        >
                          Justification: {req.justification}
                        </div>
                        {req.modification_notes && (
                          <div className="text-[10px] text-yellow-600 italic bg-yellow-500/5 border border-yellow-500/10 rounded px-1.5 py-0.5 mt-1">
                            Modification required: {req.modification_notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-2 capitalize">
                        {req.item_type.replace("_", " ")}
                      </td>
                      <td className="py-3.5 px-2 font-mono font-bold text-sm">
                        {req.quantity}
                      </td>
                      <td className={`py-3.5 px-2 text-xs ${priorityColors}`}>
                        {req.priority}
                      </td>
                      <td className="py-3.5 px-2">
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold ${statusColors}`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-2">
                        {linkedAsset ? (
                          <div className="flex items-center gap-1.5 text-emerald font-semibold">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>{linkedAsset.asset_code}</span>
                            <Link
                              to="/app/insurance"
                              className="opacity-60 hover:opacity-100 transition"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        ) : req.status === "Procured" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] px-1.5 h-6 text-accent border-accent/20"
                            onClick={() => {
                              setSelectedRequest(req);
                              setShowLinkModal(true);
                            }}
                          >
                            Install / Link Asset
                          </Button>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">
                            Not installed
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pl-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Plant Manager Approval Flow */}
                          {canApprove && req.status === "Pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-1.5 text-emerald border-emerald/20 bg-emerald/5 hover:bg-emerald/10 text-[10px]"
                                onClick={() => handleApprove(req.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-1.5 text-destructive border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-[10px]"
                                onClick={() => handleReject(req.id)}
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-1.5 text-yellow-600 border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 text-[10px]"
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setShowModifyRequestModal(true);
                                }}
                              >
                                Modify
                              </Button>
                            </>
                          )}
                          {/* Plant Manager Procurement Flow */}
                          {canApprove && req.status === "Approved" && (
                            <Button
                              size="sm"
                              className="h-6 px-1.5 text-[10px] btn-hero"
                              onClick={() => handleMarkProcured(req.id)}
                            >
                              Procure
                            </Button>
                          )}
                          {req.status === "Rejected" && (
                            <span className="text-[10px] text-muted-foreground">
                              No actions
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE REQUEST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateRequest}
            className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold">
              New Purchase Request
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">
                  Item / Equipment Name
                </label>
                <input
                  required
                  placeholder="e.g. Centrifugal Water Pump, 12V Valve..."
                  value={createForm.item_name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, item_name: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-muted-foreground mb-1">
                    Item Type
                  </label>
                  <select
                    value={createForm.item_type}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        item_type: e.target.value as "asset" | "spare_part",
                      })
                    }
                    className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                  >
                    <option value="asset">Equipment (Asset)</option>
                    <option value="spare_part">Spare Part (Consumable)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={createForm.quantity}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        quantity: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent text-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Request Priority
                </label>
                <select
                  value={createForm.priority}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      priority: e.target.value as
                        "Low" | "Medium" | "High" | "Critical",
                    })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Technical Justification
                </label>
                <textarea
                  required
                  placeholder="Justification, project code, or safety concern details..."
                  value={createForm.justification}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      justification: e.target.value,
                    })
                  }
                  className="w-full h-16 rounded-lg bg-background border border-border p-2 outline-none focus:border-accent text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-8"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full text-xs h-8 btn-hero">
                Submit Request
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* REQUEST MODIFICATION MODAL */}
      {showModifyRequestModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleRequestModification}
            className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => {
                setShowModifyRequestModal(false);
                setSelectedRequest(null);
                setModificationNotes("");
              }}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold">
              Request Modification
            </h3>
            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground text-[11px]">
                Please list changes, additional specs, or documentation required
                by the engineering team before approval.
              </p>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Modification Details
                </label>
                <textarea
                  required
                  placeholder="Add specs, budget limitations, alternative suppliers..."
                  value={modificationNotes}
                  onChange={(e) => setModificationNotes(e.target.value)}
                  className="w-full h-24 rounded-lg bg-background border border-border p-2 outline-none focus:border-accent text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-8"
                onClick={() => {
                  setShowModifyRequestModal(false);
                  setSelectedRequest(null);
                  setModificationNotes("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full text-xs h-8 btn-hero bg-yellow-600 text-white"
              >
                Request Edits
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* INSTALL / LINK ASSET MODAL */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleLinkInstall}
            className="bg-card border border-border w-full max-w-md rounded-3xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => {
                setShowLinkModal(false);
                setSelectedRequest(null);
              }}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold">
              Install & Link Procured Hardware
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex border border-border rounded-lg overflow-hidden bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => setLinkForm({ ...linkForm, mode: "create" })}
                  className={`flex-1 py-1 text-center font-medium rounded ${
                    linkForm.mode === "create"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  Create New Asset
                </button>
                <button
                  type="button"
                  onClick={() => setLinkForm({ ...linkForm, mode: "link" })}
                  className={`flex-1 py-1 text-center font-medium rounded ${
                    linkForm.mode === "link"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  Link Existing Asset
                </button>
              </div>

              {linkForm.mode === "create" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-muted-foreground mb-1">
                      Asset Code
                    </label>
                    <input
                      required
                      placeholder="e.g. P-402, HX-12"
                      value={linkForm.new_asset_code}
                      onChange={(e) =>
                        setLinkForm({
                          ...linkForm,
                          new_asset_code: e.target.value,
                        })
                      }
                      className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1">
                      Asset Name
                    </label>
                    <input
                      required
                      placeholder="e.g. Centrifugal Pump 02"
                      value={linkForm.new_asset_name}
                      onChange={(e) =>
                        setLinkForm({
                          ...linkForm,
                          new_asset_name: e.target.value,
                        })
                      }
                      className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-muted-foreground mb-1">
                        Category
                      </label>
                      <select
                        value={linkForm.new_asset_category}
                        onChange={(e) =>
                          setLinkForm({
                            ...linkForm,
                            new_asset_category: e.target.value,
                          })
                        }
                        className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                      >
                        <option value="Pumps">Pumps</option>
                        <option value="Reactors">Reactors</option>
                        <option value="Compressors">Compressors</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Boilers">Boilers</option>
                        <option value="Turbines">Turbines</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-muted-foreground mb-1">
                        Plant Location
                      </label>
                      <input
                        required
                        value={linkForm.new_asset_plant}
                        onChange={(e) =>
                          setLinkForm({
                            ...linkForm,
                            new_asset_plant: e.target.value,
                          })
                        }
                        className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-muted-foreground mb-1">
                    Select Existing Asset
                  </label>
                  <select
                    value={linkForm.existing_asset_id}
                    onChange={(e) =>
                      setLinkForm({
                        ...linkForm,
                        existing_asset_id: e.target.value,
                      })
                    }
                    className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                  >
                    <option value="">-- Choose Asset --</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.asset_code} — {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-8"
                onClick={() => {
                  setShowLinkModal(false);
                  setSelectedRequest(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full text-xs h-8 btn-hero">
                Complete Installation
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
