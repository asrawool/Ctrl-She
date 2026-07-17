import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ZoomIn, ZoomOut, Maximize2, X, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/app/graph")({
  head: () => ({ meta: [{ title: "Knowledge Graph — IntelliPlant AI" }] }),
  component: Graph,
});

type Node = {
  id: string;
  label: string;
  type: "asset" | "doc" | "person" | "incident" | "sop";
  x: number;
  y: number;
  details?: string;
};

type Edge = { a: string; b: string };

const COLORS = {
  asset: "#00C2FF",
  doc: "#18C37E",
  person: "#F5A524",
  incident: "#F31260",
  sop: "#8B5CF6",
};

function Graph() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Node | null>(null);

  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, boolean>>({
    asset: true,
    doc: true,
    person: true,
    incident: true,
    sop: true,
  });
  const [full, setFull] = useState(false);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const fetchData = async () => {
    try {
      const [{ data: astData }, { data: docData }, { data: ncrData }] =
        await Promise.all([
          supabase.from("assets").select("*"),
          supabase.from("documents").select("*"),
          supabase.from("ncrs").select("*"),
        ]);

      const gNodes: Node[] = [];
      const gEdges: Edge[] = [];

      // 1. Add Asset Nodes in a central ring/circle
      const assetNodesList: Node[] = (astData || []).map((a, index) => {
        const angle = (index / (astData?.length || 4)) * 2 * Math.PI;
        const radius = 180;
        return {
          id: a.id,
          label: `${a.id}: ${a.name}`,
          type: "asset",
          x: 400 + Math.cos(angle) * radius,
          y: 280 + Math.sin(angle) * radius,
          details: `Type: ${a.type} | Plant: ${a.plant} | Health: ${a.health_percentage}%`,
        };
      });
      gNodes.push(...assetNodesList);

      // 2. Add Documents and map edges to assets
      (docData || []).forEach((d, index) => {
        const docId = `doc-${d.id}`;
        // Find if mapped to a specific asset
        const mappedAsset = assetNodesList.find((an) => an.id === d.asset);
        let x = 150 + (index % 3) * 120;
        let y = 100 + Math.floor(index / 3) * 80;

        if (mappedAsset) {
          // Place nearby the mapped asset
          x = mappedAsset.x + (Math.random() - 0.5) * 120;
          y = mappedAsset.y + (Math.random() - 0.5) * 120;
          gEdges.push({ a: mappedAsset.id, b: docId });
        }

        gNodes.push({
          id: docId,
          label: d.name,
          type: d.category === "SOPs" ? "sop" : "doc",
          x,
          y,
          details: `Category: ${d.category} | Version: ${d.version} | Size: ${(d.size / 1024 / 1024).toFixed(2)} MB`,
        });
      });

      // 3. Add Incidents (NCRs) and connect them
      (ncrData || []).forEach((n, index) => {
        const ncrId = `ncr-${n.id}`;
        // Randomly scatter NCRs or link to asset if framework matches asset ID (standard mock P-401 links to PESO/ISO)
        let x = 600 + (index % 2) * 100;
        let y = 350 + Math.floor(index / 2) * 100;

        // Try linking to Pump P-401 as a mock relationship
        const p401 = assetNodesList.find((an) => an.id === "P-401");
        if (
          p401 &&
          (n.framework_ref === "PESO" || n.framework_ref === "ISO 9001")
        ) {
          x = p401.x + (Math.random() - 0.5) * 150;
          y = p401.y + (Math.random() - 0.5) * 150;
          gEdges.push({ a: p401.id, b: ncrId });
        }

        gNodes.push({
          id: ncrId,
          label: `${n.ncr_number}: ${n.description.slice(0, 20)}...`,
          type: "incident",
          x,
          y,
          details: `Severity: ${n.severity} | Status: ${n.status} | Framework: ${n.framework_ref}`,
        });
      });

      // 4. Add key personnel as nodes
      const personnel = [
        {
          id: "p-sharma",
          name: "R. Sharma",
          x: 750,
          y: 150,
          details: "Maintenance Lead (Operations)",
        },
        {
          id: "p-patel",
          name: "A. Patel",
          x: 720,
          y: 400,
          details: "Quality Compliance Officer",
        },
      ];

      personnel.forEach((p) => {
        gNodes.push({
          id: p.id,
          label: p.name,
          type: "person",
          x: p.x,
          y: p.y,
          details: p.details,
        });

        // Link R. Sharma to P-401 asset
        if (p.id === "p-sharma") {
          const p401 = assetNodesList.find((an) => an.id === "P-401");
          if (p401) gEdges.push({ a: p401.id, b: p.id });
        }
      });

      setNodes(gNodes);
      setEdges(gEdges);
      if (gNodes.length > 0) {
        setSelected(gNodes[0]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to construct live knowledge graph");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const visibleNodes = useMemo(() => {
    return nodes.filter(
      (n) =>
        filters[n.type] &&
        (!q || n.label.toLowerCase().includes(q.toLowerCase())),
    );
  }, [nodes, q, filters]);

  const visibleIds = useMemo(
    () => new Set(visibleNodes.map((v) => v.id)),
    [visibleNodes],
  );

  const visibleEdges = useMemo(() => {
    return edges.filter((e) => visibleIds.has(e.a) && visibleIds.has(e.b));
  }, [edges, visibleIds]);

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (dragRef.current)
      setPan({
        x: e.clientX - dragRef.current.x,
        y: e.clientY - dragRef.current.y,
      });
  };
  const onMouseUp = () => {
    dragRef.current = null;
  };

  useEffect(() => {
    const u = () => (dragRef.current = null);
    window.addEventListener("mouseup", u);
    return () => window.removeEventListener("mouseup", u);
  }, []);

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
        title="Knowledge Graph"
        description="Explore relationships between assets, documents, incidents and people across your plant."
      />

      <div className={`grid gap-4 ${full ? "" : "lg:grid-cols-[1fr_300px]"}`}>
        <div
          className="relative rounded-2xl border border-border bg-gradient-to-br from-navy to-steel overflow-hidden"
          style={{ height: full ? "calc(100vh - 12rem)" : "560px" }}
        >
          <div className="absolute inset-0 grid-industrial opacity-20" />

          {/* Controls */}
          <div className="absolute top-3 left-3 z-10 flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/60" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search nodes"
                className="h-9 w-56 rounded-lg bg-white/10 pl-8 pr-2 text-xs text-white placeholder:text-white/50 outline-none focus:bg-white/20"
              />
            </div>
          </div>

          <div className="absolute top-3 right-3 z-10 flex gap-1.5">
            <IconBtn onClick={() => setZoom((z) => Math.min(2, z + 0.15))}>
              <ZoomIn className="h-4 w-4" />
            </IconBtn>
            <IconBtn onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}>
              <ZoomOut className="h-4 w-4" />
            </IconBtn>
            <IconBtn onClick={() => setFull((f) => !f)}>
              <Maximize2 className="h-4 w-4" />
            </IconBtn>
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-10 rounded-xl bg-black/30 backdrop-blur border border-white/10 p-2.5 text-white text-[11px] space-y-1.5">
            <div className="font-bold text-[10px] uppercase tracking-wider text-white/70 mb-1">
              Relationship Legend
            </div>
            {Object.entries(COLORS).map(([k, c]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters[k]}
                  onChange={(e) =>
                    setFilters({ ...filters, [k]: e.target.checked })
                  }
                  className="accent-cyan"
                />
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: c }}
                />
                <span className="capitalize">{k}</span>
              </label>
            ))}
          </div>

          {/* SVG Canvas */}
          <svg
            className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
          >
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
              {visibleEdges.map((e, i) => {
                const a = nodes.find((n) => n.id === e.a)!;
                const b = nodes.find((n) => n.id === e.b)!;
                if (!a || !b) return null;
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="rgba(0,194,255,0.35)"
                    strokeWidth={1.5}
                  />
                );
              })}
              {visibleNodes.map((n) => (
                <g
                  key={n.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(n);
                  }}
                  className="cursor-pointer group"
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={selected?.id === n.id ? 10 : 7}
                    fill={COLORS[n.type]}
                    className="transition-all hover:scale-125"
                    stroke={selected?.id === n.id ? "#fff" : "none"}
                    strokeWidth={2}
                  />
                  <text
                    x={n.x}
                    y={n.y - 12}
                    textAnchor="middle"
                    fill="#fff"
                    className="text-[10px] font-medium opacity-90 select-none group-hover:opacity-100 transition"
                  >
                    {n.label}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>

        {!full && (
          <aside className="rounded-2xl border border-border bg-card p-5 h-fit">
            {selected ? (
              <div className="space-y-4">
                <div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white border"
                    style={{
                      background: COLORS[selected.type],
                      borderColor: "rgba(255,255,255,0.2)",
                    }}
                  >
                    {selected.type}
                  </span>
                  <h4 className="mt-2 text-md font-display font-bold">
                    {selected.label}
                  </h4>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg leading-relaxed">
                  {selected.details || "No metadata description associated."}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-muted-foreground italic">
                Select a node to inspect relationships and metadata details.
              </div>
            )}
          </aside>
        )}
      </div>
    </>
  );
}

function IconBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/30 backdrop-blur text-white hover:bg-white/10 transition"
    >
      {children}
    </button>
  );
}
