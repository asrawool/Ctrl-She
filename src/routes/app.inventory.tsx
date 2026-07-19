import { useMemo, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Boxes,
  PackageCheck,
  Wrench,
  ShoppingCart,
  AlertTriangle,
  TrendingDown,
  Search,
  Download,
  Plus,
  X,
  RefreshCw,
  Activity,
  Heart,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { exportCsv, exportPdfReport } from "@/services/export";
import { useAuth } from "@/store/auth";
import { hasPermission } from "@/services/rbac";

export const Route = createFileRoute("/app/inventory")({
  head: () => ({ meta: [{ title: "Asset Inventory — IntelliPlant AI" }] }),
  component: Page,
});

type StockStatus = "In Stock" | "Low Stock" | "Out of Stock" | "Reserved";

const stockColor: Record<StockStatus, string> = {
  "In Stock": "bg-emerald/10 text-emerald border-emerald/30",
  "Low Stock": "bg-orange-500/10 text-orange-500 border-orange-500/30",
  "Out of Stock": "bg-destructive/10 text-destructive border-destructive/30",
  Reserved: "bg-accent/10 text-accent border-accent/30",
};

interface DbAsset {
  id: string;
  name: string;
  asset_code: string;
  category: string;
  manufacturer: string;
  model?: string;
  location: string;
  health_percentage: number;
  rul_days: number;
  health_status: "healthy" | "warning" | "critical";
  status: "Operational" | "Maintenance" | "Reserved";
  updated_at?: string;
}

interface DbSparePart {
  id: string;
  name: string;
  part_code: string;
  category: string;
  manufacturer: string;
  model?: string;
  location: string;
  current_qty: number;
  min_qty: number;
  max_qty: number;
  reorder_point: number;
  unit_cost: number;
  supplier: string;
  status: "Operational" | "Maintenance" | "Reserved";
  updated_at?: string;
  stock?: StockStatus;
}

const trend = [
  { m: "Jan", inb: 320, out: 220 },
  { m: "Feb", inb: 280, out: 245 },
  { m: "Mar", inb: 260, out: 290 },
  { m: "Apr", inb: 300, out: 260 },
  { m: "May", inb: 340, out: 310 },
  { m: "Jun", inb: 355, out: 340 },
];

function Page() {
  const { role } = useAuth();
  const canAddAsset = hasPermission(role, "create:inventory_items");
  const canAdjustStock = hasPermission(role, "create:inventory_movements");

  const [activeTab, setActiveTab] = useState<"assets" | "spares">("assets");
  const [assets, setAssets] = useState<DbAsset[]>([]);
  const [parts, setParts] = useState<DbSparePart[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  // Forms
  const [selectedCategory, setSelectedCategory] = useState("Bearings");
  const [customCategory, setCustomCategory] = useState("");

  const [itemForm, setItemForm] = useState({
    name: "",
    item_code: "",
    category: "Bearings",
    manufacturer: "",
    model: "",
    location: "Plant A",
    current_qty: 10,
    min_qty: 5,
    max_qty: 50,
    reorder_point: 8,
    unit_cost: 1000,
    supplier: "",
    status: "Operational" as "Operational" | "Maintenance" | "Reserved",
  });

  const [adjustmentForm, setAdjustmentForm] = useState({
    item_id: "",
    direction: "inbound" as "inbound" | "outbound",
    quantity: 1,
    reason: "",
  });

  const fetchData = async () => {
    try {
      const [assetsRes, partsRes] = await Promise.all([
        supabase.from("assets").select("*").order("name", { ascending: true }),
        supabase.from("spare_parts").select("*").order("name", { ascending: true }),
      ]);

      if (assetsRes.error) throw assetsRes.error;
      if (partsRes.error) throw partsRes.error;

      setAssets(assetsRes.data || []);
      setParts(partsRes.data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load inventory records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const categoryToSave =
        selectedCategory === "Other" ? customCategory.trim() : selectedCategory;
      if (!categoryToSave) {
        toast.error("Please enter a custom category name.");
        return;
      }

      if (activeTab === "assets") {
        const { error } = await supabase.from("assets").insert({
          name: itemForm.name,
          asset_code: itemForm.item_code,
          category: categoryToSave,
          manufacturer: itemForm.manufacturer,
          model: itemForm.model || null,
          location: itemForm.location,
          health_percentage: 100,
          rul_days: 365,
          health_status: "healthy",
          status: itemForm.status,
        });
        if (error) throw error;
        toast.success("Equipment Asset added successfully");
      } else {
        const { data, error } = await supabase
          .from("spare_parts")
          .insert({
            name: itemForm.name,
            part_code: itemForm.item_code,
            category: categoryToSave,
            manufacturer: itemForm.manufacturer,
            model: itemForm.model || null,
            location: itemForm.location,
            current_qty: Number(itemForm.current_qty),
            min_qty: Number(itemForm.min_qty),
            max_qty: Number(itemForm.max_qty),
            reorder_point: Number(itemForm.reorder_point),
            unit_cost: Number(itemForm.unit_cost),
            supplier: itemForm.supplier,
            status: itemForm.status,
          })
          .select()
          .single();

        if (error) throw error;

        // Log movement for initial setup stock
        if (Number(itemForm.current_qty) > 0 && data) {
          const { error: mvtError } = await supabase
            .from("inventory_movements")
            .insert({
              item_id: data.id,
              direction: "inbound",
              quantity: Number(itemForm.current_qty),
              reason: "Initial stock registration",
            });
          if (mvtError) throw mvtError;
        }
        toast.success("Spare part added successfully");
      }

      setShowItemModal(false);
      setSelectedCategory("Bearings");
      setCustomCategory("");
      setItemForm({
        name: "",
        item_code: "",
        category: "Bearings",
        manufacturer: "",
        model: "",
        location: "Plant A",
        current_qty: 10,
        min_qty: 5,
        max_qty: 50,
        reorder_point: 8,
        unit_cost: 1000,
        supplier: "",
        status: "Operational",
      });
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to add item: " + (err as Error).message);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedPart = parts.find((it) => it.id === adjustmentForm.item_id);
      if (!selectedPart) {
        toast.error("No spare part selected");
        return;
      }

      // Check current quantity against outbound adjustment
      if (
        adjustmentForm.direction === "outbound" &&
        selectedPart.current_qty < adjustmentForm.quantity
      ) {
        toast.error(
          `Insufficient stock! Only ${selectedPart.current_qty} units available.`,
        );
        return;
      }

      // 1. Insert into inventory_movements
      const { error: mvtError } = await supabase
        .from("inventory_movements")
        .insert({
          item_id: adjustmentForm.item_id,
          direction: adjustmentForm.direction,
          quantity: Number(adjustmentForm.quantity),
          reason: adjustmentForm.reason || "Manual adjustment",
        });

      if (mvtError) throw mvtError;

      // 2. Compute and Update the spare_parts current_qty
      const change =
        adjustmentForm.direction === "inbound"
          ? adjustmentForm.quantity
          : -adjustmentForm.quantity;
      const newQty = selectedPart.current_qty + change;

      const { error: updateError } = await supabase
        .from("spare_parts")
        .update({
          current_qty: newQty,
          updated_at: new Date().toISOString(),
        })
        .eq("id", adjustmentForm.item_id);

      if (updateError) throw updateError;

      toast.success(`Stock adjusted successfully. New stock: ${newQty}`);
      setShowAdjustmentModal(false);
      setAdjustmentForm({
        item_id: "",
        direction: "inbound",
        quantity: 1,
        reason: "",
      });
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to adjust stock: " + (err as Error).message);
    }
  };

  // Derive dynamic stock status for parts
  const derivePartStockStatus = (p: DbSparePart): StockStatus => {
    if (p.current_qty === 0) return "Out of Stock";
    if (p.status === "Reserved") return "Reserved";
    if (p.current_qty <= p.reorder_point) return "Low Stock";
    return "In Stock";
  };

  const sparesWithStatus = useMemo(() => {
    return parts.map((p) => ({
      ...p,
      stock: derivePartStockStatus(p),
    }));
  }, [parts]);

  // Compute Categories dynamically based on Active Tab
  const categories = useMemo(() => {
    const activeList = activeTab === "assets" ? assets : parts;
    return ["All", ...Array.from(new Set(activeList.map((a) => a.category)))];
  }, [activeTab, assets, parts]);

  // Computed / Filtered Lists
  const filteredAssets = useMemo(() => {
    return assets.filter(
      (a) =>
        (filterStatus === "All" || a.status === filterStatus) &&
        (filterCategory === "All" || a.category === filterCategory) &&
        (q === "" ||
          [a.name, a.asset_code, a.manufacturer, a.model].some(
            (f) => f && f.toLowerCase().includes(q.toLowerCase()),
          )),
    );
  }, [assets, q, filterStatus, filterCategory]);

  const filteredSpares = useMemo(() => {
    return sparesWithStatus.filter(
      (p) =>
        (filterStatus === "All" || p.stock === filterStatus) &&
        (filterCategory === "All" || p.category === filterCategory) &&
        (q === "" ||
          [p.name, p.part_code, p.manufacturer, p.model, p.supplier].some(
            (f) => f && f.toLowerCase().includes(q.toLowerCase()),
          )),
    );
  }, [sparesWithStatus, q, filterStatus, filterCategory]);

  // KPI Calculations
  const assetKpis = useMemo(() => {
    const total = assets.length;
    const operational = assets.filter((a) => a.status === "Operational").length;
    const maintenance = assets.filter((a) => a.status === "Maintenance").length;
    const reserved = assets.filter((a) => a.status === "Reserved").length;
    const criticalHealth = assets.filter((a) => a.health_status === "critical").length;

    return [
      { i: Boxes, l: "Total Equipment", v: total, tone: "cyan" },
      { i: PackageCheck, l: "Operational", v: operational, tone: "emerald" },
      { i: Wrench, l: "Under Maintenance", v: maintenance, tone: "warning" },
      { i: ShoppingCart, l: "Reserved", v: reserved, tone: "cyan" },
      { i: AlertTriangle, l: "Critical Health", v: criticalHealth, tone: "destructive" },
    ];
  }, [assets]);

  const sparesKpis = useMemo(() => {
    const total = parts.length;
    const inStock = sparesWithStatus.filter((p) => p.stock === "In Stock").length;
    const lowStock = sparesWithStatus.filter((p) => p.stock === "Low Stock").length;
    const outOfStock = sparesWithStatus.filter((p) => p.stock === "Out of Stock").length;
    const reserved = sparesWithStatus.filter((p) => p.stock === "Reserved").length;

    return [
      { i: Boxes, l: "Total Part Types", v: total, tone: "cyan" },
      { i: PackageCheck, l: "In Stock", v: inStock, tone: "emerald" },
      { i: TrendingDown, l: "Low Stock", v: lowStock, tone: "warning" },
      { i: AlertTriangle, l: "Out of Stock", v: outOfStock, tone: "destructive" },
      { i: ShoppingCart, l: "Reserved Stock", v: reserved, tone: "cyan" },
    ];
  }, [parts, sparesWithStatus]);

  // AI-Assisted Reorder Recommendations for Spares
  const recommendations = useMemo(() => {
    return sparesWithStatus
      .filter((p) => p.current_qty <= p.reorder_point)
      .map((p) => {
        const recommendQty = Math.max(p.max_qty - p.current_qty, p.min_qty * 2);
        return {
          ...p,
          recommend: recommendQty,
          estCost: recommendQty * p.unit_cost,
          priority:
            p.current_qty === 0
              ? "Critical"
              : p.current_qty < p.min_qty
                ? "High"
                : "Medium",
        };
      });
  }, [sparesWithStatus]);

  const handleExportCsv = () => {
    if (activeTab === "assets") {
      const cols = [
        "Asset Name",
        "Asset Code",
        "System ID",
        "Category",
        "Manufacturer",
        "Model",
        "Location",
        "Health %",
        "RUL (Days)",
        "Health Status",
        "Operational State",
      ];
      exportCsv(
        "Equipment_Assets",
        cols,
        filteredAssets.map((a) => [
          a.name,
          a.asset_code,
          a.id,
          a.category,
          a.manufacturer,
          a.model || "",
          a.location,
          a.health_percentage,
          a.rul_days,
          a.health_status,
          a.status,
        ]),
      );
    } else {
      const cols = [
        "Part Name",
        "Part Code",
        "System ID",
        "Category",
        "Manufacturer",
        "Model",
        "Location",
        "Current Qty",
        "Min Qty",
        "Max Qty",
        "Reorder Point",
        "Unit Cost (₹)",
        "Supplier",
        "Stock Status",
      ];
      exportCsv(
        "Spare_Parts_Inventory",
        cols,
        filteredSpares.map((p) => [
          p.name,
          p.part_code,
          p.id,
          p.category,
          p.manufacturer,
          p.model || "",
          p.location,
          p.current_qty,
          p.min_qty,
          p.max_qty,
          p.reorder_point,
          p.unit_cost,
          p.supplier,
          p.stock,
        ]),
      );
    }
  };

  const handleExportPdf = () => {
    const kpisList = activeTab === "assets" ? assetKpis : sparesKpis;
    exportPdfReport({
      title: activeTab === "assets" ? "Equipment Assets Report" : "Spare Parts Stock Report",
      subtitle:
        activeTab === "assets"
          ? "Critical health metrics, remaining useful life and operational states"
          : "Stock levels, reorder alerts and consumption metrics",
      kpis: kpisList.map((k) => ({ label: k.l, value: String(k.v) })),
      sections: [
        {
          heading: activeTab === "assets" ? "Equipment Snapshot" : "Parts Snapshot",
          columns:
            activeTab === "assets"
              ? ["Asset", "Code", "Category", "Location", "Health %", "Status"]
              : ["Part Name", "Code", "Location", "Qty", "Reorder Pt", "Status"],
          rows:
            activeTab === "assets"
              ? filteredAssets.map((a) => [
                  a.name,
                  a.asset_code,
                  a.category,
                  a.location,
                  `${a.health_percentage}%`,
                  a.status,
                ])
              : filteredSpares.map((p) => [
                  p.name,
                  p.part_code,
                  p.location,
                  String(p.current_qty),
                  String(p.reorder_point),
                  p.stock || "",
                ]),
        },
      ],
      filename: activeTab === "assets" ? "assets_report" : "spare_parts_report",
    });
  };

  const activeKpis = activeTab === "assets" ? assetKpis : sparesKpis;

  return (
    <>
      <PageHeader
        title="Asset Inventory"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="h-9"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-9 text-xs"
            >
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              className="h-9 text-xs"
            >
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
            {canAdjustStock && activeTab === "spares" && (
              <Button
                size="sm"
                onClick={() => setShowAdjustmentModal(true)}
                className="h-9 text-xs btn-hero"
              >
                <Plus className="mr-2 h-4 w-4" /> Adjust Spares
              </Button>
            )}
            {canAddAsset && (
              <Button
                size="sm"
                onClick={() => {
                  setItemForm((f) => ({
                    ...f,
                    category: activeTab === "assets" ? "Motors" : "Bearings",
                  }));
                  setSelectedCategory(activeTab === "assets" ? "Motors" : "Bearings");
                  setShowItemModal(true);
                }}
                className="h-9 text-xs btn-hero"
              >
                <Plus className="mr-2 h-4 w-4" /> Add{" "}
                {activeTab === "assets" ? "Equipment" : "Spare"}
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="mt-4 flex border-b border-border">
        <button
          onClick={() => {
            setActiveTab("assets");
            setFilterStatus("All");
            setFilterCategory("All");
          }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
            activeTab === "assets"
              ? "border-accent text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Equipment Assets
        </button>
        <button
          onClick={() => {
            setActiveTab("spares");
            setFilterStatus("All");
            setFilterCategory("All");
          }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
            activeTab === "spares"
              ? "border-accent text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Spare Parts Stock
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {activeKpis.map(({ i: I, l, v, tone }) => (
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
            placeholder={
              activeTab === "assets"
                ? "Search asset, category, manufacturer..."
                : "Search spare part, manufacturer, supplier..."
            }
            className="h-10 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-sm outline-none focus:border-accent focus:bg-background transition"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
        >
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
        >
          <option value="All">All Statuses</option>
          {activeTab === "assets" ? (
            <>
              <option value="Operational">Operational</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Reserved">Reserved</option>
            </>
          ) : (
            <>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
              <option value="Reserved">Reserved</option>
            </>
          )}
        </select>
      </div>

      {/* Dynamic Tables Grid */}
      <div className="mt-4 rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center items-center">
            <Activity className="animate-spin text-muted-foreground h-6 w-6" />
          </div>
        ) : activeTab === "assets" ? (
          filteredAssets.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No assets yet"
              description="Add your first piece of stationary equipment to get started."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {[
                      "Asset Name",
                      "Asset Code",
                      "System ID",
                      "Category",
                      "Manufacturer",
                      "Location",
                      "Health %",
                      "RUL (Days)",
                      "Health Status",
                      "State",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((a) => (
                    <tr
                      key={a.id}
                      className="border-t border-border hover:bg-muted/20"
                    >
                      <td className="px-4 py-3 font-medium">{a.name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">
                        {a.asset_code}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono max-w-[100px] truncate" title={a.id}>
                        {a.id}
                      </td>
                      <td className="px-4 py-3">{a.category}</td>
                      <td className="px-4 py-3">{a.manufacturer}</td>
                      <td className="px-4 py-3">{a.location}</td>
                      <td className="px-4 py-3 font-semibold">{a.health_percentage}%</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.rul_days} d</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            a.health_status === "critical"
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : a.health_status === "warning"
                                ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                                : "bg-emerald/10 text-emerald border-emerald/20"
                          }`}
                        >
                          {a.health_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            a.status === "Operational"
                              ? "bg-emerald/10 text-emerald border-emerald/20"
                              : a.status === "Maintenance"
                                ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                                : "bg-accent/10 text-accent border-accent/20"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredSpares.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No spare parts stock match"
            description="Adjust your filters or search to see consumable stock."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {[
                    "Part Name",
                    "Part Code",
                    "System ID",
                    "Category",
                    "Manufacturer",
                    "Location",
                    "Current qty",
                    "Min qty",
                    "Max qty",
                    "Reorder point",
                    "Unit Cost",
                    "Supplier",
                    "Stock Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSpares.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-border hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono">
                      {p.part_code}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono max-w-[100px] truncate" title={p.id}>
                      {p.id}
                    </td>
                    <td className="px-4 py-3">{p.category}</td>
                    <td className="px-4 py-3">{p.manufacturer}</td>
                    <td className="px-4 py-3">{p.location}</td>
                    <td className="px-4 py-3 font-semibold">{p.current_qty}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.min_qty}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.max_qty}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.reorder_point}</td>
                    <td className="px-4 py-3">₹{p.unit_cost.toLocaleString()}</td>
                    <td className="px-4 py-3">{p.supplier}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          stockColor[p.stock as StockStatus]
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeTab === "spares" && (
        <div className="mt-6 grid gap-4 lg:grid-cols-3 animate-fadeIn">
          {/* Recommended Purchase Orders */}
          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
            <h3 className="font-display font-semibold mb-4">
              Recommended Purchase Orders (AI)
            </h3>
            {recommendations.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                All stock levels are currently optimal.
              </p>
            ) : (
              <div className="space-y-3">
                {recommendations.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between border border-border rounded-xl p-3 hover:border-accent transition"
                  >
                    <div>
                      <div className="font-semibold text-sm">{r.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Current Stock: <b>{r.current_qty}</b> · Reorder Target:{" "}
                        <b>{r.reorder_point}</b>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider mb-1 ${
                          r.priority === "Critical"
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : r.priority === "High"
                              ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                              : "bg-emerald/10 text-emerald border-emerald/20"
                        }`}
                      >
                        {r.priority} Priority
                      </span>
                      <div className="text-xs font-semibold">
                        Order Qty: {r.recommend}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Est: ₹{r.estCost.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stock Movement Trends */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold mb-4">Stock movements</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="m" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="inb"
                  name="Inbound"
                  stroke="#18C37E"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="out"
                  name="Outbound"
                  stroke="#F31260"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateItem}
            className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => {
                setShowItemModal(false);
                setSelectedCategory(activeTab === "assets" ? "Motors" : "Bearings");
                setCustomCategory("");
              }}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold">
              Add {activeTab === "assets" ? "Equipment Asset" : "Spare Part"}
            </h3>
            <div className="space-y-3 text-xs max-h-[350px] overflow-y-auto pr-1">
              <div>
                <label className="block text-muted-foreground mb-1">
                  Name
                </label>
                <input
                  required
                  placeholder={
                    activeTab === "assets"
                      ? "e.g. Centrifugal Pump P-401"
                      : "e.g. Mechanical Seal MS-201"
                  }
                  value={itemForm.name}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, name: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Code / ID
                </label>
                <input
                  required
                  placeholder={activeTab === "assets" ? "e.g. P-401" : "e.g. SP-001"}
                  value={itemForm.item_code}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, item_code: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                >
                  {activeTab === "assets" ? (
                    <>
                      <option value="Pumps">Pumps</option>
                      <option value="Reactors">Reactors</option>
                      <option value="Heat Exchangers">Heat Exchangers</option>
                      <option value="Compressors">Compressors</option>
                      <option value="Boilers">Boilers</option>
                      <option value="Other">Other</option>
                    </>
                  ) : (
                    <>
                      <option value="Bearings">Bearings</option>
                      <option value="Belts">Belts</option>
                      <option value="Lubricants">Lubricants</option>
                      <option value="Instrumentation">Instrumentation</option>
                      <option value="Motors">Motors</option>
                      <option value="Seals">Seals</option>
                      <option value="Valves">Valves</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Other">Other</option>
                    </>
                  )}
                </select>
              </div>
              {selectedCategory === "Other" && (
                <div>
                  <label className="block text-muted-foreground mb-1">
                    Custom Category Name
                  </label>
                  <input
                    required
                    placeholder="e.g. Couplings"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-muted-foreground mb-1">
                    Manufacturer
                  </label>
                  <input
                    required
                    placeholder="e.g. SKF"
                    value={itemForm.manufacturer}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, manufacturer: e.target.value })
                    }
                    className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">
                    Model / Reference
                  </label>
                  <input
                    placeholder="e.g. 6205-2RS"
                    value={itemForm.model}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, model: e.target.value })
                    }
                    className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Storage / Plant Location
                </label>
                <input
                  required
                  placeholder="e.g. Plant A, Bay 4"
                  value={itemForm.location}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, location: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>

              {activeTab === "spares" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-muted-foreground mb-1">
                        Current Qty
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={itemForm.current_qty}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            current_qty: Number(e.target.value),
                          })
                        }
                        className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-muted-foreground mb-1">
                        Min Alert Qty
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={itemForm.min_qty}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            min_qty: Number(e.target.value),
                          })
                        }
                        className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-muted-foreground mb-1">
                        Max Capacity Qty
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={itemForm.max_qty}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            max_qty: Number(e.target.value),
                          })
                        }
                        className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-muted-foreground mb-1">
                        Reorder Level Qty
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={itemForm.reorder_point}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            reorder_point: Number(e.target.value),
                          })
                        }
                        className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1">
                      Unit Cost (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={itemForm.unit_cost}
                      onChange={(e) =>
                        setItemForm({
                          ...itemForm,
                          unit_cost: Number(e.target.value),
                        })
                      }
                      className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1">
                      Supplier
                    </label>
                    <input
                      required
                      placeholder="e.g. Festo India"
                      value={itemForm.supplier}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, supplier: e.target.value })
                      }
                      className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-muted-foreground mb-1">
                  Operational State
                </label>
                <select
                  value={itemForm.status}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      status: e.target.value as "Operational" | "Maintenance" | "Reserved",
                    })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                >
                  <option value="Operational">Operational</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Reserved">Reserved</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-8"
                onClick={() => {
                  setShowItemModal(false);
                  setSelectedCategory(activeTab === "assets" ? "Motors" : "Bearings");
                  setCustomCategory("");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full text-xs h-8 btn-hero">
                Save {activeTab === "assets" ? "Asset" : "Part"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAdjustStock}
            className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setShowAdjustmentModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold">
              Adjust Spares Stock
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">
                  Select Spare Part
                </label>
                <select
                  value={adjustmentForm.item_id}
                  onChange={(e) =>
                    setAdjustmentForm({
                      ...adjustmentForm,
                      item_id: e.target.value,
                    })
                  }
                  required
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                >
                  <option value="">-- Choose Spare Part --</option>
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.part_code}) — Current: {p.current_qty}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Movement Direction
                </label>
                <select
                  value={adjustmentForm.direction}
                  onChange={(e) =>
                    setAdjustmentForm({
                      ...adjustmentForm,
                      direction: e.target.value as "inbound" | "outbound",
                    })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                >
                  <option value="inbound">Inbound (Stock Added)</option>
                  <option value="outbound">Outbound (Stock Dispatched)</option>
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustmentForm.quantity}
                  onChange={(e) =>
                    setAdjustmentForm({
                      ...adjustmentForm,
                      quantity: Number(e.target.value),
                    })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Reason / Purpose
                </label>
                <input
                  placeholder="e.g. Pump coupling replacement, Stock replenishment"
                  value={adjustmentForm.reason}
                  onChange={(e) =>
                    setAdjustmentForm({
                      ...adjustmentForm,
                      reason: e.target.value,
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
                onClick={() => setShowAdjustmentModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full text-xs h-8 btn-hero">
                Log Adjustment
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
