import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useRouterState } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot, ChevronDown, CircleStop, Loader2, MessageSquare, Mic, MicOff,
  Minimize2, Send, Settings2, Speaker, Volume2, VolumeX, X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createConversation, insertMessage, listConversations, listMessages,
  type AiMessage,
} from "@/lib/ai-data";
import { streamChatWithMetadata } from "@/lib/ai-stream";
import { queueLeadHunterRuntimeProof } from "@/lib/agent-runtime";

type AssistantState = "READY" | "LISTENING" | "TRANSCRIBING" | "THINKING" | "SPEAKING" | "ERROR";
type VoiceProviderState = "available" | "unavailable" | "permission_required" | "error";

type RecognitionEvent = { results: ArrayLike<{ isFinal?: boolean; 0?: { transcript?: string } }> };
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort?(): void;
};
type RecognitionConstructor = new () => Recognition;

const ACTIVE_CONVERSATION_KEY = "cossa-ai-active-conversation";
const ASSISTANT_OPEN_KEY = "cossa-voice-assistant-open";
const VOICE_SETTINGS_KEY = "cossa-voice-settings";

interface VoiceSettings {
  muted: boolean;
  automaticSpeech: boolean;
  conversationMode: boolean;
  rate: number;
  language: string;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  muted: false,
  automaticSpeech: true,
  conversationMode: false,
  rate: 1,
  language: "en-ZA",
};

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function readSettings(): VoiceSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(VOICE_SETTINGS_KEY) ?? "{}") as Partial<VoiceSettings>;
    return {
      muted: parsed.muted === true,
      automaticSpeech: parsed.automaticSpeech !== false,
      conversationMode: parsed.conversationMode === true,
      rate: typeof parsed.rate === "number" ? Math.min(1.5, Math.max(0.75, parsed.rate)) : 1,
      language: typeof parsed.language === "string" && parsed.language ? parsed.language : "en-ZA",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function workspaceLabel(pathname: string): string {
  const paths: Array<[string, string]> = [
    ["/businesses/store", "Cossa Store"], ["/businesses/tech", "Cossa Tech"],
    ["/businesses/construction", "Cossa Nexus Construction"],
    ["/businesses/facility-services", "Cossa Facility Services"],
    ["/businesses/nexdocs", "NexDocs"], ["/marketing", "Marketing & Growth"],
    ["/sales", "Sales & Revenue"], ["/ai/workforce", "AI Company"],
    ["/ai/orchestrator", "Cossa Orchestrator"], ["/integrations", "Integrations"],
    ["/admin", "Administration"], ["/operations", "Operations"],
    ["/command-center", "Command Center"],
  ];
  return paths.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "GROWTH";
}

function navigationTarget(message: string): string | null {
  if (!/^\s*(open|go to|navigate to|show me)\b/i.test(message)) return null;
  const targets: Array<[RegExp, string]> = [
    [/cossa store/i, "/businesses/store"], [/cossa tech/i, "/businesses/tech"],
    [/construction/i, "/businesses/construction"], [/facility services/i, "/businesses/facility-services"],
    [/nexdocs/i, "/businesses/nexdocs"], [/lead hunter/i, "/sales/lead-finder"],
    [/ai (company|workforce)/i, "/ai/workforce"], [/command cent(?:er|re)/i, "/command-center"],
    [/notifications/i, "/notifications"], [/integrations/i, "/integrations"],
  ];
  return targets.find(([pattern]) => pattern.test(message))?.[1] ?? null;
}

function parseLeadHunterMission(message: string) {
  if (!/\b(ask|tell|run|queue)\b.*\blead hunter\b/i.test(message)) return null;
  const numberWords: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const digit = message.match(/\b(\d{1,2})\b/);
  const word = Object.keys(numberWords).find((key) => new RegExp(`\\b${key}\\b`, "i").test(message));
  const resultCount = Math.min(20, Math.max(1, digit ? Number(digit[1]) : word ? numberWords[word] : 5));
  const construction = /construction|renovation|building|painting|tiling/i.test(message);
  const tech = /website|seo|marketing|technology|automation/i.test(message);
  const location = message.match(/\b(Pretoria|Centurion|Gauteng|Johannesburg|Midrand|South Africa)\b/i)?.[1] ?? "Gauteng";
  return {
    objective: message.trim(),
    targetCompany: construction ? "cossa_nexus_construction" : tech ? "cossa_tech" : "cossa_facility_services",
    targetService: construction ? "construction" : tech ? "website_design" : "facility_management",
    targetLocation: location,
    resultCount,
  };
}

export function CossaVoiceAssistant({ page = false }: { page?: boolean }) {
  const router = useRouter();
  const location = useRouterState({ select: (state) => state.location });
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(() => page || (typeof window !== "undefined" && window.localStorage.getItem(ASSISTANT_OPEN_KEY) === "true"));
  const [activeId, setActiveId] = useState<string | null>(() => typeof window === "undefined" ? null : window.localStorage.getItem(ACTIVE_CONVERSATION_KEY));
  const [input, setInput] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [state, setState] = useState<AssistantState>("READY");
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<VoiceSettings>(readSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [inputProvider, setInputProvider] = useState<VoiceProviderState>("permission_required");
  const [outputProvider, setOutputProvider] = useState<VoiceProviderState>("permission_required");
  const recognitionRef = useRef<Recognition | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const responseRef = useRef("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const conversations = useQuery({ queryKey: ["ai-conversations"], queryFn: () => listConversations() });
  const messages = useQuery({
    queryKey: ["ai-messages", activeId],
    queryFn: () => activeId ? listMessages(activeId) : Promise.resolve([] as AiMessage[]),
    enabled: Boolean(activeId),
  });

  const currentWorkspace = workspaceLabel(location.pathname);
  const recordContext = useMemo(() => {
    const search = location.search as Record<string, unknown>;
    return typeof search.record === "string" ? search.record : null;
  }, [location.search]);

  useEffect(() => {
    if (!activeId && conversations.data?.[0]) setActiveId(conversations.data[0].id);
  }, [activeId, conversations.data]);

  useEffect(() => {
    if (!activeId || typeof window === "undefined") return;
    window.localStorage.setItem(ACTIVE_CONVERSATION_KEY, activeId);
    window.dispatchEvent(new CustomEvent("cossa-ai-conversation-change", { detail: activeId }));
  }, [activeId]);

  useEffect(() => {
    if (page || typeof window === "undefined") return;
    window.localStorage.setItem(ASSISTANT_OPEN_KEY, String(open));
  }, [open, page]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const Recognition = recognitionConstructor();
    setInputProvider(Recognition ? "permission_required" : "unavailable");
    if (!("speechSynthesis" in window)) {
      setOutputProvider("unavailable");
      return;
    }
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      setOutputProvider(available.length > 0 ? "available" : "unavailable");
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.data, streaming]);

  useEffect(() => () => {
    recognitionRef.current?.abort?.();
    abortRef.current?.abort();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  async function ensureConversation(title: string): Promise<string> {
    if (activeId) return activeId;
    const conversation = await createConversation(title.slice(0, 60));
    setActiveId(conversation.id);
    await queryClient.refetchQueries({ queryKey: ["ai-conversations"] });
    return conversation.id;
  }

  function stopSpeech() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setState("READY");
  }

  function speak(text: string) {
    if (settings.muted || !settings.automaticSpeech || !("speechSynthesis" in window)) return;
    const availableVoices = voices.length ? voices : window.speechSynthesis.getVoices();
    const selected = availableVoices.find((voice) => voice.lang.toLowerCase() === settings.language.toLowerCase())
      ?? availableVoices.find((voice) => voice.lang.toLowerCase().startsWith("en-za"))
      ?? availableVoices.find((voice) => voice.lang.toLowerCase().startsWith("en"));
    if (!selected) {
      setOutputProvider("unavailable");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`>-]/g, " "));
    utterance.voice = selected;
    utterance.lang = selected.lang || settings.language;
    utterance.rate = settings.rate;
    utterance.onstart = () => setState("SPEAKING");
    utterance.onend = () => setState("READY");
    utterance.onerror = () => {
      setOutputProvider("error");
      setState("READY");
      toast.error("Voice output failed", { description: "The written answer remains available." });
    };
    window.speechSynthesis.speak(utterance);
  }

  function startListening() {
    if (state === "SPEAKING") stopSpeech();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const Recognition = recognitionConstructor();
    if (!Recognition) {
      setInputProvider("unavailable");
      setError("Speech recognition is unavailable. Type your message instead.");
      return;
    }
    const recognition = new Recognition();
    const startingInput = input.trim();
    recognition.lang = settings.language;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      setState("TRANSCRIBING");
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript?.trim() ?? "").filter(Boolean).join(" ");
      setInterimTranscript(transcript);
      setInput([startingInput, transcript].filter(Boolean).join(" "));
    };
    recognition.onerror = (event) => {
      const denied = event.error === "not-allowed" || event.error === "service-not-allowed";
      setInputProvider(denied ? "error" : "available");
      setError(denied ? "Microphone permission was denied. Text chat remains available." : `Voice input stopped${event.error ? `: ${event.error}` : "."}`);
      setState("ERROR");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setInterimTranscript("");
      setState((current) => current === "ERROR" ? current : "READY");
    };
    try {
      recognitionRef.current = recognition;
      setError(null);
      setInputProvider("available");
      setState("LISTENING");
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setState("ERROR");
      setError("Microphone could not start. Type your message instead.");
    }
  }

  async function saveAssistantMessage(conversationId: string, content: string) {
    await insertMessage(conversationId, "assistant", content);
    await queryClient.refetchQueries({ queryKey: ["ai-messages", conversationId] });
    await queryClient.refetchQueries({ queryKey: ["ai-conversations"] });
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || state === "THINKING") return;
    recognitionRef.current?.stop();
    stopSpeech();
    setInput("");
    setError(null);
    setState("THINKING");
    try {
      const conversationId = await ensureConversation(content);
      await insertMessage(conversationId, "user", content);
      await queryClient.refetchQueries({ queryKey: ["ai-messages", conversationId] });

      const target = navigationTarget(content);
      if (target) {
        await router.navigate({ to: target });
        const answer = `Opened ${workspaceLabel(target)} inside GROWTH.`;
        await saveAssistantMessage(conversationId, answer);
        setState("READY");
        speak(answer);
        return;
      }

      const mission = parseLeadHunterMission(content);
      if (mission) {
        const result = await queueLeadHunterRuntimeProof(mission);
        const answer = `I created Lead Hunter mission ${result.missionId}. ${result.queuedTasks} controlled stages are queued. No outreach was sent.`;
        await saveAssistantMessage(conversationId, answer);
        setState("READY");
        speak(answer);
        return;
      }

      const prior = (await listMessages(conversationId)).map((message) => ({ role: message.role, content: message.content }));
      responseRef.current = "";
      setStreaming("");
      abortRef.current = new AbortController();
      const result = await streamChatWithMetadata(prior, (chunk) => {
        responseRef.current += chunk;
        setStreaming(responseRef.current);
      }, {
        signal: abortRef.current.signal,
        provider: "auto",
        system: [
          "You are the same authorised Cossa AI used by the main text workspace, presented through the voice interface.",
          `Current GROWTH workspace: ${currentWorkspace}. Current route: ${location.pathname}.`,
          recordContext ? `The UI has an affected record reference: ${recordContext}. Use only server-authorised records available to the logged-in user.` : "No specific record is selected in the current route.",
          "Never claim an email, WhatsApp, social post, payment, tender, deployment, contract, deletion or other external action completed unless a verified execution record in authorised context proves it.",
          "For voice delivery, lead with a concise direct answer. Keep evidence and approval boundaries intact.",
        ].join("\n"),
      });
      await saveAssistantMessage(conversationId, result.content);
      setStreaming(null);
      setState("READY");
      speak(result.content);
    } catch (caught) {
      setStreaming(null);
      const message = caught instanceof Error ? caught.message : "Cossa AI could not complete the request.";
      setError(message);
      setState("ERROR");
      toast.error("Cossa AI request failed", { description: message });
    } finally {
      abortRef.current = null;
    }
  }

  function stopAll() {
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    abortRef.current?.abort();
    stopSpeech();
    setState("READY");
  }

  if (!page && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)} aria-label="Open Cossa Voice AI"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-primary/50 bg-black text-primary shadow-2xl gold-glow transition hover:scale-105">
        <Mic className="h-6 w-6" />
      </button>
    );
  }

  const panelClass = page
    ? "mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-primary/25 bg-background shadow-2xl"
    : "fixed bottom-4 right-4 z-50 flex h-[min(720px,calc(100vh-2rem))] w-[min(430px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-primary/30 bg-background/98 shadow-2xl backdrop-blur-xl";

  return (
    <section className={panelClass} aria-label="Cossa Voice AI assistant">
      <header className="flex items-center gap-3 border-b border-border/60 bg-black px-4 py-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary", state === "LISTENING" && "animate-pulse", state === "SPEAKING" && "ring-2 ring-primary/40")}>
          <Bot className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-semibold text-white">COSSA <span className="text-primary">AI</span></div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground"><span>{state}</span><span>•</span><span className="truncate">{currentWorkspace}</span></div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSettingsOpen((value) => !value)} aria-label="Voice settings"><Settings2 className="h-4 w-4" /></Button>
        {!page ? <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Minimise assistant"><Minimize2 className="h-4 w-4" /></Button> : null}
      </header>

      {settingsOpen ? <div className="grid gap-3 border-b border-border/60 bg-card/40 p-4 text-xs sm:grid-cols-2">
        <label className="flex items-center justify-between gap-2">Spoken responses <input type="checkbox" checked={settings.automaticSpeech} onChange={(event) => setSettings((current) => ({ ...current, automaticSpeech: event.target.checked }))} /></label>
        <label className="flex items-center justify-between gap-2">Conversation mode <input type="checkbox" checked={settings.conversationMode} onChange={(event) => setSettings((current) => ({ ...current, conversationMode: event.target.checked }))} /></label>
        <label className="flex items-center gap-2">Speed <input className="min-w-0 flex-1" type="range" min="0.75" max="1.5" step="0.05" value={settings.rate} onChange={(event) => setSettings((current) => ({ ...current, rate: Number(event.target.value) }))} /></label>
        <div className="text-muted-foreground">Input: {inputProvider.replaceAll("_", " ")} · Output: {outputProvider.replaceAll("_", " ")} · {settings.language}</div>
      </div> : null}

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {(messages.data ?? []).map((message) => <div key={message.id} className={cn("max-w-[88%] rounded-2xl border px-3 py-2 text-sm", message.role === "user" ? "ml-auto border-primary/30 bg-primary/10" : "border-border/60 bg-card/50")}>
          {message.role === "assistant" ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown> : <div className="whitespace-pre-wrap">{message.content}</div>}
        </div>)}
        {streaming !== null ? <div className="max-w-[88%] rounded-2xl border border-border/60 bg-card/50 px-3 py-2 text-sm"><ReactMarkdown remarkPlugins={[remarkGfm]}>{streaming || "Thinking…"}</ReactMarkdown></div> : null}
        {!messages.data?.length && streaming === null ? <div className="rounded-2xl border border-dashed border-primary/30 p-5 text-center text-sm text-muted-foreground">
          Speak or type to Cossa AI. Voice and text use one saved conversation and the same authorised reasoning gateway.
        </div> : null}
      </div>

      {error ? <div role="alert" className="mx-4 mb-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{error}</div> : null}
      {interimTranscript ? <div className="mx-4 mb-2 rounded-lg border border-primary/30 bg-primary/5 p-2 text-xs">Transcript: {interimTranscript}</div> : null}

      <footer className="border-t border-border/60 p-3">
        <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex items-end gap-2 rounded-xl border border-border/60 bg-card/30 p-2">
          <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={1} maxLength={12_000} disabled={state === "THINKING"} placeholder="Ask Cossa AI…" aria-label="Message Cossa AI" className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none" />
          <Button type="button" size="icon" variant={state === "LISTENING" ? "default" : "outline"} onClick={startListening} aria-label={state === "LISTENING" ? "Stop listening" : "Start listening"}>
            {inputProvider === "unavailable" ? <MicOff className="h-4 w-4" /> : <Mic className={cn("h-4 w-4", state === "LISTENING" && "animate-pulse")} />}
          </Button>
          <Button type="submit" size="icon" disabled={!input.trim() || state === "THINKING"} aria-label="Send message">{state === "THINKING" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
        </form>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground">Voice conversation inside GROWTH—not telephone calling. External actions remain approval-controlled.</p>
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" onClick={() => setSettings((current) => ({ ...current, muted: !current.muted }))} aria-label={settings.muted ? "Unmute" : "Mute"}>{settings.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</Button>
            {(state === "SPEAKING" || state === "THINKING" || state === "LISTENING") ? <Button variant="ghost" size="icon" onClick={stopAll} aria-label="Stop"><CircleStop className="h-4 w-4" /></Button> : null}
          </div>
        </div>
      </footer>
    </section>
  );
}
