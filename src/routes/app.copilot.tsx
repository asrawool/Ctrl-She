import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bot,
  Send,
  Mic,
  Plus,
  MessageSquare,
  Copy,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  Sparkles,
  Volume2,
  Download,
  Search,
  Camera,
  X,
  Loader2,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { aiService } from "@/services/api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/app/copilot")({
  head: () => ({ meta: [{ title: "AI Copilot — IntelliPlant AI" }] }),
  component: Copilot,
});

type Msg = {
  id: string;
  role: "user" | "ai";
  text: string;
  loading?: boolean;
  sources?: {
    documentId: string;
    documentName: string;
    similarity: number;
    page?: number;
    label?: string;
  }[];
  confidence?: number;
  attachments?: {
    name: string;
    path: string;
    size: number;
    type?: string;
  }[];
  rating?: "up" | "down" | null;
};

type Conv = {
  id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
  messages: Msg[];
};

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult:
    | ((e: {
        results: {
          [index: number]: { [index: number]: { transcript: string } };
        };
      }) => void)
    | null;
}

interface DbMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  sources?: Msg["sources"];
  confidence?: number;
  attachments?: Msg["attachments"];
  message_feedback?: { rating: "up" | "down" | null }[];
}

const SUGGESTIONS = [
  "Why did Pump P-401 fail last month?",
  "Summarize ISO 9001 audit findings",
  "Recommend lubrication interval for compressors",
  "What SOPs apply to reactor start-up?",
];

function Copilot() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<Conv | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [groundedCount, setGroundedCount] = useState<number | null>(null);

  // Attachment states
  const [attachments, setAttachments] = useState<
    { name: string; path: string; size: number; type?: string }[]
  >([]);
  const [uploading, setUploading] = useState(false);

  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Speech states
  const [recording, setRecording] = useState(false);
  const [recognition, setRecognition] =
    useState<SpeechRecognitionInstance | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydrate grounded documents count
  const fetchGroundedCount = async () => {
    try {
      const { count } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true });
      setGroundedCount(count);
    } catch (err) {
      console.error("Grounded count load failed:", err);
    }
  };

  // Fetch conversations
  const fetchConvs = useCallback(
    async (queryText?: string) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase
          .from("conversations")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });

        if (queryText?.trim()) {
          const { data: matchedCids } = await supabase
            .from("messages")
            .select("conversation_id")
            .ilike("content", `%${queryText}%`);

          const ids = (matchedCids || []).map((m) => m.conversation_id);

          if (ids.length > 0) {
            query = supabase
              .from("conversations")
              .select("*")
              .eq("user_id", user.id)
              .or(`title.ilike.%${queryText}%,id.in.(${ids.join(",")})`)
              .order("updated_at", { ascending: false });
          } else {
            query = supabase
              .from("conversations")
              .select("*")
              .eq("user_id", user.id)
              .ilike("title", `%${queryText}%`)
              .order("updated_at", { ascending: false });
          }
        }

        const { data } = await query;
        const list = data || [];
        setConvs(list);

        // Default activeId
        if (list.length > 0) {
          if (!activeId || !list.some((c) => c.id === activeId)) {
            setActiveId(list[0].id);
          }
        } else {
          setActiveId(null);
          setActiveConv(null);
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        setLoading(false);
      }
    },
    [activeId],
  );

  // Search debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQ);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQ]);

  useEffect(() => {
    fetchConvs(debouncedSearch);
  }, [debouncedSearch, fetchConvs]);

  // Load active conversation messages
  useEffect(() => {
    async function loadActiveMessages() {
      if (!activeId) {
        setActiveConv(null);
        return;
      }
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: messages } = await supabase
          .from("messages")
          .select("*, message_feedback(rating)")
          .eq("conversation_id", activeId)
          .order("created_at", { ascending: true });

        const dbMsgs = (messages as unknown as DbMessage[]) || [];
        const mappedMsgs: Msg[] = dbMsgs.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.content,
          sources: m.sources,
          confidence: m.confidence,
          attachments: m.attachments,
          rating: m.message_feedback?.[0]?.rating || null,
        }));

        const found = convs.find((c) => c.id === activeId);
        if (found) {
          setActiveConv({
            ...found,
            messages: mappedMsgs,
          });
        }
      } catch (err) {
        console.error("Failed to load active messages:", err);
      }
    }
    loadActiveMessages();
  }, [activeId, convs]);

  // Initial load
  useEffect(() => {
    fetchConvs();
    fetchGroundedCount();

    // Speech recognition setup
    if (typeof window !== "undefined") {
      const SpeechReg =
        (
          window as unknown as {
            SpeechRecognition?: new () => SpeechRecognitionInstance;
            webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
          }
        ).SpeechRecognition ||
        (
          window as unknown as {
            SpeechRecognition?: new () => SpeechRecognitionInstance;
            webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
          }
        ).webkitSpeechRecognition;

      if (SpeechReg) {
        const rec = new SpeechReg();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-US";

        rec.onstart = () => setRecording(true);
        rec.onend = () => setRecording(false);
        rec.onerror = (e: { error: string }) => {
          console.error("SpeechRecognition error:", e);
          toast.error("Voice input error: " + e.error);
          setRecording(false);
        };
        rec.onresult = (e: {
          results: {
            [index: number]: { [index: number]: { transcript: string } };
          };
        }) => {
          const transcript = e.results[0][0].transcript;
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        };
        setRecognition(rec);
      }
    }
  }, [fetchConvs]);

  const handleNewChat = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newC, error } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          title: "New chat",
        })
        .select()
        .single();

      if (error) throw error;

      setConvs((prev) => [newC, ...prev]);
      setActiveId(newC.id);
      toast.success("New chat started!");
    } catch (err) {
      const error = err as Error;
      toast.error("Failed to start new chat: " + error.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in first.");

      for (const file of Array.from(files)) {
        const filePath = `${user.id}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage
          .from("copilot-attachments")
          .upload(filePath, file);

        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from("copilot-attachments").getPublicUrl(filePath);

        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            path: publicUrl,
            size: file.size,
            type: file.type,
          },
        ]);
      }
      toast.success("Files attached successfully!");
    } catch (err) {
      const error = err as Error;
      console.error(error);
      toast.error("Failed to upload attachment: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400 },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not access camera device.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.translate(400, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, 400, 400);
      canvas.toBlob(async (blob) => {
        if (blob) {
          setUploading(true);
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("Please log in first.");

            const filename = `snapshot_${Date.now()}.jpg`;
            const filePath = `${user.id}/${filename}`;

            const { error } = await supabase.storage
              .from("copilot-attachments")
              .upload(filePath, blob, { contentType: "image/jpeg" });

            if (error) throw error;

            const {
              data: { publicUrl },
            } = supabase.storage
              .from("copilot-attachments")
              .getPublicUrl(filePath);

            setAttachments((prev) => [
              ...prev,
              {
                name: filename,
                path: publicUrl,
                size: blob.size,
                type: "image/jpeg",
              },
            ]);
            toast.success("Webcam photo attached!");
          } catch (err) {
            const error = err as Error;
            console.error(error);
            toast.error("Failed to attach camera photo: " + error.message);
          } finally {
            setUploading(false);
          }
        }
      }, "image/jpeg");
      stopCamera();
    }
  };

  const toggleRecording = () => {
    if (!recognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }
    if (recording) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handleFeedback = async (msgId: string, rating: "up" | "down") => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      setActiveConv((prev: Conv | null) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: prev.messages.map((m: Msg) =>
            m.id === msgId
              ? { ...m, rating: m.rating === rating ? null : rating }
              : m,
          ),
        };
      });

      const currentMsg = activeConv?.messages.find((m) => m.id === msgId);
      const isToggleOff = currentMsg?.rating === rating;

      if (isToggleOff) {
        await supabase
          .from("message_feedback")
          .delete()
          .eq("message_id", msgId)
          .eq("user_id", user.id);
        toast.success("Feedback removed");
      } else {
        const { error } = await supabase.from("message_feedback").upsert(
          {
            message_id: msgId,
            user_id: user.id,
            rating: rating,
          },
          { onConflict: "message_id,user_id" },
        );

        if (error) throw error;
        toast.success("Feedback logged");
      }
    } catch (err) {
      const error = err as Error;
      console.error(error);
      toast.error("Failed to submit feedback: " + error.message);
    }
  };

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setBusy(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      let currentCid = activeId;
      let isNew = false;

      // 1. Create conversation if first send
      if (!currentCid) {
        const { data: newC, error: cError } = await supabase
          .from("conversations")
          .insert({
            user_id: user.id,
            title: text.slice(0, 40) || "New chat",
          })
          .select()
          .single();

        if (cError) throw cError;
        currentCid = newC.id;
        isNew = true;
      }

      // 2. Insert User Message
      const userMsgContent = text;
      const currentAttachments = [...attachments];
      setAttachments([]);

      const { data: userMsg, error: userError } = await supabase
        .from("messages")
        .insert({
          conversation_id: currentCid,
          role: "user",
          content: userMsgContent,
          attachments: currentAttachments,
        })
        .select()
        .single();

      if (userError) throw userError;

      // Optimistic updates
      if (isNew) {
        setActiveId(currentCid);
        const { data: listData } = await supabase
          .from("conversations")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });
        setConvs(listData || []);
      } else {
        setActiveConv((prev: Conv | null) =>
          prev
            ? {
                ...prev,
                messages: [
                  ...prev.messages,
                  {
                    id: userMsg.id,
                    role: "user",
                    text: userMsgContent,
                    attachments: currentAttachments,
                  },
                  {
                    id: "temp-ai",
                    role: "ai",
                    text: "",
                    loading: true,
                  },
                ],
              }
            : null,
        );
      }

      setInput("");
      setTimeout(
        () => scrollRef.current?.scrollTo({ top: 1e6, behavior: "smooth" }),
        100,
      );

      // 3. Ask Copilot Function
      const res = await aiService.ask(userMsgContent);

      // 4. Save AI Response
      const { data: aiMsg, error: aiError } = await supabase
        .from("messages")
        .insert({
          conversation_id: currentCid,
          role: "ai",
          content: res.answer,
          sources: res.citations,
          confidence: res.confidence,
        })
        .select()
        .single();

      if (aiError) throw aiError;

      // 5. Update conversation fields
      const isFirst = !isNew && activeConv && activeConv.messages.length === 0;
      if (isNew || isFirst) {
        await supabase
          .from("conversations")
          .update({
            title: userMsgContent.slice(0, 40),
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentCid);
      } else {
        await supabase
          .from("conversations")
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentCid);
      }

      // Re-hydrate list
      const { data: listData } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      setConvs(listData || []);
    } catch (err) {
      const error = err as Error;
      console.error(error);
      toast.error("Failed to fetch response: " + error.message);
    } finally {
      setBusy(false);
      setTimeout(
        () => scrollRef.current?.scrollTo({ top: 1e6, behavior: "smooth" }),
        100,
      );
    }
  };

  const filtered = convs.filter((c) =>
    c.title.toLowerCase().includes(searchQ.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        title="IntelliPlant Copilot"
        description="Interact with the ground-truth knowledge base of all plant manuals, engineering specifications, and historical incident logs."
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr] h-[calc(100vh-8rem)]">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-3 border-b border-border">
            <Button onClick={handleNewChat} className="w-full btn-hero">
              <Plus className="mr-2 h-4 w-4" /> New chat
            </Button>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search chats"
                className="h-8 w-full rounded-lg bg-muted/40 pl-8 pr-2 text-xs outline-none focus:bg-background"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground italic">
                No chats found
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${c.id === activeId ? "bg-accent/10 text-accent" : "hover:bg-muted"}`}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{c.title}</span>
                </button>
              ))
            )}
          </div>
          <div className="p-3 border-t border-border">
            <select className="w-full h-8 rounded-lg bg-muted/40 px-2 text-xs">
              <option>English</option>
              <option>हिन्दी</option>
              <option>मराठी</option>
              <option>ગુજરાતી</option>
            </select>
          </div>
        </aside>

        {/* Chat */}
        <div className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border px-5 py-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-cyan to-emerald text-[#05122a]">
              <Bot className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">IntelliPlant Copilot</div>
              <div className="text-[11px] text-muted-foreground">
                {groundedCount === null ? (
                  <span className="inline-block h-3 w-16 bg-muted animate-pulse rounded" />
                ) : groundedCount === 0 ? (
                  "No documents indexed yet"
                ) : (
                  `Grounded on ${groundedCount.toLocaleString()} documents`
                )}
              </div>
            </div>
            <button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted">
              <Download className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {!activeConv || activeConv.messages.length === 0 ? (
              <div className="h-full grid place-items-center">
                <div className="text-center max-w-md">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-cyan/20 to-emerald/20 text-accent mb-4">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-bold">
                    How can I help you today?
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ask about equipment, SOPs, incidents or compliance.
                  </p>
                  <div className="mt-5 grid gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-left rounded-xl border border-border px-3.5 py-2.5 text-sm hover:border-accent hover:bg-accent/5 transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <AnimatePresence>
                {activeConv.messages.map((m) => (
                  <Bubble
                    key={m.id}
                    msg={m}
                    onRegen={() => send(activeConv.messages.at(-2)?.text ?? "")}
                    onFeedback={(rating) => handleFeedback(m.id, rating)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Input Panel */}
          <div className="border-t border-border p-3">
            {/* Upload Attachment Chips */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-muted/20 border border-border rounded-xl mb-2">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 rounded-lg bg-accent/10 border border-accent/20 px-2.5 py-1 text-xs text-accent"
                  >
                    <Paperclip className="h-3 w-3 animate-pulse" />
                    <span className="max-w-[120px] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                      className="hover:text-foreground text-accent/60"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2"
            >
              {/* Paperclip Attach Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="grid h-10 w-10 place-items-center rounded-xl border border-border hover:bg-muted relative"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </button>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Camera Button */}
              <button
                type="button"
                onClick={startCamera}
                className="grid h-10 w-10 place-items-center rounded-xl border border-border hover:bg-muted"
              >
                <Camera className="h-4 w-4" />
              </button>

              <div className="flex-1 rounded-xl border border-border bg-background px-3 py-2 flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about equipment, SOPs, incidents…"
                  className="flex-1 bg-transparent text-sm outline-none py-1"
                  disabled={busy}
                />

                {/* Mic Speech Button */}
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-muted relative ${recording ? "bg-red-500/10" : ""}`}
                >
                  <Mic
                    className={`h-4 w-4 ${recording ? "text-red-500 animate-pulse" : "text-muted-foreground"}`}
                  />
                  {recording && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  )}
                </button>
              </div>

              <Button
                type="submit"
                disabled={!input.trim() || busy || uploading}
                className="h-10 btn-hero"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="mt-2 text-[10px] text-muted-foreground text-center italic">
              AI-generated responses may contain inaccuracies. Always verify
              recommendations using approved engineering procedures and official
              documentation before taking operational or safety-critical
              actions.
            </p>
          </div>
        </div>
      </div>

      {/* Camera modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={stopCamera}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold text-center">
              Capture Snapshot
            </h3>
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-border bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover transform -scale-x-100"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="w-full" onClick={stopCamera}>
                Cancel
              </Button>
              <Button className="btn-hero w-full" onClick={capturePhoto}>
                Capture
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({
  msg,
  onRegen,
  onFeedback,
}: {
  msg: Msg;
  onRegen: () => void;
  onFeedback: (rating: "up" | "down") => void;
}) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-gradient-to-br from-navy to-steel text-white rounded-br-md"
            : "bg-muted/50 rounded-bl-md"
        }`}
      >
        {msg.loading ? (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="whitespace-pre-line">{msg.text}</div>

            {/* Bubble Attachment List */}
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
                {msg.attachments.map((file, idx) => {
                  const isImage =
                    file.type?.startsWith("image/") ||
                    file.name.match(/\.(png|jpe?g|gif|webp)$/i);
                  return (
                    <a
                      key={idx}
                      href={file.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl bg-background/50 border border-border/60 hover:border-accent p-2 text-xs transition"
                    >
                      {isImage ? (
                        <img
                          src={file.path}
                          alt={file.name}
                          className="h-6 w-6 rounded object-cover"
                        />
                      ) : (
                        <FileText className="h-4 w-4 text-accent" />
                      )}
                      <span className="max-w-[150px] truncate text-[11px] font-medium text-foreground">
                        {file.name}
                      </span>
                    </a>
                  );
                })}
              </div>
            )}

            {!isUser && (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-emerald font-semibold border border-emerald/20">
                    Confidence {Math.round((msg.confidence || 0.92) * 100)}%
                  </span>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent font-semibold border border-accent/20">
                    {msg.sources?.length || 0}{" "}
                    {(msg.sources?.length || 0) === 1 ? "source" : "sources"}
                  </span>
                </div>

                {/* Citations Badge Info */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1 border-t border-border/20 pt-2 text-[10px] text-muted-foreground">
                    {msg.sources.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <span className="font-bold text-accent">
                          [{idx + 1}]
                        </span>
                        <span className="truncate">
                          {s.label || s.documentName}
                        </span>
                        {s.page && (
                          <span className="shrink-0 text-[9px]">
                            (Page {s.page})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-center gap-1 text-muted-foreground">
                  <IconBtn
                    i={Copy}
                    onClick={() => {
                      navigator.clipboard.writeText(msg.text);
                      toast.success("Response copied to clipboard");
                    }}
                  />
                  <IconBtn i={RefreshCw} onClick={onRegen} />
                  <IconBtn
                    i={ThumbsUp}
                    active={msg.rating === "up"}
                    onClick={() => onFeedback("up")}
                  />
                  <IconBtn
                    i={ThumbsDown}
                    active={msg.rating === "down"}
                    onClick={() => onFeedback("down")}
                  />
                  <IconBtn i={Volume2} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

function IconBtn({
  i: I,
  active,
  onClick,
}: {
  i: React.ComponentType<{ className?: string }>;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`grid h-6 w-6 place-items-center rounded hover:bg-background transition ${active ? "text-accent bg-accent/10" : ""}`}
    >
      <I className="h-3 w-3" />
    </button>
  );
}
