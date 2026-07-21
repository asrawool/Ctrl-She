import { supabase } from "@/lib/supabase";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileImage,
  Folder,
  Search,
  Filter,
  Grid3x3,
  List,
  Star,
  MoreVertical,
  Download,
  Trash2,
  Tag,
  Eye,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/store/auth";
import { hasPermission, getActionRequiredRolesLabel } from "@/services/rbac";

import { z } from "zod";

const documentSearchSchema = z.object({
  category: z.string().optional(),
});

export const Route = createFileRoute("/app/documents")({
  validateSearch: (search) => documentSearchSchema.parse(search),
  head: () => ({ meta: [{ title: "Documents — SynapseAi" }] }),
  component: Documents,
});

// Matches the `status` column values written by the process-document edge
// function ("pending" is our own placeholder for "never processed" / null).
type ProcessingStatus = "pending" | "processing" | "ready" | "error";

interface Doc {
  id: string;
  name: string;
  type: string;
  size: number;
  category: string;
  tags: string[];
  asset: string;
  version: string;
  updated: string;
  rawUploadedAt?: string;
  starred?: boolean;
  storagePath?: string;
  processingStatus?: ProcessingStatus;
  chunkCount?: number;
  errorMessage?: string | null;
  source?: string;
}

// process-document responds immediately with { status: "processing" } and
// finishes the real work in the background (EdgeRuntime.waitUntil), so we
// poll the documents row (and count its chunks) until it leaves
// "processing", rather than trusting the invoke response.
async function pollDocumentStatus(
  documentId: string,
  {
    intervalMs = 2000,
    timeoutMs = 60000,
  }: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<{
  status: ProcessingStatus;
  chunkCount: number;
  errorMessage: string | null;
}> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { data: row, error } = await supabase
      .from("documents")
      .select("status, error_message")
      .eq("id", documentId)
      .single();

    if (error) throw error;

    const status = (row?.status as ProcessingStatus) ?? "pending";
    if (status === "ready" || status === "error") {
      const { count } = await supabase
        .from("document_chunks")
        .select("*", { count: "exact", head: true })
        .eq("document_id", documentId);

      return {
        status,
        chunkCount: count ?? 0,
        errorMessage: row?.error_message ?? null,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Timed out waiting for document ${documentId} to finish processing`,
  );
}

const SEED: Doc[] = [
  {
    id: "1",
    name: "KSB Pump P-401 Manual.pdf",
    type: "pdf",
    size: 2400000,
    category: "Manuals",
    tags: ["Pump", "OEM"],
    asset: "P-401",
    version: "v2.3",
    updated: "2d ago",
    starred: true,
  },
  {
    id: "2",
    name: "ISO 9001 Audit Checklist.xlsx",
    type: "xlsx",
    size: 180000,
    category: "Audits",
    tags: ["ISO", "Quality"],
    asset: "Plant Alpha",
    version: "v1.0",
    updated: "1w ago",
  },
  {
    id: "3",
    name: "Reactor R-3 Start-up SOP.docx",
    type: "docx",
    size: 340000,
    category: "SOPs",
    tags: ["Reactor", "Procedure"],
    asset: "R-3",
    version: "v4.1",
    updated: "3d ago",
  },
  {
    id: "4",
    name: "P&ID Boiler B-12.pdf",
    type: "pdf",
    size: 5200000,
    category: "Drawings",
    tags: ["P&ID", "Boiler"],
    asset: "B-12",
    version: "v1.2",
    updated: "2w ago",
  },
  {
    id: "5",
    name: "Incident IR-2024-118.pdf",
    type: "pdf",
    size: 900000,
    category: "Incidents",
    tags: ["RCA", "Bearing"],
    asset: "P-401",
    version: "v1.0",
    updated: "4d ago",
    starred: true,
  },
  {
    id: "6",
    name: "Vibration Trend Compressor C-12.xlsx",
    type: "xlsx",
    size: 220000,
    category: "Data",
    tags: ["Vibration", "Trend"],
    asset: "C-12",
    version: "v3.4",
    updated: "6h ago",
  },
];

const ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  webp: FileImage,
};

function getFileType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "file";
  if (
    [
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "csv",
      "png",
      "jpg",
      "jpeg",
      "webp",
    ].includes(ext)
  ) {
    return ext;
  }
  return ext;
}

function getFileLabel(fileName: string): string {
  return fileName.split(".").pop()?.toUpperCase() || "FILE";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = 2;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
const CATEGORIES = [
  "All",
  "Technical Manuals",
  "Standard Operating Procedures (SOPs)",
  "Engineering Drawings",
  "Maintenance Records",
  "Inspection Reports",
  "Audit & Compliance",
  "Incident & Root Cause Reports",
  "Training & Safety",
  "Process & Operational Data",
  "Policies & Standards",
  "Best Practices & Lessons Learned",
];

const DOCUMENTS_BUCKET = "copilot-attachments";

// crypto.randomUUID() only works in secure contexts (HTTPS or localhost).
// This fallback works everywhere, including LAN IPs / plain HTTP dev servers.
function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function Documents() {
  const { role } = useAuth();
  const canManageDocs = hasPermission(role, "manage:documents");

  const { category: initialCategory } = Route.useSearch();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [view, setView] = useState<"grid" | "list">("list");
  const [cat, setCat] = useState(initialCategory || "All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"updated" | "name" | "size">("updated");
  const [selected, setSelected] = useState<Doc | null>(null);
  const [uploads, setUploads] = useState<{ name: string; pct: number }[]>([]);
  const [drag, setDrag] = useState(false);
  const [reprocessing, setReprocessing] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  // States for upload metadata and editing
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadMeta, setUploadMeta] = useState({
    category: "Auto Detect",
    asset: "",
    version: "v1.0",
    source: "",
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);

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
      const type = getFileType(row.name);

      return {
        id: row.id,
        name: row.name,
        type,
        size: row.size ?? 0,
        category: row.category ?? "Manuals",
        tags: row.tags ?? [],
        asset: row.asset ?? "—",
        version: row.version ?? "v1.0",
        updated: row.uploaded_at
          ? new Date(row.uploaded_at).toLocaleDateString()
          : "—",
        rawUploadedAt: row.uploaded_at || undefined,
        storagePath: row.storage_path,
        processingStatus: (row.status as ProcessingStatus) ?? "pending",
        errorMessage: row.error_message ?? null,
        chunkCount: undefined,
        source: row.source ?? "—",
      };
    });

    setDocs(fetched);

    // Backfill chunk counts for anything that's already marked ready, so
    // the badges don't all read "0 chunks" until the user reprocesses.
    const readyIds = fetched
      .filter((d) => d.processingStatus === "ready")
      .map((d) => d.id);
    for (const id of readyIds) {
      const { count } = await supabase
        .from("document_chunks")
        .select("*", { count: "exact", head: true })
        .eq("document_id", id);
      setDocs((d) =>
        d.map((x) => (x.id === id ? { ...x, chunkCount: count ?? 0 } : x)),
      );
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleReprocess = async (doc: Doc) => {
    setReprocessing((r) => ({ ...r, [doc.id]: true }));
    setDocs((d) =>
      d.map((x) =>
        x.id === doc.id ? { ...x, processingStatus: "processing" } : x,
      ),
    );

    try {
      const { error: invokeError } = await supabase.functions.invoke(
        "process-document",
        {
          body: { documentId: doc.id },
        },
      );

      if (invokeError) {
        console.error("Reprocess failed to start:", invokeError);
        setDocs((d) =>
          d.map((x) =>
            x.id === doc.id ? { ...x, processingStatus: "error" } : x,
          ),
        );
        return;
      }

      // The function kicks off processing in the background and returns
      // immediately, so we poll the row until it settles.
      const { status, chunkCount, errorMessage } = await pollDocumentStatus(
        doc.id,
      );

      setDocs((d) =>
        d.map((x) =>
          x.id === doc.id
            ? { ...x, processingStatus: status, chunkCount, errorMessage }
            : x,
        ),
      );
      setSelected((s) =>
        s?.id === doc.id
          ? { ...s, processingStatus: status, chunkCount, errorMessage }
          : s,
      );
    } catch (err) {
      console.error("Unexpected reprocess error:", err);
      setDocs((d) =>
        d.map((x) =>
          x.id === doc.id ? { ...x, processingStatus: "error" } : x,
        ),
      );
    } finally {
      setReprocessing((r) => ({ ...r, [doc.id]: false }));
    }
  };

  const filtered = docs
    .filter((d) => cat === "All" || d.category === cat)
    .filter((d) => d.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      if (sort === "size") {
        return b.size - a.size;
      }
      if (sort === "name") {
        return a.name.localeCompare(b.name);
      }
      // sort === "updated" (default): category priority grouping, then date descending
      const getCategoryIndex = (category: string) => {
        const idx = CATEGORIES.indexOf(category);
        return idx <= 0 ? CATEGORIES.length : idx;
      };
      const aCatIdx = getCategoryIndex(a.category);
      const bCatIdx = getCategoryIndex(b.category);
      if (aCatIdx !== bCatIdx) {
        return aCatIdx - bCatIdx;
      }
      const aTime = a.rawUploadedAt ? new Date(a.rawUploadedAt).getTime() : 0;
      const bTime = b.rawUploadedAt ? new Date(b.rawUploadedAt).getTime() : 0;
      return bTime - aTime;
    });

  const handleUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPendingFiles(Array.from(files));
    setUploadMeta({
      category: "Auto Detect",
      asset: "",
      version: "v1.0",
      source: "",
    });
    setShowUploadModal(true);
  };

  const startUpload = async () => {
    setShowUploadModal(false);
    const filesToUpload = [...pendingFiles];
    setPendingFiles([]);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be signed in to upload documents.");
      return;
    }

    for (const file of filesToUpload) {
      // Keep uploads within the application's supported file-size limit.
      if (file.size > 50 * 1024 * 1024) {
        toast.error(
          `File "${file.name}" exceeds the 50MB maximum upload limit.`,
        );
        continue;
      }

      const item = { name: file.name, pct: 0 };
      setUploads((u) => [...u, item]);

      // Progress animation
      const interval = setInterval(() => {
        setUploads((u) =>
          u.map((it) =>
            it.name === file.name
              ? { ...it, pct: Math.min(90, it.pct + 10) }
              : it,
          ),
        );
      }, 200);

      try {
        const filePath = `${user.id}/${generateId()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from(DOCUMENTS_BUCKET)
          .upload(filePath, file);

        if (uploadError) {
          console.error("Storage upload failed:", uploadError);
          toast.error(`Upload failed for ${file.name}: ${uploadError.message}`);
          continue;
        }

        const { data: document, error: dbError } = await supabase
          .from("documents")
          .insert({
            name: file.name,
            storage_path: filePath,
            size: file.size,
            category: uploadMeta.category,
            asset: uploadMeta.asset || "—",
            version: uploadMeta.version || "v1.0",
            source: uploadMeta.source || "—",
            user_id: user?.id || null,
          })
          .select()
          .single();

        if (dbError) {
          console.error("DB insert failed:", dbError);
          toast.error(`Failed to save document metadata for ${file.name}`);
          continue;
        }

        const type = getFileType(file.name);

        setDocs((d) => [
          {
            id: document.id,
            name: file.name,
            type,
            size: file.size,
            category: uploadMeta.category,
            tags: ["New"],
            asset: uploadMeta.asset || "—",
            version: uploadMeta.version || "v1.0",
            updated: "just now",
            storagePath: filePath,
            processingStatus: "processing",
            chunkCount: 0,
            source: uploadMeta.source || "—",
          },
          ...d,
        ]);

        console.log("Kicking off processing for:", document.id);
        supabase.functions
          .invoke("process-document", { body: { documentId: document.id } })
          .then(async ({ error: invokeError }) => {
            if (invokeError) {
              console.error(
                "Document processing failed to start:",
                invokeError,
              );
              setDocs((d) =>
                d.map((x) =>
                  x.id === document.id
                    ? { ...x, processingStatus: "error" }
                    : x,
                ),
              );
              return;
            }

            try {
              const { status, chunkCount, errorMessage } =
                await pollDocumentStatus(document.id);
              setDocs((d) =>
                d.map((x) =>
                  x.id === document.id
                    ? {
                        ...x,
                        processingStatus: status,
                        chunkCount,
                        errorMessage,
                      }
                    : x,
                ),
              );
            } catch (pollErr) {
              console.error("Timed out waiting for processing:", pollErr);
            }
          });
      } catch (err) {
        console.error("Unexpected upload error:", err);
      } finally {
        clearInterval(interval);
        setUploads((u) => u.filter((it) => it.name !== file.name));
      }
    }
  };

  const getResolvedStoragePath = async (doc: Doc): Promise<{ bucket: string; path: string } | null> => {
    if (!doc.storagePath) return null;

    // 1. Try listing copilot-attachments bucket with storagePath
    const lastSlash = doc.storagePath.lastIndexOf("/");
    const folder = lastSlash !== -1 ? doc.storagePath.substring(0, lastSlash) : "";
    const searchName = lastSlash !== -1 ? doc.storagePath.substring(lastSlash + 1) : doc.storagePath;

    const { data: cData } = await supabase.storage
      .from("copilot-attachments")
      .list(folder, { search: searchName, limit: 1 });
    
    if (cData && cData.some(f => f.name === searchName)) {
      return { bucket: "copilot-attachments", path: doc.storagePath };
    }

    // 2. Try documents bucket with storagePath (stripped of "documents/" prefix if present)
    const stripped = doc.storagePath.startsWith("documents/")
      ? doc.storagePath.replace("documents/", "")
      : doc.storagePath;

    const { data: dData } = await supabase.storage
      .from("documents")
      .list("", { search: stripped, limit: 1 });
    
    if (dData && dData.some(f => f.name === stripped)) {
      return { bucket: "documents", path: stripped };
    }

    // 3. Try listing documents bucket for matching file by name suffix
    const { data: docFiles } = await supabase.storage
      .from("documents")
      .list("", { limit: 1000 });
    const matched = docFiles?.find(
      (f) => f.name.endsWith(`-${doc.name}`) || f.name === doc.name,
    );
    if (matched) {
      return { bucket: "documents", path: matched.name };
    }

    return null;
  };

  const handlePreview = async (doc: Doc) => {
    const previewTab = window.open("", "_blank");
    if (previewTab) {
      previewTab.document.write(`
        <html>
          <head>
            <title>Loading Preview...</title>
            <style>
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #090e1a;
                color: #f8fafc;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
              }
              .spinner {
                border: 3px solid rgba(255,255,255,0.1);
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border-left-color: #06b6d4;
                animation: spin 1s linear infinite;
                margin-bottom: 16px;
              }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="spinner"></div>
            <div>Loading preview for ${doc.name}...</div>
          </body>
        </html>
      `);
    }

    const resolved = await getResolvedStoragePath(doc);
    if (resolved) {
      const { data, error } = await supabase.storage
        .from(resolved.bucket)
        .createSignedUrl(resolved.path, 300);
      
      if (!error && data?.signedUrl) {
        if (previewTab) {
          previewTab.location.href = data.signedUrl;
        }
      } else {
        if (previewTab) {
          previewTab.close();
        }
        toast.error(`Failed to generate preview URL: ${error?.message || "File not found"}`);
      }
    } else {
      if (previewTab) {
        previewTab.close();
      }
      toast.error(`No file available for "${doc.name}"`);
    }
  };

  const handleDownload = async (doc: Doc) => {
    const resolved = await getResolvedStoragePath(doc);
    if (!resolved) {
      toast.error(`No file available for "${doc.name}"`);
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from(resolved.bucket)
        .createSignedUrl(resolved.path, 300, { download: doc.name });
      
      if (error || !data?.signedUrl) {
        toast.error(`Download failed: ${error?.message || "URL generation failed"}`);
        return;
      }

      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      toast.error(`Download failed: ${err.message}`);
    }
  };

  const handleDelete = async (doc: Doc) => {
    if (!confirm(`Delete "${doc.name}"? This can't be undone.`)) return;

    if (doc.storagePath) {
      const { error: storageError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
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

  const handleUpdateMetadata = async () => {
    if (!editingDoc) return;
    const { error } = await supabase
      .from("documents")
      .update({
        name: editingDoc.name,
        category: editingDoc.category,
        asset: editingDoc.asset,
        version: editingDoc.version,
        source: editingDoc.source,
      })
      .eq("id", editingDoc.id);

    if (error) {
      toast.error("Failed to update metadata: " + error.message);
      return;
    }

    setDocs((prev) =>
      prev.map((d) => (d.id === editingDoc.id ? editingDoc : d)),
    );
    setSelected(editingDoc);
    setEditingDoc(null);
    toast.success("Document updated successfully");
  };

  return (
    <>
      <PageHeader
        title="Document Center"
        description="Universal document management with AI extraction, versioning and equipment mapping."
      />
      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        onChange={(e) => handleUpload(e.target.files)}
      />

      {/* Dropzone */}
      <div
        onClick={() => {
          if (!canManageDocs) return;
          fileRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!canManageDocs) return;
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          if (!canManageDocs) return;
          setDrag(false);
          handleUpload(e.dataTransfer.files);
        }}
        title={
          !canManageDocs
            ? `Requires ${getActionRequiredRolesLabel("manage:documents")} role`
            : "Click or drag files here to upload"
        }
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${!canManageDocs ? "opacity-60 cursor-not-allowed border-border bg-muted/20" : drag ? "border-accent bg-accent/5 cursor-pointer" : "border-border bg-muted/20 cursor-pointer"}`}
      >
        <Upload
          className={`mx-auto h-8 w-8 mb-2 ${drag ? "text-accent" : "text-muted-foreground"}`}
        />
        <p className="text-sm font-semibold">
          Drop files here or{" "}
          <span className="text-accent underline">browse</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Any supported file type · up to 50MB
        </p>

        {uploads.length > 0 && (
          <div className="mt-4 space-y-2 text-left max-w-md mx-auto">
            {uploads.map((u) => (
              <div key={u.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="truncate">{u.name}</span>
                  <span className="font-semibold">{u.pct}%</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${u.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search documents…"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as never)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
        >
          <option value="updated">Last updated</option>
          <option value="name">Name</option>
          <option value="size">Size</option>
        </select>
        <div className="ml-auto flex rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setView("list")}
            className={`grid h-10 w-10 place-items-center ${view === "list" ? "bg-accent/10 text-accent" : ""}`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("grid")}
            className={`grid h-10 w-10 place-items-center ${view === "grid" ? "bg-accent/10 text-accent" : ""}`}
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-border bg-card overflow-hidden min-w-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Folder}
              title="No documents found"
              description="Try adjusting filters or upload new documents to get started."
            />
          ) : view === "list" ? (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Name</th>
                    <th className="text-left px-4 py-2.5 font-semibold">
                      Category
                    </th>
                    <th className="text-left px-4 py-2.5 font-semibold">Asset</th>
                    <th className="text-left px-4 py-2.5 font-semibold">
                      Version
                    </th>
                    <th className="text-left px-4 py-2.5 font-semibold">Size</th>
                    <th className="text-left px-4 py-2.5 font-semibold">
                      RAG Index
                    </th>
                    <th className="text-left px-4 py-2.5 font-semibold">
                      Updated
                    </th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => {
                    const I = ICONS[d.type] || FileText;
                    const isReprocessing = !!reprocessing[d.id];
                    return (
                      <tr
                        key={d.id}
                        onClick={() => {
                          setSelected(d);
                          setEditingDoc(null);
                        }}
                        className="border-t border-border hover:bg-muted/40 cursor-pointer"
                      >
                        <td className="px-4 py-2.5 flex items-center gap-2.5 max-w-[240px] min-w-0">
                          <I className="h-4 w-4 text-accent shrink-0" />
                          <span className="truncate flex-1" title={d.name}>
                            {d.name}
                          </span>
                          {d.starred && (
                            <Star className="h-3 w-3 fill-warning text-warning shrink-0" />
                          )}
                        </td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] flex items-center gap-1 w-fit">
                          {d.tags?.includes("Auto-detected") && "✨ "}
                          {d.category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {d.asset}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {d.version}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatBytes(d.size)}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge
                          status={d.processingStatus}
                          chunkCount={d.chunkCount}
                          errorMessage={d.errorMessage}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {d.updated}
                      </td>
                      <td className="px-4 py-2.5">
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            disabled={!canManageDocs || isReprocessing}
                            onClick={() => handleReprocess(d)}
                            title={
                              !canManageDocs
                                ? `Requires ${getActionRequiredRolesLabel("manage:documents")} role`
                                : "Reprocess this document (re-run extraction, OCR fallback and embedding)"
                            }
                            className="grid h-7 w-7 place-items-center rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isReprocessing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button className="grid h-7 w-7 place-items-center rounded hover:bg-muted">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((d) => {
                const I = ICONS[d.type] || FileText;
                const isReprocessing = !!reprocessing[d.id];
                return (
                  <div
                    key={d.id}
                    onClick={() => {
                      setSelected(d);
                      setEditingDoc(null);
                    }}
                    className="rounded-xl border border-border p-4 hover:border-accent cursor-pointer transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent">
                        <I className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-1">
                        {d.starred && (
                          <Star className="h-4 w-4 fill-warning text-warning" />
                        )}
                        <button
                          disabled={!canManageDocs || isReprocessing}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReprocess(d);
                          }}
                          title={
                            !canManageDocs
                              ? `Requires ${getActionRequiredRolesLabel("manage:documents")} role`
                              : "Reprocess this document"
                          }
                          className="grid h-7 w-7 place-items-center rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isReprocessing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 font-semibold text-sm truncate">
                      {d.name}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        {d.tags?.includes("Auto-detected") && "✨ "}
                        {d.category} · {d.updated}
                      </div>
                      <StatusBadge
                        status={d.processingStatus}
                        chunkCount={d.chunkCount}
                        errorMessage={d.errorMessage}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Details panel */}
        <aside className="rounded-2xl border border-border bg-card p-5 h-fit lg:sticky lg:top-20">
          {selected ? (
            editingDoc ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Edit Metadata</h3>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="block text-muted-foreground mb-1">
                      Document Name
                    </label>
                    <input
                      value={editingDoc.name}
                      onChange={(e) =>
                        setEditingDoc({ ...editingDoc, name: e.target.value })
                      }
                      className="w-full h-8 rounded-lg bg-background border border-border px-2 text-xs outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1">
                      Category
                    </label>
                    <select
                      value={editingDoc.category}
                      onChange={(e) =>
                        setEditingDoc({
                          ...editingDoc,
                          category: e.target.value,
                        })
                      }
                      className="w-full h-8 rounded-lg bg-background border border-border px-2 text-xs outline-none focus:border-accent"
                    >
                      <option value="Auto Detect">
                        ✨ Auto Detect (Recommended)
                      </option>
                      {CATEGORIES.filter((c) => c !== "All").map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1">
                      Equipment / Asset Mapping
                    </label>
                    <input
                      value={editingDoc.asset}
                      onChange={(e) =>
                        setEditingDoc({ ...editingDoc, asset: e.target.value })
                      }
                      className="w-full h-8 rounded-lg bg-background border border-border px-2 text-xs outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1">
                      Version
                    </label>
                    <input
                      value={editingDoc.version}
                      onChange={(e) =>
                        setEditingDoc({
                          ...editingDoc,
                          version: e.target.value,
                        })
                      }
                      className="w-full h-8 rounded-lg bg-background border border-border px-2 text-xs outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1">
                      Source / Vendor
                    </label>
                    <input
                      value={editingDoc.source || ""}
                      onChange={(e) =>
                        setEditingDoc({ ...editingDoc, source: e.target.value })
                      }
                      className="w-full h-8 rounded-lg bg-background border border-border px-2 text-xs outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setEditingDoc(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="w-full btn-hero"
                    onClick={handleUpdateMetadata}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent/10 text-accent">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {selected.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(selected.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                      {selected.version}
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <Field
                    label="Category"
                    value={
                      selected.tags?.includes("Auto-detected")
                        ? `✨ Auto-detected: ${selected.category}`
                        : selected.category
                    }
                  />
                  <Field label="Equipment" value={selected.asset} />
                  <Field label="Source" value={selected.source || "—"} />
                  <Field label="Last Updated" value={selected.updated} />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                      RAG Index
                    </span>
                    <StatusBadge
                      status={selected.processingStatus}
                      chunkCount={selected.chunkCount}
                      errorMessage={selected.errorMessage}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selected.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-muted px-2 py-0.5 text-[10px]"
                        >
                          <Tag className="inline h-2.5 w-2.5 mr-0.5" />
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(selected)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(selected)}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canManageDocs || !!reprocessing[selected.id]}
                    onClick={() => handleReprocess(selected)}
                    title={
                      !canManageDocs
                        ? `Requires ${getActionRequiredRolesLabel("manage:documents")} role`
                        : "Re-run text extraction, OCR fallback and embedding for this document"
                    }
                  >
                    {reprocessing[selected.id] ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{" "}
                        Reprocessing…
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reprocess
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canManageDocs}
                    title={
                      !canManageDocs
                        ? `Requires ${getActionRequiredRolesLabel("manage:documents")} role`
                        : undefined
                    }
                    onClick={() => setEditingDoc({ ...selected })}
                  >
                    Edit Metadata
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canManageDocs}
                    title={
                      !canManageDocs
                        ? `Requires ${getActionRequiredRolesLabel("manage:documents")} role`
                        : undefined
                    }
                    className="text-destructive col-span-2 mt-1"
                    onClick={() => handleDelete(selected)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </>
            )
          ) : (
            <EmptyState
              icon={Filter}
              title="Select a document"
              description="Pick a document to see details, version history and equipment mapping."
            />
          )}
        </aside>
      </div>

      {/* Upload Metadata Selector Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold text-center">
              Ingest Document Metadata
            </h3>
            <p className="text-xs text-muted-foreground text-center">
              Configure parameters before starting OCR/extraction and RAG chunk
              indexing.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">
                  Files Selected
                </label>
                <div className="bg-muted/40 p-2 rounded-lg max-h-20 overflow-y-auto font-mono text-[10px] text-accent">
                  {pendingFiles.map((f) => f.name).join(", ")}
                </div>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Category
                </label>
                <select
                  value={uploadMeta.category}
                  onChange={(e) =>
                    setUploadMeta({ ...uploadMeta, category: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 text-xs outline-none focus:border-accent"
                >
                  <option value="Auto Detect">
                    ✨ Auto Detect (Recommended)
                  </option>
                  {CATEGORIES.filter((c) => c !== "All").map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Equipment / Asset ID (Optional)
                </label>
                <input
                  placeholder="e.g. P-401, C-12"
                  value={uploadMeta.asset}
                  onChange={(e) =>
                    setUploadMeta({ ...uploadMeta, asset: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 text-xs outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Version (Optional)
                </label>
                <input
                  placeholder="e.g. v1.0"
                  value={uploadMeta.version}
                  onChange={(e) =>
                    setUploadMeta({ ...uploadMeta, version: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 text-xs outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">
                  Source / Vendor (Optional)
                </label>
                <input
                  placeholder="e.g. Siemens, KSB"
                  value={uploadMeta.source}
                  onChange={(e) =>
                    setUploadMeta({ ...uploadMeta, source: e.target.value })
                  }
                  className="w-full h-8 rounded-lg bg-background border border-border px-2 text-xs outline-none focus:border-accent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </Button>
              <Button className="btn-hero w-full" onClick={startUpload}>
                Start Ingestion
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatusBadge({
  status,
  chunkCount,
  errorMessage,
}: {
  status?: ProcessingStatus;
  chunkCount?: number;
  errorMessage?: string | null;
}) {
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
        <Loader2 className="h-2.5 w-2.5 animate-spin" /> Processing
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive"
        title={errorMessage ?? undefined}
      >
        <AlertCircle className="h-2.5 w-2.5" /> Failed
      </span>
    );
  }
  if (status === "ready" && (chunkCount ?? 0) > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-emerald">
        <CheckCircle2 className="h-2.5 w-2.5" /> {chunkCount} chunks
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
      <AlertCircle className="h-2.5 w-2.5" /> 0 chunks
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
        {label}
      </span>
      <span className="text-xs font-medium text-right">{value}</span>
    </div>
  );
}
