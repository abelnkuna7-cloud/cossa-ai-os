import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  Brain,
  Loader2,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  User,
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

export const Route = createFileRoute("/ai/cossa")({
  component: AiChatWorkspace,
  head: () => ({
    meta: [
      {
        title: "Cossa AI — Production AI Workspace",
      },
      {
        name: "description",
        content:
          "Use Cossa AI for verified CRM analysis, sales, marketing, operations and business strategy inside Cossa Nexus Holdings.",
      },
      {
        property: "og:title",
        content: "Cossa AI — Production AI Workspace",
      },
      {
        property: "og:description",
        content:
          "Production AI workspace connected to verified company knowledge and authorised operational data.",
      },
    ],
  }),
});

const starterPrompts = [
  {
    icon: Sparkles,
    label:
      "Show me the newest CRM leads and recommend the next follow-up.",
  },
  {
    icon: Brain,
    label:
      "Analyse our current pipeline and identify the highest-priority action.",
  },
  {
    icon: MessageSquare,
    label:
      "Draft a professional WhatsApp follow-up for the newest website lead.",
  },
  {
    icon: Bot,
    label:
      "Summarise our current CRM position using live operational records.",
  },
];

type WorkspaceEnvironment =
  | "production"
  | "preview"
  | "development";

function resolveWorkspaceEnvironment(): WorkspaceEnvironment {
  const configuredEnvironment =
    import.meta.env.VITE_APP_ENV?.trim().toLowerCase();

  if (configuredEnvironment === "production") {
    return "production";
  }

  if (
    configuredEnvironment === "preview" ||
    configuredEnvironment === "staging"
  ) {
    return "preview";
  }

  if (configuredEnvironment === "development") {
    return "development";
  }

  /*
   * Vite sets import.meta.env.PROD to true for a production build.
   * This provides a safe fallback if VITE_APP_ENV has not yet been added.
   */
  return import.meta.env.PROD
    ? "production"
    : "development";
}

function getEnvironmentLabel(
  environment: WorkspaceEnvironment,
): string {
  if (environment === "production") {
    return "Production";
  }

  if (environment === "preview") {
    return "Preview";
  }

  return "Development";
}

function getEnvironmentDescription(
  environment: WorkspaceEnvironment,
): string {
  if (environment === "production") {
    return "Connected to authorised live CRM records, verified company knowledge and protected AI inference.";
  }

  if (environment === "preview") {
    return "Preview environment for controlled validation before production release.";
  }

  return "Development environment for local implementation and testing.";
}

function AiChatWorkspace() {
  const queryClient = useQueryClient();

  const [activeId, setActiveId] =
    useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [streaming, setStreaming] =
    useState<string | null>(null);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef =
    useRef<AbortController | null>(null);

  const workspaceEnvironment =
    resolveWorkspaceEnvironment();

  const environmentLabel =
    getEnvironmentLabel(workspaceEnvironment);

  const environmentDescription =
    getEnvironmentDescription(workspaceEnvironment);

  const conversations = useQuery({
    queryKey: ["ai-conversations"],
    queryFn: listConversations,
  });

  const messages = useQuery({
    queryKey: ["ai-messages", activeId],
    queryFn: () =>
      activeId
        ? listMessages(activeId)
        : Promise.resolve([] as AiMessage[]),
    enabled: Boolean(activeId),
  });

  useEffect(() => {
    if (
      !activeId &&
      conversations.data &&
      conversations.data.length > 0
    ) {
      setActiveId(conversations.data[0].id);
    }
  }, [conversations.data, activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.data, streaming]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return conversations.data ?? [];
    }

    return (conversations.data ?? []).filter(
      (conversation) =>
        conversation.title
          .toLowerCase()
          .includes(query),
    );
  }, [conversations.data, search]);

  async function refreshConversations() {
    await queryClient.invalidateQueries({
      queryKey: ["ai-conversations"],
    });
  }

  async function refreshMessages(
    conversationId: string,
  ) {
    await queryClient.invalidateQueries({
      queryKey: [
        "ai-messages",
        conversationId,
      ],
    });
  }

  async function handleNew() {
    try {
      setErrorMessage(null);

      const conversation =
        await createConversation();

      await refreshConversations();

      setActiveId(conversation.id);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error";

      toast.error(
        "Could not start a new chat",
        {
          description: message,
        },
      );
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Delete this conversation and its saved messages?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteConversation(id);
      await refreshConversations();

      if (id === activeId) {
        setActiveId(null);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error";

      toast.error("Delete failed", {
        description: message,
      });
    }
  }

  async function handleTogglePin(
    conversation: AiConversation,
  ) {
    try {
      await updateConversation(
        conversation.id,
        {
          pinned: !conversation.pinned,
        },
      );

      await refreshConversations();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error";

      toast.error(
        "Could not update the conversation",
        {
          description: message,
        },
      );
    }
  }

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();

    if (!content || sending) {
      return;
    }

    setSending(true);
    setErrorMessage(null);
    setInput("");

    try {
      let conversationId = activeId;

      if (!conversationId) {
        const conversation =
          await createConversation(
            content.slice(0, 60),
          );

        conversationId = conversation.id;

        setActiveId(conversationId);
        await refreshConversations();
      }

      await insertMessage(
        conversationId,
        "user",
        content,
      );

      await refreshMessages(conversationId);

      /*
       * Reload persisted history after saving the new user message.
       * This ensures the backend receives the full conversation in
       * chronological order.
       */
      const persistedMessages =
        await listMessages(conversationId);

      const modelMessages =
        persistedMessages.map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const currentConversation =
        (conversations.data ?? []).find(
          (conversation) =>
            conversation.id === conversationId,
        );

      if (
        currentConversation &&
        (
          currentConversation.title ===
            "New conversation" ||
          !currentConversation.title.trim()
        )
      ) {
        await updateConversation(
          conversationId,
          {
            title: content.slice(0, 60),
          },
        );

        await refreshConversations();
      }

      abortRef.current =
        new AbortController();

      setStreaming("");

      const finalResponse = await streamChat(
        modelMessages,
        (chunk) => {
          setStreaming(
            (current) =>
              `${current ?? ""}${chunk}`,
          );
        },
        abortRef.current.signal,
      );

      if (!finalResponse.trim()) {
        throw new Error(
          "Cossa AI returned an empty response.",
        );
      }

      await insertMessage(
        conversationId,
        "assistant",
        finalResponse,
      );

      setStreaming(null);

      await refreshMessages(conversationId);
      await refreshConversations();
    } catch (error) {
      setStreaming(null);

      const message =
        error instanceof Error
          ? error.message
          : "Unknown AI error";

      setErrorMessage(message);

      if (
        message.includes("402")
      ) {
        toast.error(
          "AI service unavailable",
          {
            description:
              "The inference service requires attention. Please try again later.",
          },
        );
      } else if (
        message.includes("429")
      ) {
        toast.error("Rate limited", {
          description:
            "Please wait briefly and try again.",
        });
      } else if (
        message.toLowerCase().includes(
          "session",
        ) ||
        message.includes("401")
      ) {
        toast.error(
          "Session verification failed",
          {
            description:
              "Sign out, sign in again and retry your request.",
          },
        );
      } else {
        toast.error(
          "Cossa AI request failed",
          {
            description: message,
          },
        );
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  const activeConversation =
    (conversations.data ?? []).find(
      (conversation) =>
        conversation.id === activeId,
    ) ?? null;

  const hasMessages =
    (messages.data?.length ?? 0) > 0 ||
    streaming !== null;

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-[1600px] flex-col gap-4">
      <section className="glass-card relative overflow-hidden p-5 md:p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
              <Brain className="h-5 w-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-semibold md:text-2xl">
                  Cossa{" "}
                  <span className="text-gradient-gold">
                    AI
                  </span>
                </h1>

                <StatusBadge
                  status={environmentLabel}
                />
              </div>

              <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
                {environmentDescription}
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleNew}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New chat
          </Button>
        </div>
      </section>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="glass-card flex min-h-0 flex-col p-3">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search conversations"
              aria-label="Search conversations"
              className="w-full rounded-lg border border-border/60 bg-background/50 py-2 pl-8 pr-2 text-xs outline-none focus:border-primary/50"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {conversations.isLoading ? (
              <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading conversations…
              </div>
            ) : conversations.isError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive">
                Conversations could not be
                loaded.
              </div>
            ) : filteredConversations.length ===
              0 ? (
              <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                No conversations found.
              </div>
            ) : (
              <ul className="space-y-1">
                {filteredConversations.map(
                  (conversation) => (
                    <li key={conversation.id}>
                      <div
                        className={cn(
                          "group flex w-full items-center gap-1 rounded-lg border px-1.5 py-1.5 transition-colors",
                          conversation.id ===
                            activeId
                            ? "border-primary/40 bg-primary/10"
                            : "border-transparent hover:border-border/60 hover:bg-card/40",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setActiveId(
                              conversation.id,
                            )
                          }
                          className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1 text-left text-xs"
                        >
                          <MessageSquare
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              conversation.pinned
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          />

                          <span className="min-w-0 flex-1 truncate">
                            {conversation.title}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleTogglePin(
                              conversation,
                            )
                          }
                          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100 focus:opacity-100"
                          aria-label={
                            conversation.pinned
                              ? "Unpin conversation"
                              : "Pin conversation"
                          }
                        >
                          <Pin
                            className={cn(
                              "h-3 w-3",
                              conversation.pinned &&
                                "fill-primary text-primary",
                            )}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              conversation.id,
                            )
                          }
                          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus:opacity-100"
                          aria-label="Delete conversation"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>
        </aside>

        <section className="glass-card flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {activeConversation?.title ??
                  "New conversation"}
              </div>

              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Cossa Nexus AI • Live CRM •
                Verified knowledge • Groq
                inference
              </div>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8"
          >
            {errorMessage && (
              <div
                role="alert"
                className="mx-auto mb-5 max-w-3xl rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
              >
                <p className="font-semibold">
                  Cossa AI could not complete
                  the request
                </p>

                <p className="mt-1 text-xs opacity-90">
                  {errorMessage}
                </p>
              </div>
            )}

            {messages.isLoading &&
            activeId ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading conversation…
              </div>
            ) : !hasMessages ? (
              <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary gold-glow">
                  <Sparkles className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="font-display text-2xl font-semibold">
                    What should Cossa{" "}
                    <span className="text-gradient-gold">
                      AI
                    </span>{" "}
                    work on?
                  </h2>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Ask for CRM analysis,
                    lead follow-ups, pipeline
                    priorities, business
                    strategy, marketing or
                    operational guidance.
                  </p>
                </div>

                <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                  {starterPrompts.map(
                    (prompt) => (
                      <button
                        type="button"
                        key={prompt.label}
                        onClick={() =>
                          handleSend(
                            prompt.label,
                          )
                        }
                        disabled={sending}
                        className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/40 p-3 text-left text-xs transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <prompt.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                        <span>
                          {prompt.label}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-6">
                {(messages.data ?? []).map(
                  (message) => (
                    <ChatBubble
                      key={message.id}
                      role={message.role}
                      content={
                        message.content
                      }
                    />
                  ),
                )}

                {streaming !== null && (
                  <ChatBubble
                    role="assistant"
                    content={
                      streaming || "…"
                    }
                    streaming
                  />
                )}
              </div>
            )}
          </div>

          <div className="border-t border-border/40 p-3 md:p-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleSend();
              }}
              className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border/60 bg-background/50 p-2 focus-within:border-primary/50"
            >
              <textarea
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                rows={1}
                maxLength={12_000}
                placeholder="Ask Cossa AI about live CRM records, leads, sales, marketing or operations…"
                aria-label="Message Cossa AI"
                className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
                disabled={sending}
              />

              <Button
                type="submit"
                size="sm"
                disabled={
                  sending ||
                  !input.trim()
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
                aria-label="Send message"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>

            <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-muted-foreground">
              Cossa AI uses authorised
              operational records and verified
              company knowledge. Human approval
              remains required for external,
              financial, legal and irreversible
              actions.
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
}: {
  role: string;
  content: string;
  streaming?: boolean;
}) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser
          ? "justify-end"
          : "justify-start",
      )}
    >
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Brain className="h-3.5 w-3.5" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "border border-primary/30 bg-primary/15 text-foreground"
            : "border border-border/60 bg-card/40",
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">
            {content}
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none prose-headings:font-display prose-p:my-2 prose-pre:my-2">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
            >
              {content}
            </ReactMarkdown>

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