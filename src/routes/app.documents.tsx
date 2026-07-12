import { supabase } from "@/lib/supabase";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  Upload, FileText, FileSpreadsheet, FileImage, Folder, Search, Filter,
  Grid3x3, List, Star, MoreVertical, Download, Trash2, History, Tag, Eye,
} from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/documents")({
  head: () => ({ meta: [{ title: "Documents — IntelliPlant AI" }] }),
  component: Documents,
});

interface Doc { id: string; name: string; type: "pdf"|"docx"|"xlsx"|"img"; size: number; category: string; tags: string[]; asset: string; version: string; updated: string; starred?: boolean; storagePath?: string; }

const SEED: Doc[] = [
  { id:"1", name:"KSB Pump P-401 Manual.pdf", type:"pdf", size:2400000, category:"Manuals", tags:["Pump","OEM"], asset:"P-401", version:"v2.3", updated:"2d ago", starred:true },
  { id:"2", name:"ISO 9001 Audit Checklist.xlsx", type:"xlsx", size:180000, category:"Audits", tags:["ISO","Quality"], asset:"Plant Alpha", version:"v1.0", updated:"1w ago" },
  { id:"3", name:"Reactor R-3 Start-up SOP.docx", type:"docx", size:340000, category:"SOPs", tags:["Reactor","Procedure"], asset:"R-3", version:"v4.1", updated:"3d ago" },
  { id:"4", name:"P&ID Boiler B-12.pdf", type:"pdf", size:5200000, category:"Drawings", tags:["P&ID","Boiler"], asset:"B-12", version:"v1.2", updated:"2w ago" },
  { id:"5", name:"Incident IR-2024-118.pdf", type:"pdf", size:900000, category:"Incidents", tags:["RCA","Bearing"], asset:"P-401", version:"v1.0", updated:"4d ago", starred:true },
  { id:"6", name:"Vibration Trend Compressor C-12.xlsx", type:"xlsx", size:220000, category:"Data", tags:["Vibration","Trend"], asset:"C-12", version:"v3.4", updated:"6h ago" },
];

const ICONS = { pdf: FileText, docx: FileText, xlsx: FileSpreadsheet, img: FileImage };
const CATEGORIES = ["All","Manuals","SOPs","Drawings","Audits","Incidents","Data"];

// crypto.randomUUID() only works in secure contexts (HTTPS or localhost).
// This fallback works everywhere, including LAN IPs / plain HTTP dev servers.
function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function Documents() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [view, setView] = useState<"grid"|"list">("list");
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"updated"|"name"|"size">("updated");
  const [selected, setSelected] = useState<Doc | null>(null);
  const [uploads, setUploads] = useState<{name:string;pct:number}[]>([]);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("uploaded_at", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }
      if (!data) return;

      const fetched: Doc[] = data.map((row) => {
        const type = row.name.endsWith(".pdf")
          ? "pdf"
          : row.name.match(/\.(xlsx?|csv)$/)
            ? "xlsx"
            : row.name.match(/\.docx?$/)
              ? "docx"
              : "img";

        return {
          id: row.id,
          name: row.name,
          type: type as Doc["type"],
          size: 0,
          category: row.category ?? "Manuals",
          tags: row.tags ?? [],
          asset: row.asset ?? "—",
          version: row.version ?? "v1.0",
          updated: row.uploaded_at ? new Date(row.uploaded_at).toLocaleDateString() : "—",
          storagePath: row.storage_path,
        };
      });

      setDocs(fetched);
    };

    fetchDocs();
  }, []);

  const filtered = docs
    .filter((d) => cat==="All" || d.category===cat)
    .filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;

    for (const file of Array.from(files)) {
      const item = { name: file.name, pct: 0 };
      setUploads((u) => [...u, item]);

      // Fake progress animation while the real upload happens in the background
      const interval = setInterval(() => {
        setUploads((u) =>
          u.map((it) => (it.name === file.name ? { ...it, pct: Math.min(90, it.pct + 10) } : it))
        );
      }, 200);

      try {
        const filePath = `${generateId()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Storage upload failed:", uploadError);
          continue;
        }

        const { data: document, error: dbError } = await supabase
          .from("documents")
          .insert({
            name: file.name,
            storage_path: filePath,
          })
          .select()
          .single();

        if (dbError) {
          console.error("DB insert failed:", dbError);
          continue;
        }

        const type = file.name.endsWith(".pdf")
          ? "pdf"
          : file.name.match(/\.(xlsx?|csv)$/)
            ? "xlsx"
            : file.name.match(/\.docx?$/)
              ? "docx"
              : "img";

        setDocs((d) => [
          {
            id: document.id,
            name: file.name,
            type: type as Doc["type"],
            size: file.size,
            category: "Manuals",
            tags: ["New"],
            asset: "—",
            version: "v1.0",
            updated: "just now",
            storagePath: filePath,
          },
          ...d,
        ]);

        // Kick off chunking + embedding in the background.
        // We don't await this — the upload UI shouldn't wait on it,
        // and any failure here shouldn't undo the upload that already succeeded.
        console.log("About to call process-document for:", document.id);
        supabase.functions
          .invoke("process-document", { body: { documentId: document.id } })
          .then(({ data, error }) => {
            if (error) {
              console.error("Document processing failed:", error);
            } else {
              console.log("Document processed:", data);
            }
          });
      } catch (err) {
        // Catches anything unexpected (network errors, etc.) so the
        // progress bar never gets stuck silently.
        console.error("Unexpected upload error:", err);
      } finally {
        clearInterval(interval);
        setUploads((u) => u.filter((it) => it.name !== file.name));
      }
    }
  };

  const handlePreview = async (doc: Doc) => {
    if (!doc.storagePath) {
      console.error("No storage path for this document — cannot preview.");
      return;
    }
    const { data, error } = await supabase.storage
      .from("documents")
      .download(doc.storagePath);
    if (error || !data) {
      console.error("Preview failed:", error);
      return;
    }
    const url = URL.createObjectURL(data);
    window.open(url, "_blank");
    // Revoke after a delay so the new tab has time to load it
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleDownload = async (doc: Doc) => {
    if (!doc.storagePath) {
      console.error("No storage path for this document — cannot download.");
      return;
    }
    const { data, error } = await supabase.storage
      .from("documents")
      .download(doc.storagePath);
    if (error || !data) {
      console.error("Download failed:", error);
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (doc: Doc) => {
    if (!confirm(`Delete "${doc.name}"? This can't be undone.`)) return;

    if (doc.storagePath) {
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([doc.storagePath]);
      if (storageError) console.error("Storage delete failed:", storageError);
    }

    const { error: dbError } = await supabase
      .from("documents")
      .delete()
      .eq("id", doc.id);
    if (dbError) {
      console.error("DB delete failed:", dbError);
      return;
    }

    setDocs((d) => d.filter((x) => x.id !== doc.id));
    setSelected((s) => (s?.id === doc.id ? null : s));
  };

  return (
    <>
      <PageHeader title="Document Center" description="Universal document management with AI extraction, versioning and equipment mapping." />
      <input ref={fileRef} type="file" multiple hidden onChange={(e) => handleUpload(e.target.files)} />

      {/* Dropzone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleUpload(e.dataTransfer.files); }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${drag ? "border-accent bg-accent/5" : "border-border bg-muted/20"}`}
      >
        <Upload className={`mx-auto h-8 w-8 mb-2 ${drag ? "text-accent" : "text-muted-foreground"}`} />
        <p className="text-sm font-semibold">Drop files here or <span className="text-accent underline">browse</span></p>
        <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, PNG, JPG · up to 100MB</p>

        {uploads.length > 0 && (
          <div className="mt-4 space-y-2 text-left max-w-md mx-auto">
            {uploads.map((u) => (
              <div key={u.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="truncate">{u.name}</span><span className="font-semibold">{u.pct}%</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-accent transition-all" style={{ width: `${u.pct}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search documents…" className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm" />
        </div>
        <select value={cat} onChange={(e)=>setCat(e.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={(e)=>setSort(e.target.value as never)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
          <option value="updated">Last updated</option><option value="name">Name</option><option value="size">Size</option>
        </select>
        <div className="ml-auto flex rounded-xl border border-border overflow-hidden">
          <button onClick={()=>setView("list")} className={`grid h-10 w-10 place-items-center ${view==="list"?"bg-accent/10 text-accent":""}`}><List className="h-4 w-4" /></button>
          <button onClick={()=>setView("grid")} className={`grid h-10 w-10 place-items-center ${view==="grid"?"bg-accent/10 text-accent":""}`}><Grid3x3 className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState icon={Folder} title="No documents found" description="Try adjusting filters or upload new documents to get started." />
          ) : view === "list" ? (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr><th className="text-left px-4 py-2.5 font-semibold">Name</th><th className="text-left px-4 py-2.5 font-semibold">Category</th><th className="text-left px-4 py-2.5 font-semibold">Asset</th><th className="text-left px-4 py-2.5 font-semibold">Version</th><th className="text-left px-4 py-2.5 font-semibold">Updated</th><th /></tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const I = ICONS[d.type];
                  return (
                    <tr key={d.id} onClick={()=>setSelected(d)} className="border-t border-border hover:bg-muted/40 cursor-pointer">
                      <td className="px-4 py-2.5 flex items-center gap-2.5"><I className="h-4 w-4 text-accent shrink-0" /><span className="truncate">{d.name}</span>{d.starred && <Star className="h-3 w-3 fill-warning text-warning" />}</td>
                      <td className="px-4 py-2.5"><span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{d.category}</span></td>
                      <td className="px-4 py-2.5 text-muted-foreground">{d.asset}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{d.version}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{d.updated}</td>
                      <td className="px-4 py-2.5"><button className="grid h-7 w-7 place-items-center rounded hover:bg-muted"><MoreVertical className="h-3.5 w-3.5" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((d) => {
                const I = ICONS[d.type];
                return (
                  <div key={d.id} onClick={()=>setSelected(d)} className="rounded-xl border border-border p-4 hover:border-accent cursor-pointer transition">
                    <div className="flex items-start justify-between">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent"><I className="h-5 w-5" /></div>
                      {d.starred && <Star className="h-4 w-4 fill-warning text-warning" />}
                    </div>
                    <div className="mt-3 font-semibold text-sm truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{d.category} · {d.updated}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Details panel */}
        <aside className="rounded-2xl border border-border bg-card p-5 h-fit sticky top-20">
          {selected ? (
            <>
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent/10 text-accent">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{selected.name}</div>
                  <div className="text-xs text-muted-foreground">{(selected.size/1024/1024).toFixed(2)} MB · {selected.version}</div>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <Field label="Category" value={selected.category} />
                <Field label="Equipment" value={selected.asset} />
                <Field label="Last Updated" value={selected.updated} />
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {selected.tags.map((t)=><span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px]"><Tag className="inline h-2.5 w-2.5 mr-0.5" />{t}</span>)}
                  </div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => handlePreview(selected)}><Eye className="mr-1.5 h-3.5 w-3.5" /> Preview</Button>
                <Button variant="outline" size="sm" onClick={() => handleDownload(selected)}><Download className="mr-1.5 h-3.5 w-3.5" /> Download</Button>
                <Button variant="outline" size="sm" disabled title="Version history coming soon"><History className="mr-1.5 h-3.5 w-3.5" /> Versions</Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(selected)}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete</Button>
              </div>
            </>
          ) : (
            <EmptyState icon={Filter} title="Select a document" description="Pick a document to see details, version history and equipment mapping." />
          )}
        </aside>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right">{value}</span>
    </div>
  );
}