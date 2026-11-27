import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  Settings2,
  X,
  Sparkles,
  CornerDownLeft,
} from "lucide-react";
import {
  AssistantAction,
  AssistantConfig,
  ChatMessage,
  DashboardContext,
  loadAssistantConfig,
  sendAssistantMessage,
} from "../services/assistantService";

interface DevAssistantProps {
  context: DashboardContext;
  onAction: (action: AssistantAction) => void;
  onOpenSettings: () => void;
}

const QUICK_PROMPTS = [
  "افتح الأرشيف الذكي",
  "كيف أرتّب القائمة وأغيّر الأيقونات؟",
  "غيّر الثيم والألوان",
  "أضف مشروعاً جديداً",
];

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "مرحباً 👋 أنا مساعد التطوير المدمج في لوحتك. أرشدك في تطوير لوحتك وأفتح لك الأقسام ونماذج الإضافة والإعدادات. الوضع المحلي قائم على قواعد، وليس نموذج ذكاء اصطناعي. لا أعدّل شفرة التطبيق أو ملفاته.\n\nاسألني بأي شيء، أو استخدم الأزرار السريعة بالأسفل.",
};

const ACTION_LABELS: Record<string, string> = {
  "navigate:overview": "فتح نظرة عامة",
  "navigate:cv": "فتح السيرة الذاتية",
  "navigate:projects": "فتح المشاريع",
  "navigate:om": "فتح التشغيل والصيانة",
  "navigate:files": "فتح مكتبة الملفات",
  "navigate:samples": "فتح عينات الأعمال",
  "navigate:certificates": "فتح الشهادات",
  "navigate:archive": "فتح الأرشيف الذكي",
  "navigate:settings": "فتح الإعدادات",
  "openModal:new": "فتح نموذج مشروع جديد",
  "openModal:upload": "فتح رفع الملفات",
};

export default function DevAssistant({
  context,
  onAction,
  onOpenSettings,
}: DevAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState<AssistantConfig>(() =>
    loadAssistantConfig()
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const isLocal = config.provider !== "openai-compatible" || !config.endpointUrl.trim();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  const runAction = useCallback(
    (action: AssistantAction | null) => {
      if (!action) return;
      onAction(action);
      const key =
        action.type === "navigate"
          ? `navigate:${action.tab}`
          : action.type === "openModal"
            ? `openModal:${action.modal}`
            : "navigate:settings";
      const label = ACTION_LABELS[key] || "تنفيذ إجراء";
      setMessages((m) => [
        ...m,
        { role: "system", content: `✓ تم تنفيذ: ${label}` },
      ]);
    },
    [onAction]
  );

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;
      const userMsg: ChatMessage = { role: "user", content };
      const history = [...messages, userMsg];
      setMessages([...history, { role: "assistant", content: "" }]);
      setInput("");
      setBusy(true);
      abortRef.current = new AbortController();

      let acc = "";
      await sendAssistantMessage(config, history, {
        onToken: (delta) => {
          acc += delta;
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: "assistant", content: acc };
            return copy;
          });
        },
        onDone: (_full, action) => {
          setBusy(false);
          runAction(action);
        },
        onError: (message) => {
          setBusy(false);
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: "assistant", content: message };
            return copy;
          });
        },
      }, context, abortRef.current.signal);
    },
    [messages, busy, config, runAction, context]
  );

  function handleOpen() {
    setOpen((o) => !o);
  }

  function refreshConfig() {
    setConfig(loadAssistantConfig());
  }

  // Re-read config when panel opens (so external changes reflect)
  useEffect(() => {
    if (open) refreshConfig();
  }, [open]);

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        className={`mh-assistant-launcher ${open ? "hidden" : ""}`}
        onClick={handleOpen}
        title="مساعد التطوير"
        aria-label="فتح مساعد التطوير"
      >
        <Bot size={24} />
        <span className="mh-assistant-pulse" />
        <span className="mh-assistant-badge">{isLocal ? "محلي" : "متصل"}</span>
      </button>

      {/* Panel */}
      {open && (
        <section className="mh-assistant-panel" role="dialog" aria-label="مساعد التطوير"
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
          <header className="mh-assistant-head">
            <div className="mh-assistant-title">
              <span className="mh-assistant-avatar">
                <Bot size={18} />
              </span>
              <div>
                <b>مساعد التطوير</b>
                <small>
                  {isLocal
                    ? "دليل محلي — فتح الأقسام والنماذج"
                    : `متصل بنموذج: ${config.model || "—"}`}
                </small>
              </div>
            </div>
            <div className="mh-assistant-head-actions">
              <button
                type="button"
                title="إعدادات المساعد"
                onClick={() => { setOpen(false); onOpenSettings(); }}
              >
                <Settings2 size={17} />
              </button>
              <button type="button" title="إغلاق" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
          </header>

          <div className="mh-assistant-messages" ref={scrollRef} role="log" aria-live="polite">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "mh-chat-msg user"
                    : m.role === "system"
                      ? "mh-chat-msg system"
                      : "mh-chat-msg assistant"
                }
              >
                {m.role === "assistant" && !m.content && busy ? (
                  <span className="mh-typing">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  <span className="mh-chat-text">{m.content || "…"}</span>
                )}
              </div>
            ))}
          </div>

          {messages.length <= 1 && (
            <div className="mh-assistant-chips">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="mh-chip"
                  onClick={() => send(q)}
                  disabled={busy}
                >
                  <Sparkles size={13} />
                  {q}
                </button>
              ))}
            </div>
          )}

          <form
            className="mh-assistant-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <textarea
              aria-label="رسالتك للمساعد"
              rows={1}
              placeholder="اسأل مساعد التطوير… (مثال: افتح الأرشيف الذكي)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
            <button type="submit" disabled={busy || !input.trim()} title="إرسال">
              <Send size={17} />
            </button>
          </form>
          <small className="mh-assistant-foot">
            <CornerDownLeft size={11} /> Enter للإرسال · Shift+Enter لسطر جديد
          </small>
        </section>
      )}
    </>
  );
}
