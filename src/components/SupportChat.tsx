import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Headphones, Loader2, Mic, MicOff, Send, Volume2, VolumeX, X, RotateCcw } from "lucide-react";
import { askSupport } from "@/lib/support-chat.functions";
import { supabase } from "@/integrations/supabase/client";


type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

const STORAGE_KEY = "na_support_chat_v1";
const VOICE_KEY = "na_support_voice_on";

const INTRO =
  "Hi, I'm Neta — your NetAssist AI assistant. This app helps network engineers generate configs, troubleshoot issues, write automation scripts, MOPs, rollback plans and documentation, all powered by AI. Do you need help with anything?";

const SIGNED_IN_GREETING =
  "Welcome back! You're signed in. Want a hand generating a config, troubleshooting an issue, or finding a tool?";

const QUICK_PROMPTS = [
  "What can this app do?",
  "How do I generate a config?",
  "I can't sign in",
  "How do I save and export a project?",
];

/** Minimal typings for the Web Speech API (not in lib.dom for all browsers). */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.continuous = false;
  rec.interimResults = false;
  return rec;
}

const newId = () => Math.random().toString(36).slice(2);

export function SupportChat() {
  const ask = useServerFn(askSupport);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [unread, setUnread] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const autoSpokenRef = useRef(false);
  const autoOpenRef = useRef(false);

  // Hydrate persisted conversation + preferences. The assistant only auto-opens
  // after the user explicitly authenticates (see the auth listener below).
  useEffect(() => {
    let restored: ChatMessage[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) restored = JSON.parse(raw) as ChatMessage[];
      setVoiceOn(localStorage.getItem(VOICE_KEY) === "1");
    } catch {
      restored = [];
    }
    if (restored.length === 0) {
      restored = [{ id: newId(), role: "assistant", content: INTRO }];
    }
    setMessages(restored);
    setMicSupported(!!getRecognition());
  }, []);

  // Pop the assistant up whenever a user signs in.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN") return;
      autoOpenRef.current = true;
      setOpen(true);
      setUnread(true);
      setMessages((prev) =>
        prev.length > 0 && prev[prev.length - 1]?.content === SIGNED_IN_GREETING
          ? prev
          : [...prev, { id: newId(), role: "assistant", content: SIGNED_IN_GREETING }],
      );
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {

    if (messages.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      /* storage full or blocked — chat still works in-memory */
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, open]);

  useEffect(() => {
    if (open) {
      setUnread(false);
      inputRef.current?.focus();
    }
  }, [open]);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*_`#>]/g, ""));
    utterance.rate = 1.02;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    if (!open || !autoOpenRef.current || autoSpokenRef.current) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (last.content === INTRO || last.content === SIGNED_IN_GREETING) {
      autoSpokenRef.current = true;
      autoOpenRef.current = false;
      speak(last.content);
    }
  }, [open, messages, speak]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      setError(null);
      setInput("");
      const next: ChatMessage[] = [...messages, { id: newId(), role: "user", content: trimmed }];
      setMessages(next);
      setSending(true);
      try {
        const { reply } = await ask({
          data: { messages: next.slice(-14).map((m) => ({ role: m.role, content: m.content })) },
        });
        setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: reply }]);
        if (voiceOn) speak(reply);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [ask, messages, sending, speak, voiceOn],
  );

  const toggleMic = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = getRecognition();
    if (!rec) {
      setError("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    recognitionRef.current = rec;
    rec.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) void send(transcript);
    };
    rec.onerror = () => {
      setListening(false);
      setError("I couldn't hear that. Check microphone access and try again.");
    };
    rec.onend = () => setListening(false);
    stopSpeaking();
    setError(null);
    setListening(true);
    rec.start();
  }, [listening, send, stopSpeaking]);

  function resetChat() {
    stopSpeaking();
    autoSpokenRef.current = false;
    autoOpenRef.current = false;
    const fresh: ChatMessage[] = [{ id: newId(), role: "assistant", content: INTRO }];
    setMessages(fresh);
    setError(null);
  }

  function toggleVoice() {
    setVoiceOn((prev) => {
      const nextValue = !prev;
      try {
        localStorage.setItem(VOICE_KEY, nextValue ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (!nextValue) stopSpeaking();
      return nextValue;
    });
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open NetAssist AI support assistant"
          className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elevated transition hover:scale-[1.03]"
        >
          <Headphones className="h-5 w-5" />
          <span className="hidden sm:inline">Need help?</span>
          {unread && <span className="h-2 w-2 rounded-full bg-destructive" aria-hidden />}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="NetAssist AI support assistant"
          className="fixed bottom-3 right-3 left-3 z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated sm:left-auto sm:w-[380px]"
        >
          <header className="flex items-center gap-2 border-b border-border bg-gradient-primary px-3 py-2.5 text-primary-foreground">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-foreground/15">
              <Headphones className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-sm font-bold leading-tight">Neta · Support assistant</div>
              <div className="truncate text-[11px] opacity-80">
                {listening ? "Listening…" : sending ? "Typing…" : "Online · voice enabled"}
              </div>
            </div>
            <button
              type="button"
              onClick={toggleVoice}
              aria-label={voiceOn ? "Turn spoken replies off" : "Turn spoken replies on"}
              className="rounded-lg p-1.5 transition hover:bg-primary-foreground/15"
            >
              {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={resetChat}
              aria-label="Start a new conversation"
              className="rounded-lg p-1.5 transition hover:bg-primary-foreground/15"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setOpen(false);
              }}
              aria-label="Close support assistant"
              className="rounded-lg p-1.5 transition hover:bg-primary-foreground/15"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m) =>
              m.role === "assistant" ? (
                <p key={m.id} className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {m.content}
                </p>
              ) : (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground">
                    {m.content}
                  </p>
                </div>
              ),
            )}

            {sending && (
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </p>
            )}

            {error && (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            {messages.length <= 1 && !sending && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void send(q)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-end gap-1.5 border-t border-border p-2"
          >
            {micSupported && (
              <button
                type="button"
                onClick={toggleMic}
                aria-label={listening ? "Stop listening" : "Speak your question"}
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition ${
                  listening
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder={listening ? "Listening…" : "Ask about NetAssist AI…"}
              className="max-h-28 min-h-9 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground transition disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
