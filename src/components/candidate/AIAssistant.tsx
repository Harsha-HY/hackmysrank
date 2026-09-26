import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Plus, X, Bot, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { Loader2 } from "@/components/BrandLoader";

interface JobOption { id: string; title: string; company?: string }
interface Thread {
  id: string;
  job_id: string | null;
  title: string;
  updated_at: string;
}
interface Message { id: string; role: string; content: string; created_at: string }

interface Props {
  candidateId: string | null;
  jobs: JobOption[];
}

export default function AIAssistant({ candidateId, jobs }: Props) {
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [creatingForJob, setCreatingForJob] = useState<string>("general");
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadThreads = async () => {
    if (!candidateId) return;
    const { data } = await supabase
      .from("ai_chat_threads")
      .select("id, job_id, title, updated_at")
      .eq("candidate_id", candidateId)
      .order("updated_at", { ascending: false });
    setThreads((data as Thread[]) || []);
    if ((data?.length || 0) > 0 && !activeId) setActiveId(data![0].id);
  };

  useEffect(() => { if (open) loadThreads(); /* eslint-disable-next-line */ }, [open, candidateId]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase
        .from("ai_chat_messages")
        .select("id, role, content, created_at")
        .eq("thread_id", activeId)
        .order("created_at", { ascending: true });
      setMessages((data as Message[]) || []);
    })();
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const createThread = async () => {
    if (!candidateId) return;
    const jobId = creatingForJob === "general" ? null : creatingForJob;
    const job = jobs.find((j) => j.id === jobId);
    const title = job ? `About ${job.title}` : "General career chat";
    const { data, error } = await supabase
      .from("ai_chat_threads")
      .insert({ candidate_id: candidateId, job_id: jobId, title })
      .select("id, job_id, title, updated_at")
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setThreads((prev) => [data as Thread, ...prev]);
    setActiveId((data as Thread).id);
    setMessages([]);
  };

  const deleteThread = async (id: string) => {
    await supabase.from("ai_chat_threads").delete().eq("id", id);
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    setInput("");
    const optimistic: Message = { id: `tmp-${Date.now()}`, role: "user", content: text, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("ai-assistant-chat", {
        body: { thread_id: activeId, message: text },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      const reply = (data as any)?.reply || "(no reply)";
      setMessages((m) => [...m, { id: `as-${Date.now()}`, role: "assistant", content: reply, created_at: new Date().toISOString() }]);
    } catch (e: any) {
      toast({ title: "AI error", description: e.message || "Could not get a reply", variant: "destructive" });
      setMessages((m) => m.filter((mm) => mm.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  if (!candidateId) return null;

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open AI Career Coach"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl hover:scale-110 transition-transform flex items-center justify-center"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col gap-0">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">AI Career Coach</h3>
              <p className="text-xs text-muted-foreground">Personalized advice powered by Gemini</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Threads sidebar */}
            <div className="w-56 border-r border-border bg-muted/30 flex flex-col">
              <div className="p-3 border-b border-border space-y-2">
                <Select value={creatingForJob} onValueChange={setCreatingForJob}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General chat</SelectItem>
                    {jobs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={createThread} className="w-full h-8 gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" /> New chat
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {threads.length === 0 && (
                  <p className="text-[11px] text-muted-foreground px-2 py-4 text-center">Start your first chat.</p>
                )}
                {threads.map((t) => (
                  <div key={t.id} className={`group flex items-center gap-1 rounded-lg px-2 py-2 cursor-pointer ${
                    activeId === t.id ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground"
                  }`}>
                    <button onClick={() => setActiveId(t.id)} className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-medium truncate">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(t.updated_at).toLocaleDateString()}</p>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 flex flex-col min-w-0">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
                {!activeId ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
                    <Bot className="h-10 w-10 opacity-40" />
                    <p className="text-sm">Create a chat to get started. Pick a specific job to get tailored answers.</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Try asking:</p>
                    {[
                      "What should I prepare for the technical round?",
                      "How does my profile compare to the job requirements?",
                      "Improve my bio",
                      "What skills am I missing for this role?",
                    ].map((s) => (
                      <button key={s} onClick={() => setInput(s)} className="block w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-secondary text-foreground">
                        {s}
                      </button>
                    ))}
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground"
                      }`}>
                        {m.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-headings:mt-2">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {sending && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-4 py-2.5 bg-secondary flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border p-3 flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={activeId ? "Ask anything…" : "Create a chat first"}
                  disabled={!activeId || sending}
                  className="flex-1"
                />
                <Button onClick={send} disabled={!activeId || sending || !input.trim()} size="icon" className="shrink-0">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
