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
import { InventoryItem } from "@/types/operational";

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

const consumption = [
  { m: "Jan", v: 220 },
  { m: "Feb", v: 245 },
  { m: "Mar", v: 290 },
  { m: "Apr", v: 260 },
  { m: "May", v: 310 },
  { m: "Jun", v: 340 },
];

const trend = [
  { m: "Jan", inb: 320, out: 220 },
  { m: "Feb", inb: 280, out: 245 },
  { m: "Mar", inb: 260, out: 290 },
  { m: "Apr", inb: 300, out: 260 },
  { m: "May", inb: 340, out: 310 },
  { m: "Jun", inb: 355, out: 340 },
];

function Page() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | StockStatus>("All");
  const [filterCategory, setFilterCategory] = useState("All");

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  // Forms
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
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setItems(data || []);
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
      const { data, error } = await supabase
        .from("inventory_items")
        .insert({
          name: itemForm.name,
          item_code: itemForm.item_code,
          category: itemForm.category,
          manufacturer: itemForm.manufacturer,
          model: itemForm.model,
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
        await supabase.from("inventory_movements").insert({
          item_id: data.id,
          direction: "inbound",
          quantity: Number(itemForm.current_qty),
          reason: "Initial stock registration",
        });
      }

      toast.success("Inventory item added successfully");
      setShowItemModal(false);
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
      const selectedItem = items.find((it) => it.id === adjustmentForm.item_id);
      if (!selectedItem) {
        toast.error("No item selected");
        return;
      }

      // Check current quantity against outbound adjustment
      if (
        adjustmentForm.direction === "outbound" &&
        selectedItem.current_qty < adjustmentForm.quantity
      ) {
        toast.error(
          `Insufficient stock! Only ${selectedItem.current_qty} units available.`,
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

      // 2. Compute and Update the inventory_items current_qty
      const change =
        adjustmentForm.direction === "inbound"
          ? adjustmentForm.quantity
          : -adjustmentForm.quantity;
      const newQty = selectedItem.current_qty + change;

      const { error: updateError } = await supabase
        .from("inventory_items")
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

  // Derive dynamic stock status
  const stockStatus = (a: InventoryItem): StockStatus => {
    if (a.current_qty === 0) return "Out of Stock";
    if (a.status === "Reserved") return "Reserved";
    if (a.current_qty <= a.reorder_point) return "Low Stock";
    return "In Stock";
  };

  const withStatus = useMemo(() => {
    return items.map((a) => ({
      ...a,
      stock: stockStatus(a),
    }));
  }, [items]);

  const filtered = useMemo(() => {
    return withStatus.filter(
      (a) =>
        (filterStatus === "All" || a.stock === filterStatus) &&
        (filterCategory === "All" || a.category === filterCategory) &&
        (q === "" ||
          [a.name, a.item_code, a.manufacturer, a.model, a.supplier].some((f) =>
            f && f.toLowerCase().includes(q.toLowerCase()),
          )),
    );
  }, [withStatus, q, filterStatus, filterCategory]);

  const categories = [
    "All",
    ...Array.from(new Set(items.map((a) => a.category))),
  ];

  // Dynamic KPIs
  const totalAssetsCount = items.length;
  const inStockCount = withStatus.filter((a) => a.stock === "In Stock").length;
  const lowStockCount = withStatus.filter(
    (a) => a.stock === "Low Stock",
  ).length;
  const outOfStockCount = withStatus.filter(
    (a) => a.stock === "Out of Stock",
  ).length;
  const reservedCount = withStatus.filter(
    (a) => a.status === "Reserved",
  ).length;
  const maintenanceCount = withStatus.filter(
    (a) => a.status === "Maintenance",
  ).length;

  const kpis = [
    { i: Boxes, l: "Total Assets", v: totalAssetsCount, tone: "cyan" },
    { i: PackageCheck, l: "Assets in Stock", v: inStockCount, tone: "emerald" },
    { i: Wrench, l: "Under Maintenance", v: maintenanceCount, tone: "warning" },
    { i: ShoppingCart, l: "Assets Reserved", v: reservedCount, tone: "cyan" },
    {
      i: TrendingDown,
      l: "Low Stock Items",
      v: lowStockCount,
      tone: "warning",
    },
    {
      i: AlertTriangle,
      l: "Critical Stock",
      v: outOfStockCount,
      tone: "destructive",
    },
  ];

  // AI-Assisted Reorder Recommendations
  const recommendations = useMemo(() => {
    return withStatus
      .filter((a) => a.current_qty <= a.reorder_point)
      .map((a) => {
        const recommendQty = Math.max(a.max_qty - a.current_qty, a.min_qty * 2);
        return {
          ...a,
          recommend: recommendQty,
          estCost: recommendQty * a.unit_cost,
          priority:
            a.current_qty === 0
              ? "Critical"
              : a.current_qty < a.min_qty
                ? "High"
                : "Medium",
        };
      });
  }, [withStatus]);

  const handleCsv = () => {
    const cols = [
      "Asset Name",
      "Asset ID",
      "Category",
      "Manufacturer",
      "Model",
      "Plant Location",
      "Current Stock",
      "Minimum Stock",
      "Maximum Stock",
      "Reorder Level",
      "Unit Cost (₹)",
      "Supplier",
      "Status",
      "Stock Status",
    ];
    exportCsv(
      "Asset_Inventory",
      cols,
      filtered.map((a) => [
        a.name,
        a.item_code,
        a.category,
        a.manufacturer,
        a.model,
        a.location,
        a.current_qty,
        a.min_qty,
        a.max_qty,
        a.reorder_point,
        a.unit_cost,
        a.supplier,
        a.status,
        a.stock,
      ]),
    );
  };

  const handlePdf = () => {
    exportPdfReport({
      title: "Asset Inventory Report",
      subtitle:
        "Stock levels, reorder recommendations and consumption analytics",
      kpis: kpis.map((k) => ({ label: k.l, value: String(k.v) })),
      sections: [
        {
          heading: "Inventory Snapshot",
          columns: [
            "Asset",
            "ID",
            "Category",
            "Location",
            "Current",
            "Reorder",
            "Supplier",
            "Stock Status",
          ],
          rows: filtered.map((a) => [
            a.name,
            a.item_code,
            a.category,
            a.location,
            a.current_qty,
            a.reorder_point,
            a.supplier,
            a.stock,
          ]),
        },
        {
          heading: "Recommended Purchase Orders",
          columns: [
            "Asset",
            "Current",
            "Min Required",
            "Order Qty",
            "Est. Cost (₹)",
            "Supplier",
            "Priority",
          ],
          rows: recommendations.map((r) => [
            r.name,
            r.current_qty,
            r.min_qty,
            r.recommend,
            r.estCost.toLocaleString(),
            r.supplier,
            r.priority,
          ]),
        },
      ],
      filename: `Asset_Inventory_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

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
        title="Asset Inventory"
        description="Track spares, consumables and equipment inventory across plants with AI-assisted reorder recommendations."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleCsv}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePdf}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdjustmentModal(true)}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Adjust Stock
            </Button>
            <Button
              size="sm"
              className="btn-hero"
              onClick={() => setShowItemModal(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Asset
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
            placeholder="Search asset, manufacturer, supplier…"
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
          onChange={(e) =>
            setFilterStatus(e.target.value as "All" | StockStatus)
          }
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
        >
          {["All", "In Stock", "Low Stock", "Out of Stock", "Reserved"].map(
            (s) => (
              <option key={s}>{s}</option>
            ),
          )}
        </select>
      </div>

      {/* Inventory table */}
      <div className="mt-4 rounded-2xl border border-border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No inventory items match"
            description="Adjust your filters or search to see stock."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {[
                    "Asset",
                    "ID",
                    "Category",
                    "Manufacturer",
                    "Location",
                    "Current",
                    "Min",
                    "Max",
                    "Reorder",
                    "Unit Cost",
                    "Supplier",
                    "Stock",
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
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t border-border hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.item_code}
                    </td>
                    <td className="px-4 py-3">{a.category}</td>
                    <td className="px-4 py-3">{a.manufacturer}</td>
                    <td className="px-4 py-3">{a.location}</td>
                    <td className="px-4 py-3 font-semibold">{a.current_qty}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.min_qty}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.max_qty}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.reorder_point}
                    </td>
                    <td className="px-4 py-3">
                      ₹{a.unit_cost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{a.supplier}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${stockColor[a.stock as StockStatus]}`}
                      >
                        {a.stock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
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

      {/* ADD ASSET MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateItem}
            className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setShowItemModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold">
              Add Inventory Asset
            </h3>
            <div className="space-y-3 text-xs max-h-[350px] overflow-y-auto pr-1">
              <div>
                <label className="block text-muted-foreground mb-1">
                  Asset Name
                </label>
                <input
                  required
                  placeholder="e.g. Mechanical Seal MS-201"
                  value={itemForm.name}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, name: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Asset ID / Code
                </label>
                <input
                  required
                  placeholder="e.g. BRG-6205"
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
                  value={itemForm.category}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, category: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                >
                  <option value="Bearings">Bearings</option>
                  <option value="Belts">Belts</option>
                  <option value="Lubricants">Lubricants</option>
                  <option value="Instrumentation">Instrumentation</option>
                  <option value="Motors">Motors</option>
                  <option value="Seals">Seals</option>
                  <option value="Valves">Valves</option>
                  <option value="Electronics">Electronics</option>
                </select>
              </div>
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
                    required
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
                  Storage Location
                </label>
                <input
                  required
                  placeholder="e.g. Warehouse A, Bay 4"
                  value={itemForm.location}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, location: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 outline-none focus:border-accent"
                />
              </div>
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
              <div className="grid grid-cols-2 gap-2">
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
                    Status
                  </label>
                  <select
                    value={itemForm.status}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        status: e.target.value as
                          "Operational" | "Maintenance" | "Reserved",
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
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-8"
                onClick={() => setShowItemModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full text-xs h-8 btn-hero">
                Save Asset
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
                  Select Spares Asset
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
                  <option value="">-- Choose Item --</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.item_code}) — Current: {it.current_qty}
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
                  placeholder="e.g. Pump lubrication repair, Stock replenishment"
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
