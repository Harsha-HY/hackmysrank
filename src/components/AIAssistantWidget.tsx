import { useEffect, useMemo, useRef, useState } from "react";
import { Zap, Send, X, Minus, History, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { Loader2 } from "@/components/BrandLoader";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

type AgentMode =
  | "owner"
  | "superadmin"
  | "hr"
  | "manager"
  | "candidate";

interface Props {
  /** Caller's actual role. Server re-verifies; we never trust this alone. */
  mode: AgentMode;
  suggestions?: string[];
}

const AGENT_META: Record<
  AgentMode,
  { title: string; subtitle: string; threadTitle: string; suggestions: string[] }
> = {
  owner: {
    title: "Owner Platform AI",
    subtitle: "Cross-company governance & growth",
    threadTitle: "Owner Platform AI",
    suggestions: [
      "How many companies are active this month?",
      "Top performing companies by hires",
      "Show platform-wide funnel health",
      "Where are credits being spent?",
    ],
  },
  superadmin: {
    title: "Admin Console AI",
    subtitle: "Company-wide compliance & ops",
    threadTitle: "Admin Console AI",
    suggestions: [
      "Show all HR users and their hiring counts",
      "List jobs without an assigned manager",
      "Recent test violations across the company",
      "Compliance issues to review this week",
    ],
  },
  hr: {
    title: "HR Recruiter AI",
    subtitle: "Your pipeline, your candidates",
    threadTitle: "HR Recruiter AI",
    suggestions: [
      "Show top 5 candidates across all jobs",
      "List upcoming interviews this week",
      "What should I do next with <candidate name>?",
      "Show offers sent but not accepted",
      "Schedule HR round for <name> tomorrow 3pm",
    ],
  },
  manager: {
    title: "Hiring Manager AI",
    subtitle: "Your roles, your shortlist",
    threadTitle: "Hiring Manager AI",
    suggestions: [
      "Top candidates for my open roles",
      "Who's stuck in technical round?",
      "Draft scorecard feedback for <name>",
      "Which interviews need my decision?",
    ],
  },
  candidate: {
    title: "Career Coach",
    subtitle: "Personal interview & profile help",
    threadTitle: "Career Coach",
    suggestions: [
      "What should I study for the aptitude test?",
      "How can I improve my profile?",
      "Rewrite my professional bio",
      "How do I prepare for the group discussion?",
    ],
  },
};

interface ThreadRow {
  id: string;
  title: string;
  updated_at: string;
}

export default function AIAssistantWidget({ mode, suggestions }: Props) {
  const meta = AGENT_META[mode];
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<ThreadRow[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const SIZE_KEY = `hz_ai_widget_size_${mode}`;
  const [size, setSize] = useState<{ w: number; h: number }>(() => {
    if (typeof window === "undefined") return { w: 380, h: 560 };
    try {
      const raw = localStorage.getItem(SIZE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { w: 380, h: 560 };
  });
  useEffect(() => {
    try { localStorage.setItem(SIZE_KEY, JSON.stringify(size)); } catch {}
  }, [size, SIZE_KEY]);
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = size.w;
    const startH = size.h;
    const onMove = (ev: PointerEvent) => {
      const dx = startX - ev.clientX;
      const dy = startY - ev.clientY;
      const nw = Math.min(Math.max(320, startW + dx), Math.min(window.innerWidth - 24, 900));
      const nh = Math.min(Math.max(420, startH + dy), Math.min(window.innerHeight - 24, 900));
      setSize({ w: nw, h: nh });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tips = useMemo(
    () => suggestions ?? meta.suggestions,
    [suggestions, meta.suggestions]
  );

  const loadThreadMessages = async (tid: string) => {
    const { data: msgs } = await supabase
      .from("ai_chat_messages")
      .select("id, role, content, created_at")
      .eq("thread_id", tid)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((msgs as Message[]) || []);
  };

  const refreshHistory = async (uid: string) => {
    const { data } = await supabase
      .from("ai_chat_threads")
      .select("id, title, updated_at")
      .eq("candidate_id", uid)
      .eq("title", meta.threadTitle)
      .order("updated_at", { ascending: false })
      .limit(20);
    setHistory((data as ThreadRow[]) || []);
  };

  // Bootstrap on open: resolve user + most-recent thread for this role
  useEffect(() => {
    if (!open || threadId) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: u } = await supabase
        .from("users")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!u) return;
      setUserId(u.id);
      const { data: existing } = await supabase
        .from("ai_chat_threads")
        .select("id")
        .eq("candidate_id", u.id)
        .eq("title", meta.threadTitle)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      let tid = existing?.id;
      if (!tid) {
        const { data: created, error } = await supabase
          .from("ai_chat_threads")
          .insert({ candidate_id: u.id, job_id: null, title: meta.threadTitle })
          .select("id")
          .single();
        if (error) { toast({ title: "Chat unavailable", description: error.message, variant: "destructive" }); return; }
        tid = created.id;
      }
      setThreadId(tid);
      await loadThreadMessages(tid);
      await refreshHistory(u.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, threadId, mode]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open, minimized]);

  const startNewChat = async () => {
    if (!userId) return;
    const { data: created, error } = await supabase
      .from("ai_chat_threads")
      .insert({ candidate_id: userId, job_id: null, title: meta.threadTitle })
      .select("id")
      .single();
    if (error) { toast({ title: "Could not start new chat", description: error.message, variant: "destructive" }); return; }
    setThreadId(created.id);
    setMessages([]);
    await refreshHistory(userId);
  };

  const switchThread = async (tid: string) => {
    setThreadId(tid);
    await loadThreadMessages(tid);
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || !threadId || sending) return;
    setSending(true);
    setInput("");
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("ai-assistant-chat", {
        body: { thread_id: threadId, message: text, mode },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      const reply = (data as any)?.reply || "(no reply)";
      setMessages((m) => [
        ...m,
        { id: `as-${Date.now()}`, role: "assistant", content: reply, created_at: new Date().toISOString() },
      ]);
      if (userId) refreshHistory(userId);
    } catch (e: any) {
      toast({ title: "AI error", description: e.message || "Could not reach AI", variant: "destructive" });
      setMessages((m) => m.filter((mm) => mm.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <>
      <AnimatePresence>
        {(!open || minimized) && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setOpen(true); setMinimized(false); }}
            aria-label={`Open ${meta.title}`}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 flex items-center justify-center ring-2 ring-primary/40"
          >
            <Zap className="h-6 w-6 fill-primary-foreground" />
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-background animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && !minimized && (
          <motion.div
            key="panel"
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 220 }}
            className="fixed z-50 flex flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-2xl shadow-primary/10
              inset-0 rounded-none
              sm:inset-auto sm:bottom-6 sm:right-6 sm:rounded-2xl sm:max-h-[92vh] sm:max-w-[96vw]"
            style={
              typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches
                ? { width: size.w, height: size.h }
                : undefined
            }
          >
            <div
              onPointerDown={startResize}
              className="hidden sm:block absolute top-0 left-0 h-4 w-4 cursor-nwse-resize z-10"
              title="Drag to resize"
              aria-label="Resize chat"
            >
              <div className="absolute top-1 left-1 h-2 w-2 border-l-2 border-t-2 border-muted-foreground/60 rounded-tl" />
            </div>

            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/60 backdrop-blur">
              <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary fill-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight truncate">
                  {meta.title}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{meta.subtitle}</p>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    aria-label="History"
                    className="h-7 w-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                    title="Conversation history"
                  >
                    <History className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-2">
                  <div className="flex items-center justify-between px-2 py-1">
                    <p className="text-xs font-semibold">{meta.title} history</p>
                    <button
                      onClick={startNewChat}
                      className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      <Plus className="h-3 w-3" /> New
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto mt-1">
                    {history.length === 0 && (
                      <p className="text-[11px] text-muted-foreground px-2 py-3">No past chats yet.</p>
                    )}
                    {history.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => switchThread(h.id)}
                        className={`w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-secondary flex items-center justify-between gap-2 ${
                          h.id === threadId ? "bg-secondary" : ""
                        }`}
                      >
                        <span className="truncate">{h.title}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{fmtDate(h.updated_at)}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <button
                onClick={() => setMinimized(true)}
                aria-label="Minimize"
                className="h-7 w-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="h-7 w-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
              {messages.length === 0 && !sending && (
                <div className="flex flex-col items-center text-center gap-3 pt-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-primary fill-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground max-w-[260px]">
                    {meta.subtitle}. Only your data — never shared across roles.
                  </p>
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-foreground rounded-bl-sm"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:mt-2 prose-headings:mb-1">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">{fmt(m.created_at)}</span>
                </div>
              ))}

              {sending && (
                <div className="flex items-start">
                  <div className="bg-secondary rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" />
                  </div>
                </div>
              )}
            </div>

            {messages.length === 0 && !sending && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {tips.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-background hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors text-muted-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-border p-2.5 flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder={threadId ? "Ask anything…" : "Connecting…"}
                disabled={!threadId || sending}
                className="flex-1 h-9 text-sm"
              />
              <Button
                onClick={() => send()}
                disabled={!threadId || sending || !input.trim()}
                size="icon"
                className="h-9 w-9 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
                aria-label="Send"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
