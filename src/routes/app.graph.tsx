import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ZoomIn, ZoomOut, Maximize2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/app/graph")({
  head: () => ({ meta: [{ title: "Knowledge Graph — SynapseAi" }] }),
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

/** Iterative force-directed layout: repulsion + spring + gravity toward center */
function runForceLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  const pos = nodes.map((n) => ({ id: n.id, x: n.x, y: n.y }));
  const vel: Record<string, { vx: number; vy: number }> = {};
  pos.forEach((p) => {
    vel[p.id] = { vx: 0, vy: 0 };
  });

  const REPULSION = 14000;
  const SPRING_STRENGTH = 0.05;
  const IDEAL_LENGTH = 160;
  const GRAVITY = 0.006;
  const CX = 450,
    CY = 300;
  const DECAY = 0.85;

  for (let iter = 0; iter < 280; iter++) {
    const fx: Record<string, number> = {};
    const fy: Record<string, number> = {};
    pos.forEach((p) => {
      fx[p.id] = 0;
      fy[p.id] = 0;
    });

    // Repulsion between all pairs
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[j].x - pos[i].x || 0.01;
        const dy = pos[j].y - pos[i].y || 0.01;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = REPULSION / (dist * dist);
        const ux = dx / dist,
          uy = dy / dist;
        fx[pos[i].id] -= ux * force;
        fy[pos[i].id] -= uy * force;
        fx[pos[j].id] += ux * force;
        fy[pos[j].id] += uy * force;
      }
    }

    // Spring attraction along edges
    edges.forEach((e) => {
      const a = pos.find((p) => p.id === e.a);
      const b = pos.find((p) => p.id === e.b);
      if (!a || !b) return;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const force = SPRING_STRENGTH * (dist - IDEAL_LENGTH);
      const ux = dx / dist,
        uy = dy / dist;
      fx[a.id] += ux * force;
      fy[a.id] += uy * force;
      fx[b.id] -= ux * force;
      fy[b.id] -= uy * force;
    });

    // Gravity toward center
    pos.forEach((p) => {
      fx[p.id] += (CX - p.x) * GRAVITY;
      fy[p.id] += (CY - p.y) * GRAVITY;
    });

    // Apply with damping
    pos.forEach((p) => {
      vel[p.id].vx = (vel[p.id].vx + fx[p.id]) * DECAY;
      vel[p.id].vy = (vel[p.id].vy + fy[p.id]) * DECAY;
      p.x += vel[p.id].vx;
      p.y += vel[p.id].vy;
    });
  }

  return nodes.map((n) => {
    const p = pos.find((pp) => pp.id === n.id)!;
    return { ...n, x: p.x, y: p.y };
  });
}

function Graph() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Node | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
      const [
        { data: astData },
        { data: docData },
        { data: ncrData },
        { data: rcaData },
        { data: profileData },
        { data: roleData },
        { data: workOrderData },
      ] = await Promise.all([
        supabase.from("assets").select("*"),
        supabase.from("documents").select("*"),
        supabase.from("ncrs").select("*"),
        supabase.from("rca_reports").select("*"),
        supabase
          .from("user_profiles")
          .select("user_id, full_name, email, department"),
        supabase.from("user_roles").select("user_id, role"),
        supabase
          .from("work_orders")
          .select("id, asset_id, created_by, assignee_id"),
      ]);

      const gNodes: Node[] = [];
      const gEdges: Edge[] = [];

      // 1. Asset nodes in a central ring
      const assetNodesList: Node[] = (astData || []).map((a, index) => {
        const angle = (index / Math.max(astData?.length || 1, 1)) * 2 * Math.PI;
        const radius = 180;
        return {
          id: a.id,
          label: `${a.asset_code ?? a.id}: ${a.name}`,
          type: "asset" as const,
          x: 450 + Math.cos(angle) * radius,
          y: 300 + Math.sin(angle) * radius,
          details: `Type: ${a.category ?? a.type} | Health: ${a.health_percentage}%`,
        };
      });
      gNodes.push(...assetNodesList);

      // 2. Documents — initial scatter, edges to mapped asset (strict exact matching)
      (docData || []).forEach((d, index) => {
        const docId = `doc-${d.id}`;
        let mappedAsset: Node | undefined = undefined;

        if (d.asset && d.asset !== "—" && d.asset.trim() !== "") {
          const rawAsset = d.asset.trim().toUpperCase();
          const normDocAsset = rawAsset.replace(/[^A-Z0-9]/g, "");

          mappedAsset = assetNodesList.find((an) => {
            const normId = an.id.toUpperCase().replace(/[^A-Z0-9]/g, "");
            const normLabel = an.label.toUpperCase().replace(/[^A-Z0-9]/g, "");
            const tagMatch = an.label.match(
              /([A-Z0-9]+-[0-9]+|[A-Z]+[0-9]+)$/i,
            );
            const normTag = tagMatch
              ? tagMatch[0].toUpperCase().replace(/[^A-Z0-9]/g, "")
              : "";

            return (
              normDocAsset === normId ||
              normDocAsset === normLabel ||
              (normTag !== "" && normDocAsset === normTag)
            );
          });
        }

        const spread = (index - (docData?.length ?? 0) / 2) * 80;
        let x = 150 + (index % 4) * 100;
        let y = 80 + Math.floor(index / 4) * 90;

        if (mappedAsset) {
          x = mappedAsset.x + spread * 0.3 + 60;
          y = mappedAsset.y + (index % 2 === 0 ? 80 : -80);
          gEdges.push({ a: mappedAsset.id, b: docId });
        }

        gNodes.push({
          id: docId,
          label: d.name,
          type:
            d.category === "SOPs" ||
            d.category?.includes("Standard Operating Procedures")
              ? "sop"
              : "doc",
          x,
          y,
          details: `Category: ${d.category ?? "General"} | Asset: ${d.asset ?? "—"} | Version: ${d.version ?? "1.0"}`,
        });
      });

      // 3. NCRs — link to first asset matching framework
      (ncrData || []).forEach((n, index) => {
        const ncrId = `ncr-${n.id}`;
        const linkedAsset =
          assetNodesList.find(
            (an) =>
              n.framework_ref &&
              an.label.toLowerCase().includes(n.framework_ref.toLowerCase()),
          ) || assetNodesList[index % Math.max(assetNodesList.length, 1)];

        let x = 600 + (index % 3) * 90;
        let y = 350 + Math.floor(index / 3) * 90;

        if (linkedAsset) {
          x = linkedAsset.x + 100 + (index % 2 === 0 ? 40 : -40);
          y = linkedAsset.y + (index % 2 === 0 ? -100 : 100);
          gEdges.push({ a: linkedAsset.id, b: ncrId });
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

      // 3.5 RCA Reports
      (rcaData || []).forEach((r, index) => {
        const rcaNodeId = `rca-${r.id}`;
        const mappedAsset = assetNodesList.find((an) => an.id === r.asset_id);
        let x = 300 + (index % 3) * 100;
        let y = 480 + Math.floor(index / 3) * 80;

        if (mappedAsset) {
          x = mappedAsset.x - 90 + (index % 2 === 0 ? 30 : -30);
          y = mappedAsset.y + 110;
          gEdges.push({ a: mappedAsset.id, b: rcaNodeId });
        }

        gNodes.push({
          id: rcaNodeId,
          label: `RCA: ${r.incident_ref}`,
          type: "incident",
          x,
          y,
          details: `Incident: ${r.incident_ref} | Root Cause: ${r.root_cause}`,
        });
      });

      // 4. Personnel nodes — placed away from asset cluster
      const rolesByUser = new Map(
        (roleData || []).map((role) => [role.user_id, role.role]),
      );
      const personNodeIds = new Map<string, string>();
      (profileData || []).forEach((profile, index) => {
        const angle =
          (index / Math.max(profileData?.length || 1, 1)) * 2 * Math.PI;
        const personId = `person-${profile.user_id}`;
        personNodeIds.set(profile.user_id, personId);
        gNodes.push({
          id: personId,
          label:
            profile.full_name ||
            profile.email ||
            `User ${profile.user_id.slice(0, 8)}`,
          type: "person",
          x: 450 + Math.cos(angle) * 320,
          y: 300 + Math.sin(angle) * 240,
          details: [rolesByUser.get(profile.user_id), profile.department]
            .filter(Boolean)
            .join(" | "),
        });
      });

      const addPersonEdge = (
        userId: string | null | undefined,
        nodeId: string | null | undefined,
      ) => {
        const personId = userId ? personNodeIds.get(userId) : undefined;
        if (personId && nodeId) gEdges.push({ a: personId, b: nodeId });
      };

      (astData || []).forEach((asset) =>
        addPersonEdge(asset.updated_by, asset.id),
      );
      (docData || []).forEach((document) =>
        addPersonEdge(
          document.created_by ?? document.uploaded_by,
          `doc-${document.id}`,
        ),
      );
      (ncrData || []).forEach((ncr) =>
        addPersonEdge(ncr.created_by, `ncr-${ncr.id}`),
      );
      (rcaData || []).forEach((report) =>
        addPersonEdge(report.created_by, `rca-${report.id}`),
      );
      (workOrderData || []).forEach((workOrder) => {
        addPersonEdge(workOrder.created_by, workOrder.asset_id);
        addPersonEdge(workOrder.assignee_id, workOrder.asset_id);
      });

      // Run force layout to produce relationship-aware positions
      const laidOut = runForceLayout(gNodes, gEdges);
      setNodes(laidOut);
      setEdges(gEdges);
      if (laidOut.length > 0) setSelected(laidOut[0]);
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
          <div className="absolute left-1/2 top-3 z-10 flex w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 gap-2">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/60" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search nodes"
                className="h-9 w-full rounded-lg bg-white/10 pl-8 pr-2 text-xs text-white placeholder:text-white/50 outline-none focus:bg-white/20"
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
                const activeId = selected?.id || hoveredId;
                const isHighlighted =
                  !!activeId && (e.a === activeId || e.b === activeId);

                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={
                      isHighlighted ? "#00ffcc" : "rgba(0,194,255,0.35)"
                    }
                    strokeWidth={isHighlighted ? 2.5 : 1.5}
                    opacity={activeId ? (isHighlighted ? 1 : 0.2) : 0.8}
                  />
                );
              })}
              {visibleNodes.map((n) => {
                const isSelected = selected?.id === n.id;
                const isHovered = hoveredId === n.id;
                const activeId = selected?.id || hoveredId;
                const isConnected =
                  !!activeId &&
                  edges.some(
                    (e) =>
                      (e.a === activeId && e.b === n.id) ||
                      (e.b === activeId && e.a === n.id),
                  );
                const r = isSelected || isHovered ? 11 : isConnected ? 9 : 7;
                const nodeOpacity = activeId
                  ? isSelected || isHovered || isConnected
                    ? 1
                    : 0.35
                  : 1;

                return (
                  <g
                    key={n.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(n);
                    }}
                    onMouseEnter={() => setHoveredId(n.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="cursor-pointer"
                    style={{
                      opacity: nodeOpacity,
                      transition: "opacity 0.15s",
                    }}
                  >
                    {/* Outer glow ring on hover — rendered in SVG, no CSS scaling */}
                    {(isHovered || (isSelected && !hoveredId)) && (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={16}
                        fill={COLORS[n.type]}
                        opacity={0.18}
                      />
                    )}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={r}
                      fill={COLORS[n.type]}
                      stroke={
                        isSelected
                          ? "#fff"
                          : isHovered || isConnected
                            ? "rgba(255,255,255,0.8)"
                            : "none"
                      }
                      strokeWidth={isSelected ? 2.5 : isConnected ? 2 : 1.5}
                    />
                    <text
                      x={n.x}
                      y={n.y - 14}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize={10}
                      fontWeight={isHovered || isSelected ? "600" : "400"}
                      opacity={isHovered || isSelected ? 1 : 0.85}
                      style={{ userSelect: "none" }}
                    >
                      {n.label}
                    </text>
                  </g>
                );
              })}
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
