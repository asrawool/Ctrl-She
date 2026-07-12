import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Search, ZoomIn, ZoomOut, Maximize2, Filter, X } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";

export const Route = createFileRoute("/app/graph")({
  head: () => ({ meta: [{ title: "Knowledge Graph — IntelliPlant AI" }] }),
  component: Graph,
});

type Node = { id: string; label: string; type: "asset"|"doc"|"person"|"incident"|"sop"; x: number; y: number };
type Edge = { a: string; b: string };

const NODES: Node[] = [
  { id:"a1", label:"Pump P-401", type:"asset", x:400, y:280 },
  { id:"d1", label:"KSB Manual", type:"doc", x:220, y:180 },
  { id:"d2", label:"Vibration Log", type:"doc", x:220, y:380 },
  { id:"i1", label:"IR-118 Bearing", type:"incident", x:580, y:180 },
  { id:"i2", label:"IR-207 Seal", type:"incident", x:580, y:380 },
  { id:"s1", label:"Lube SOP", type:"sop", x:400, y:100 },
  { id:"s2", label:"Start-up SOP", type:"sop", x:400, y:460 },
  { id:"p1", label:"R. Sharma", type:"person", x:740, y:280 },
  { id:"a2", label:"Compressor C-12", type:"asset", x:100, y:280 },
  { id:"d3", label:"P&ID Alpha", type:"doc", x:100, y:100 },
];
const EDGES: Edge[] = [
  {a:"a1",b:"d1"},{a:"a1",b:"d2"},{a:"a1",b:"i1"},{a:"a1",b:"i2"},{a:"a1",b:"s1"},{a:"a1",b:"s2"},{a:"a1",b:"p1"},
  {a:"a2",b:"d3"},{a:"a2",b:"d2"},{a:"i1",b:"p1"},
];

const COLORS = {
  asset: "#00C2FF", doc: "#18C37E", person: "#F5A524", incident: "#F31260", sop: "#8B5CF6",
};

function Graph() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<Node | null>(NODES[0]);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, boolean>>({ asset:true, doc:true, person:true, incident:true, sop:true });
  const [full, setFull] = useState(false);
  const dragRef = useRef<{ x:number; y:number } | null>(null);

  const visible = NODES.filter((n) => filters[n.type] && (!q || n.label.toLowerCase().includes(q.toLowerCase())));
  const visibleIds = new Set(visible.map((v) => v.id));
  const visibleEdges = EDGES.filter((e) => visibleIds.has(e.a) && visibleIds.has(e.b));

  const onMouseDown = (e: React.MouseEvent) => { dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; };
  const onMouseMove = (e: React.MouseEvent) => { if (dragRef.current) setPan({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y }); };
  const onMouseUp = () => { dragRef.current = null; };

  useEffect(() => { const u = () => (dragRef.current = null); window.addEventListener("mouseup", u); return () => window.removeEventListener("mouseup", u); }, []);

  return (
    <>
      <PageHeader title="Knowledge Graph" description="Explore relationships between assets, documents, incidents and people across your plant." />

      <div className={`grid gap-4 ${full ? "" : "lg:grid-cols-[1fr_300px]"}`}>
        <div className="relative rounded-2xl border border-border bg-gradient-to-br from-navy to-steel overflow-hidden" style={{ height: full ? "calc(100vh - 12rem)" : "560px" }}>
          <div className="absolute inset-0 grid-industrial opacity-20" />

          {/* Controls */}
          <div className="absolute top-3 left-3 z-10 flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/60" />
              <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search nodes"
                className="h-9 w-56 rounded-lg bg-white/10 pl-8 pr-2 text-xs text-white placeholder:text-white/50 outline-none focus:bg-white/20" />
            </div>
          </div>

          <div className="absolute top-3 right-3 z-10 flex gap-1.5">
            <IconBtn onClick={() => setZoom((z) => Math.min(2, z + 0.15))}><ZoomIn className="h-4 w-4" /></IconBtn>
            <IconBtn onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}><ZoomOut className="h-4 w-4" /></IconBtn>
            <IconBtn onClick={() => setFull((f) => !f)}><Maximize2 className="h-4 w-4" /></IconBtn>
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-10 rounded-xl bg-black/30 backdrop-blur border border-white/10 p-2.5 text-white text-[11px] space-y-1.5">
            <div className="font-bold text-[10px] uppercase tracking-wider text-white/70 mb-1">Relationship Legend</div>
            {Object.entries(COLORS).map(([k,c])=>(
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters[k]} onChange={(e)=>setFilters({...filters,[k]:e.target.checked})} className="accent-cyan" />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                <span className="capitalize">{k}</span>
              </label>
            ))}
          </div>

          {/* SVG */}
          <svg
            className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
          >
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
              {visibleEdges.map((e, i) => {
                const a = NODES.find((n) => n.id === e.a)!; const b = NODES.find((n) => n.id === e.b)!;
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(0,194,255,0.35)" strokeWidth={1.5}>
                  <animate attributeName="stroke-dasharray" values="0,200;200,0" dur="3s" repeatCount="indefinite" />
                </line>;
              })}
              {visible.map((n) => (
                <g key={n.id} onClick={(e) => { e.stopPropagation(); setSelected(n); }} className="cursor-pointer">
                  <circle cx={n.x} cy={n.y} r={selected?.id===n.id ? 28 : 22} fill={COLORS[n.type]} opacity={0.25} />
                  <circle cx={n.x} cy={n.y} r={selected?.id===n.id ? 14 : 10} fill={COLORS[n.type]} />
                  <text x={n.x} y={n.y + 32} textAnchor="middle" fill="white" fontSize="10" fontWeight="600">{n.label}</text>
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* Node details */}
        {!full && (
          <aside className="rounded-2xl border border-border bg-card p-5 h-fit">
            {selected ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-3 w-3 rounded-full" style={{ background: COLORS[selected.type] }} />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{selected.type}</span>
                </div>
                <h3 className="font-display text-lg font-bold">{selected.label}</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5">Connections ({EDGES.filter((e)=>e.a===selected.id||e.b===selected.id).length})</div>
                    <div className="space-y-1">
                      {EDGES.filter((e)=>e.a===selected.id||e.b===selected.id).map((e, i) => {
                        const other = NODES.find((n) => n.id === (e.a === selected.id ? e.b : e.a))!;
                        return (
                          <button key={i} onClick={()=>setSelected(other)} className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-left hover:bg-muted transition">
                            <span className="h-2 w-2 rounded-full" style={{ background: COLORS[other.type] }} />
                            <span className="text-xs">{other.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <button onClick={()=>setSelected(null)} className="mt-4 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="h-3 w-3" /> Close</button>
              </>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground"><Filter className="mx-auto h-6 w-6 mb-2" />Select a node to see details</div>
            )}
          </aside>
        )}
      </div>
    </>
  );
}

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition">{children}</button>;
}
