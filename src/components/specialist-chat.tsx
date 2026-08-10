import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Sparkles,
  Plus,
  Search,
  Pin,
  MessageSquare,
  Bot,
  Trash2,
  Loader2,
  User,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  listConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  listMessages,
  insertMessage,
  type AiConversation,
  type AiMessage,
} from "@/lib/ai-data";
import { streamChat } from "@/lib/ai-stream";
import { capabilityForRoute } from "@/lib/capability-matrix";
import { getModule } from "@/lib/modules";
import { specialistFor } from "@/lib/specialists";

interface Props {
  to: string;
}

export function SpecialistChat({ to }: Props) {
  const mod = getModule(to);
  const spec = specialistFor(to);
  const Icon: LucideIcon = mod?.icon ?? Bot;
  const category = `specialist:${to}`;

  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const convos = useQuery({
    queryKey: ["ai-conversations", category],
    queryFn: () => listConversations(category),
  });
  const messages = useQuery({
    queryKey: ["ai-messages", activeId],
    queryFn: () => (activeId ? listMessages(activeId) : Promise.resolve([] as AiMessage[])),
    enabled: !!activeId,
  });

  useEffect(() => {
    if (!activeId && convos.data && convos.data.length > 0) setActiveId(convos.data[0].id);
  }, [convos.data, activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.data, streaming]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return convos.data ?? [];
    return (convos.data ?? []).filter((c) => c.title.toLowerCase().includes(q));
  }, [convos.data, search]);

  async function handleNew() {
    try {
      const c = await createConversation("New conversation", category);
      await qc.invalidateQueries({ queryKey: ["ai-conversations", category] });
      setActiveId(c.id);
    } catch (e) {
      toast.error("Could not start a new chat", { description: (e as Error).message });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this conversation?")) return;
    try {
      await deleteConversation(id);
      await qc.invalidateQueries({ queryKey: ["ai-conversations", category] });
      if (id === activeId) setActiveId(null);
    } catch (e) {
      toast.error("Delete failed", { description: (e as Error).message });
    }
  }

  async function handleTogglePin(c: AiConversation) {
    try {
      await updateConversation(c.id, { pinned: !c.pinned });
      await qc.invalidateQueries({ queryKey: ["ai-conversations", category] });
    } catch (e) {
      toast.error("Could not update", { description: (e as Error).message });
    }
  }

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    setSending(true);
    setInput("");
    try {
      let convoId = activeId;
      if (!convoId) {
        const c = await createConversation(content.slice(0, 60), category);
        convoId = c.id;
        setActiveId(convoId);
        await qc.invalidateQueries({ queryKey: ["ai-conversations", category] });
      }
      await insertMessage(convoId, "user", content);
      await qc.invalidateQueries({ queryKey: ["ai-messages", convoId] });

      const prior = (await listMessages(convoId)).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const currentConvo = (convos.data ?? []).find((c) => c.id === convoId);
      if (
        currentConvo &&
        (currentConvo.title === "New conversation" || !currentConvo.title.trim())
      ) {
        await updateConversation(convoId, { title: content.slice(0, 60) });
        await qc.invalidateQueries({ queryKey: ["ai-conversations", category] });
      }

      abortRef.current = new AbortController();
      setStreaming("");
      const final = await streamChat(
        prior,
        (chunk) => setStreaming((s) => (s ?? "") + chunk),
        abortRef.current.signal,
        spec?.system,
      );

      await insertMessage(convoId, "assistant", final);
      setStreaming(null);
      await qc.invalidateQueries({ queryKey: ["ai-messages", convoId] });
      await qc.invalidateQueries({ queryKey: ["ai-conversations", category] });
    } catch (e) {
      setStreaming(null);
      const msg = (e as Error).message;
      if (msg.includes("402"))
        toast.error("AI service unavailable", {
          description: "The inference service needs attention. Please try again later.",
        });
      else if (msg.includes("429"))
        toast.error("Rate limited", { description: "Please try again in a moment." });
      else toast.error("AI request failed", { description: msg });
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  const activeConvo = (convos.data ?? []).find((c) => c.id === activeId) ?? null;
  const hasMessages = (messages.data?.length ?? 0) > 0 || streaming !== null;
  const title = mod?.title ?? spec?.title ?? "Specialist";
  const starters = spec?.starters ?? [];
  const capability = capabilityForRoute(to);

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-[1600px] flex-col gap-4">
      <section className="glass-card relative overflow-hidden p-5 md:p-6">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl md:text-2xl font-semibold">{title}</h1>
                <StatusBadge status="Testing" />
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {capability.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{capability.summary}</p>
              <p className="mt-1 max-w-3xl text-[11px] text-muted-foreground">
                {capability.evidence}
              </p>
            </div>
          </div>
          <Button
            onClick={handleNew}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
          >
            <Plus className="mr-1.5 h-4 w-4" /> New chat
          </Button>
        </div>
      </section>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="glass-card flex min-h-0 flex-col p-3">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              className="w-full rounded-lg border border-border/60 bg-background/50 py-2 pl-8 pr-2 text-xs outline-none focus:border-primary/50"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {convos.isLoading ? (
              <div className="p-3 text-xs text-muted-foreground">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                No chats yet. Start one to see it here.
              </div>
            ) : (
              <ul className="space-y-1">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setActiveId(c.id)}
                      className={cn(
                        "group flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors",
                        c.id === activeId
                          ? "border-primary/40 bg-primary/10"
                          : "border-transparent hover:border-border/60 hover:bg-card/40",
                      )}
                    >
                      <MessageSquare
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          c.pinned ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate">{c.title}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(c);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            handleTogglePin(c);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-primary"
                        aria-label={c.pinned ? "Unpin" : "Pin"}
                      >
                        <Pin
                          className={cn(
                            "h-3 w-3",
                            c.pinned && "fill-primary text-primary opacity-100",
                          )}
                        />
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(c.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            handleDelete(c.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section className="glass-card flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {activeConvo?.title ?? "New chat"}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {capability.label} • Economy Groq route when configured • external actions require a
                connected account
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
            {!hasMessages ? (
              <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary gold-glow">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-semibold">
                    Talk to <span className="text-gradient-gold">{title}</span>
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{capability.summary}</p>
                </div>
                <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                  {starters.map((label) => (
                    <button
                      key={label}
                      onClick={() => handleSend(label)}
                      className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/40 p-3 text-left text-xs transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-6">
                {(messages.data ?? []).map((m) => (
                  <ChatBubble key={m.id} role={m.role} content={m.content} Icon={Icon} />
                ))}
                {streaming !== null && (
                  <ChatBubble role="assistant" content={streaming || "…"} streaming Icon={Icon} />
                )}
              </div>
            )}
          </div>

          <div className="border-t border-border/40 p-3 md:p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border/60 bg-background/50 p-2 focus-within:border-primary/50"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder={`Message ${title}… (Enter to send, Shift+Enter for newline)`}
                className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
                disabled={sending}
              />
              <Button
                type="submit"
                size="sm"
                disabled={sending || !input.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
                aria-label="Send"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-muted-foreground">
              Cossa AI can make mistakes. Verify important information.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function ChatBubble({
  role,
  content,
  streaming,
  Icon,
}: {
  role: string;
  content: string;
  streaming?: boolean;
  Icon: LucideIcon;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-primary/15 border border-primary/30 text-foreground"
            : "border border-border/60 bg-card/40",
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{content}</div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-pre:my-2 prose-headings:font-display">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            {streaming && (
              <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary align-middle" />
            )}
          </div>
        )}
      </div>
      {isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <User className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );
}
