import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bot, Send, Mic, Plus, MessageSquare, Copy, RefreshCw, ThumbsUp, ThumbsDown,
  Paperclip, Sparkles, Volume2, Download, Search,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { aiService } from "@/services/api";

export const Route = createFileRoute("/app/copilot")({
  head: () => ({ meta: [{ title: "AI Copilot — IntelliPlant AI" }] }),
  component: Copilot,
});

type Msg = { id: string; role: "user" | "ai"; text: string; loading?: boolean };
type Conv = { id: string; title: string; ts: number; messages: Msg[] };

const SUGGESTIONS = [
  "Why did Pump P-401 fail last month?",
  "Summarize ISO 9001 audit findings",
  "Recommend lubrication interval for compressors",
  "What SOPs apply to reactor start-up?",
];

function Copilot() {
  const [convs, setConvs] = useState<Conv[]>([{ id: "c1", title: "New chat", ts: Date.now(), messages: [] }]);
  const [activeId, setActiveId] = useState("c1");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = convs.find((c) => c.id === activeId)!;

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text };
    const aiMsg: Msg = { id: crypto.randomUUID(), role: "ai", text: "", loading: true };
    setConvs((cs) => cs.map((c) => c.id === activeId ? { ...c, title: c.messages.length===0 ? text.slice(0,40) : c.title, messages: [...c.messages, userMsg, aiMsg] } : c));
    setInput(""); setBusy(true);
    const res = await aiService.ask(text);
    setConvs((cs) => cs.map((c) => c.id === activeId ? {
      ...c, messages: c.messages.map((m) => m.id === aiMsg.id ? { ...m, loading: false, text: res.answer } : m),
    } : c));
    setBusy(false);
    setTimeout(() => scrollRef.current?.scrollTo({ top: 1e6, behavior: "smooth" }), 100);
  };

  const newChat = () => {
    const id = crypto.randomUUID();
    setConvs((cs) => [{ id, title: "New chat", ts: Date.now(), messages: [] }, ...cs]);
    setActiveId(id);
  };

  const filtered = convs.filter((c) => c.title.toLowerCase().includes(searchQ.toLowerCase()));

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr] h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-3 border-b border-border">
          <Button onClick={newChat} className="w-full btn-hero"><Plus className="mr-2 h-4 w-4" /> New chat</Button>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input value={searchQ} onChange={(e)=>setSearchQ(e.target.value)}
              placeholder="Search chats" className="h-8 w-full rounded-lg bg-muted/40 pl-8 pr-2 text-xs outline-none focus:bg-background" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${c.id===activeId ? "bg-accent/10 text-accent" : "hover:bg-muted"}`}>
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{c.title}</span>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-border">
          <select className="w-full h-8 rounded-lg bg-muted/40 px-2 text-xs">
            <option>English</option><option>हिन्दी</option><option>मराठी</option><option>ગુજરાતી</option>
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
            <div className="text-[11px] text-muted-foreground">Grounded on 12,842 documents</div>
          </div>
          <button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted"><Download className="h-4 w-4" /></button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {active.messages.length === 0 ? (
            <div className="h-full grid place-items-center">
              <div className="text-center max-w-md">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-cyan/20 to-emerald/20 text-accent mb-4">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-bold">How can I help you today?</h3>
                <p className="mt-1 text-sm text-muted-foreground">Ask about equipment, SOPs, incidents or compliance.</p>
                <div className="mt-5 grid gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)}
                      className="text-left rounded-xl border border-border px-3.5 py-2.5 text-sm hover:border-accent hover:bg-accent/5 transition">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <AnimatePresence>
              {active.messages.map((m) => <Bubble key={m.id} msg={m} onRegen={() => send(active.messages.at(-2)?.text ?? "")} />)}
            </AnimatePresence>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3">
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2">
            <button type="button" className="grid h-10 w-10 place-items-center rounded-xl border border-border hover:bg-muted"><Paperclip className="h-4 w-4" /></button>
            <div className="flex-1 rounded-xl border border-border bg-background px-3 py-2 flex items-center gap-2">
              <input value={input} onChange={(e)=>setInput(e.target.value)}
                placeholder="Ask about equipment, SOPs, incidents…"
                className="flex-1 bg-transparent text-sm outline-none py-1" disabled={busy} />
              <button type="button" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted"><Mic className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <Button type="submit" disabled={!input.trim() || busy} className="h-10 btn-hero"><Send className="h-4 w-4" /></Button>
          </form>
          <p className="mt-2 text-[10px] text-muted-foreground text-center italic">
            AI-generated responses may contain inaccuracies. Always verify recommendations using approved engineering procedures and official documentation before taking operational or safety-critical actions.
          </p>
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg, onRegen }: { msg: Msg; onRegen: () => void }) {
  const isUser = msg.role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser ? "bg-gradient-to-br from-navy to-steel text-white rounded-br-md" :
        "bg-muted/50 rounded-bl-md"
      }`}>
        {msg.loading ? (
          <div className="flex gap-1">
            {[0,1,2].map((i)=><span key={i} className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i*100}ms` }} />)}
          </div>
        ) : (
          <>
            <div>{msg.text}</div>
            {!isUser && (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-emerald font-semibold border border-emerald/20">Confidence 92%</span>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent font-semibold border border-accent/20">3 sources</span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-muted-foreground">
                  <IconBtn i={Copy} /><IconBtn i={RefreshCw} onClick={onRegen} /><IconBtn i={ThumbsUp} /><IconBtn i={ThumbsDown} /><IconBtn i={Volume2} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

function IconBtn({ i: I, onClick }: { i: React.ComponentType<{ className?: string }>; onClick?: () => void }) {
  return <button onClick={onClick} className="grid h-6 w-6 place-items-center rounded hover:bg-background transition"><I className="h-3 w-3" /></button>;
}
