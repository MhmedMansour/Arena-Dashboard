import type { MainTabId } from "../types/mhmed";
import type { SettingsSubTab } from "../components/SettingsView";

export type AssistantProvider = "offline" | "openai-compatible";

export interface AssistantConfig {
  provider: AssistantProvider;
  endpointUrl: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  stream: boolean;
}

const CONFIG_KEY = "mimar-ai-assistant-config-v1";

export const DEFAULT_ASSISTANT_CONFIG: AssistantConfig = {
  provider: "offline",
  endpointUrl: "",
  model: "gpt-4o-mini",
  systemPrompt:
    "أنت «مساعد تطوير» محترف مدمج داخل لوحة تحكم هندسية عربية (RTL) لنظم MEP (ميكانيكا وتكييف وكهرباء وسباكة). " +
    "تتحدث بالعربية بوضوح وبأسلوب هندسي عملي. تساعد المستخدم في: إدارة المشاريع، رفع وتصنيف الملفات، " +
    "الأرشيف الذكي، أوامر التشغيل والصيانة، تخصيص القائمة والأيقونات، تغيير الثيم والألوان، والمزامنة السحابية. " +
    "كن مختصراً ومباشراً، واستخدم قوائم نقطية عند شرح خطوات. وضّح حدود قدراتك ولا تدّع تنفيذ تغييرات لم تنفذها.",
  temperature: 0.4,
  stream: true,
};

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type AssistantAction =
  | { type: "navigate"; tab: MainTabId; sub?: SettingsSubTab }
  | { type: "openModal"; modal: "new" | "upload" }
  | { type: "openSettings"; sub?: SettingsSubTab };

export interface DashboardContext {
  dashboardName: string;
  currentTab: MainTabId;
  projectCount: number;
  workOrderCount: number;
  fileCount: number;
  archiveCount: number;
}

export function loadAssistantConfig(): AssistantConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_ASSISTANT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<AssistantConfig>;
    return {
      ...DEFAULT_ASSISTANT_CONFIG,
      provider: parsed.provider === "openai-compatible" ? "openai-compatible" : "offline",
      endpointUrl: typeof parsed.endpointUrl === "string" ? parsed.endpointUrl : "",
      model: typeof parsed.model === "string" ? parsed.model : DEFAULT_ASSISTANT_CONFIG.model,
      temperature: typeof parsed.temperature === "number" ? Math.max(0, Math.min(2, parsed.temperature)) : 0.4,
      stream: parsed.stream !== false,
      systemPrompt: parsed.systemPrompt || DEFAULT_ASSISTANT_CONFIG.systemPrompt,
    };
  } catch {
    return { ...DEFAULT_ASSISTANT_CONFIG };
  }
}

export function saveAssistantConfig(config: AssistantConfig): boolean {
  try {
    const { provider, endpointUrl, model, systemPrompt, temperature, stream } = config;
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ provider, endpointUrl, model, systemPrompt, temperature, stream }));
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Intent detection — works for both offline and LLM modes                    */
/* -------------------------------------------------------------------------- */

const TAB_KEYWORDS: Array<{ tab: MainTabId; sub?: SettingsSubTab; kw: string[] }> = [
  { tab: "settings", sub: "assistant", kw: ["إعدادات المساعد", "مساعد التطوير"] },
  { tab: "overview", kw: ["نظرة عامة", "الرئيسية", "الصفحة الرئيسية", "الهوم", "home", "dashboard", "لوحة التحكم"] },
  { tab: "cv", kw: ["السيرة الذاتية", "السيره", "cv", "خبرات", "السيرة"] },
  { tab: "projects", kw: ["المشاريع", "project", "مشروع", "بلان", "مخطط مشروع"] },
  { tab: "om", kw: ["التشغيل والصيانة", "الصيانة", "تشغيل", "أوامر العمل", "om ", "o&m", "work order"] },
  { tab: "files", kw: ["مكتبة الملفات", "الملفات", "رفع ملف", "upload file", "تحميل ملف"] },
  { tab: "samples", kw: ["عينات الأعمال", "العينات", "samples", "معرض الأعمال"] },
  { tab: "certificates", kw: ["الشهادات", "شهادة", "certificate", "الاعتمادات"] },
  { tab: "archive", kw: ["الأرشيف الذكي", "الأرشيف", "archive", "تصنيف الملفات"] },
  {
    tab: "settings",
    sub: "appearance",
    kw: ["الثيم", "السمة", "الألوان", "اللون", "theme", "color", "المظهر", "الشكل", "الخط"],
  },
  {
    tab: "settings",
    sub: "workspace",
    kw: ["القائمة", "الأيقونات", "ايقونات", "رتب القائمة", "ترتيب القائمة", "الأيقونات", "تغيير الأيقونة", "القائمة الجانبية", "customize nav", "تخصيص القائمة", "مكان القوائم"],
  },
  {
    tab: "settings",
    sub: "sync",
    kw: ["المزامنة", "زامن", "السحابة", "النسخ الاحتياطي", "sync", "github", "supabase", "انقل", "export", "استيراد"],
  },
  { tab: "settings", sub: "brand", kw: ["الهوية", "الاسم والشعار", "براند", "brand", "الشعار"] },
  { tab: "settings", sub: "profile", kw: ["البروفايل", "صورة البروفايل", "الصورة الشخصية", "profile", "الحالة"] },
];

const MODAL_KEYWORDS: Array<{ modal: "new" | "upload"; kw: string[] }> = [
  { modal: "new", kw: ["مشروع جديد", "أضف مشروع", "إضافة مشروع", "new project", "مشروع جديد"] },
  { modal: "upload", kw: ["ارفع ملف", "رفع ملفات", "upload files", "حمّل ملف", "ملفات جديدة"] },
];

export function detectIntent(text: string): AssistantAction | null {
  const normalize = (value: string) => value.toLowerCase().normalize("NFKC").replace(/[\u064B-\u065F\u0670]/g, "").replace(/[أإآ]/g, "ا");
  const t = ` ${normalize(text).replace(/مشروعا?\s+جديدا?/g, "مشروع جديد")} `;
  // Only explicit user commands can trigger UI actions, never model prose or questions.
  if (/(كيف|ازاي|إزاي|هل|لا ت|لا أ|لا ا|متفتح|ما ت|ما أ|ما ا|مش عايز|don't|do not|how|what|why|can you explain)/i.test(t)) return null;
  if (!/(افتح|إفتح|اذهب|انتقل|أضف|اضف|إضافة|ارفع|حمّل|غير|غيّر|رتب|رتّب|open|navigate|add|upload|change)/i.test(t)) return null;
  for (const m of MODAL_KEYWORDS) {
    if (m.kw.some((k) => t.includes(normalize(k)))) {
      return { type: "openModal", modal: m.modal };
    }
  }
  const match = TAB_KEYWORDS.flatMap((entry) => entry.kw
    .filter((keyword) => t.includes(normalize(keyword)))
    .map((keyword) => ({ entry, specificity: keyword.length })))
    .sort((a, b) => b.specificity - a.specificity)[0]?.entry;
  if (match) return match.sub
    ? { type: "navigate", tab: match.tab, sub: match.sub }
    : { type: "navigate", tab: match.tab };
  if (/الاعدادات|settings/.test(t)) {
    return { type: "navigate", tab: "settings" };
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Offline expert — built-in knowledge of the dashboard                       */
/* -------------------------------------------------------------------------- */

const EXPERT_KB = `
اللوحة تضم الأقسام التالية: نظرة عامة، السيرة الذاتية والخبرات، المشاريع، التشغيل والصيانة (O&M)، مكتبة الملفات، عينات الأعمال، الشهادات، الأرشيف الذكي، والإعدادات والمزامنة.
- إضافة مشروع: من «نظرة عامة» اضغط «مشروع جديد»، أو من «المشاريع» اضغط «إضافة مشروع جديد»، وأدخل الاسم والمدينة والتخصص ونسبة الإنجاز.
- رفع وتصنيف الملفات: من «الأرشيف الذكي» ارفع ملفات (DWG, RVT, PDF, Excel, صور...). الأرشيف الذكي يصنّفها آلياً حسب الامتداد والتسمية والمحتوى، ويمكن إعادة تصنيفها يدوياً.
- تخصيص القائمة والأيقونات: من «الإعدادات ← الأقسام والواجهة» يمكنك إعادة ترتيب عناصر القائمة، تغيير أيقونة كل قسم، إخفاء/إظهار الأقسام، وتحديد مكان الشريط (يمين/يسار/علوي).
- الثيم والألوان: من «الإعدادات ← المظهر والألوان» اختر قالباً (جرافيت نحاسي، أزرق معماري، زمردي...) أو لوناً مميزاً حراً، واضبط حجم الخط والأسطح.
- المزامنة: من «الإعدادات ← المزامنة» اربط GitHub Gist أو Supabase لمزامنة بياناتك بين الأجهزة، أو نقلها برمز سريع/ملف JSON.
- التشغيل والصيانة: من قسم «التشغيل والصيانة» أدر أوامر العمل (وقائية/تصحيحية/إشراف/فحص) مع الأولويات والحالات.
`;

function matchOffline(text: string, ctx: DashboardContext): string {
  const t = ` ${text.toLowerCase()} `;

  if (/(من أنت|ما هذا|ما هي|عرفني|من انت|who are you|what are you)/.test(t)) {
    return "أنا مساعد التطوير المدمج في لوحة «" + ctx.dashboardName + "» — أساعدك في إدارة المشاريع والملفات والأرشيف الذكي والتشغيل والصيانة وتخصيص الواجهة والمزامنة. اسألني أو اطلب مني فتح أي قسم مباشرة (مثال: «افتح الأرشيف الذكي»).";
  }

  if (/(كود|برمج|شفرة|تطوير|code|develop)/.test(t)) {
    return "الوضع المحلي دليل قائم على قواعد لفتح الأقسام والإعدادات، وليس محرر كود. للأسئلة البرمجية وتوليد اقتراحات كود اربط نموذجًا عبر «الإعدادات ← مساعد التطوير». حتى بعد الربط، لا يملك المساعد وصولًا لمستودع التطبيق أو صلاحية تعديل ملفاته وتشغيل أوامره.";
  }

  if (/(رتب|ترتيب|القائمة|الأيقون|ايقون|مكان القوائم|customize|reorder|icon)/.test(t)) {
    return "لإعادة ترتيب القائمة وتغيير الأيقونات: افتح «الإعدادات ← الأقسام والواجهة»، ستجد قسم «تخصيص القائمة الجانبية» فيه: (١) أسهم لرفع/خفض كل عنصر لتغيير ترتيبه، (٢) زر لاختيار أيقونة جديدة لكل قسم من معرض أيقونات، (٣) إظهار/إخفاء الأقسام، و(٤) تحديد مكان الشريط (يمين/يسار/علوي). التغييرات تُحفظ وتُزامن تلقائياً. يمكنك طلب «افتح إعدادات القائمة».";
  }

  if (/(ثيم|سمة|لون|ألوان|مظهر|theme|color|appearance)/.test(t)) {
    return "لتغيير الشكل: «الإعدادات ← المظهر والألوان» — اختر قالباً جاهزاً (جرافيت نحاسي، أزرق معماري Blueprint، فولاذ ذهبي، زمردي ميداني، أو أوضاع فاتحة)، أو حدّد لوناً مميزاً حراً، واضبط حجم الخط والأسطح والكثافة. هل أفتح لك شاشة المظهر؟";
  }

  if (/(مشروع جديد|أضف مشروع|إضافة مشروع|new project)/.test(t)) {
    return "لإضافة مشروع: من «نظرة عامة» اضغط «مشروع جديد»، أو من «المشاريع» اضغط «إضافة مشروع جديد»، ثم أدخل الاسم والمدينة والعميل والتخصص ونسبة الإنجاز. يمكنني فتح نموذج المشروع الجديد لك الآن — هل تريد؟";
  }

  if (/(ارفع|رفع|حمّل|حمل|upload|ملفات جديدة|تصنيف)/.test(t)) {
    return "لرفع الملفات وتصنيفها: من «الأرشيف الذكي» اسحب الملفات أو اضغط «رفع ملفات»؛ يصنّفها النظام آلياً حسب الامتداد والتسمية وقراءة المحتوى النصي (مثل تمييز BOQ أو مخطط تنفيذي أو عقد)، ثم يمكنك مراجعة التصنيف واعتماده. مكتبة الملفات العادية موجودة في «مكتبة الملفات». هل أفتح لك الأرشيف؟";
  }

  if (/(أرشيف|archive)/.test(t)) {
    return "«الأرشيف الذكي» يخزّن ملفات CAD/BIM/PDF/Excel والصور في IndexedDB محلياً، ويصنّفها تلقائياً حسب التخصص والمشروع والتاريخ، مع بحث وفلاتر وتنسيق مع المشاريع. صُنفت " + ctx.archiveCount + " ملفاً حتى الآن. هل تريد فتحه؟";
  }

  if (/(زامن|مزامنة|سحابة|نسخ احتياطي|sync|github|supabase|export|استيراد)/.test(t)) {
    return "للمزامنة: «الإعدادات ← المزامنة والنسخ» اربط GitHub Gist (مجاني وخاص) أو Supabase لمزامنة كل بياناتك بين الأجهزة، أو استخدم «تصدير نسخة احتياطية JSON» / «رمز مزامنة فوري» للنقل السريع. هل أفتح لك شاشة المزامنة؟";
  }

  if (/(صيانة|تشغيل|om|work order|أمر عمل)/.test(t)) {
    return "قسم «التشغيل والصيانة» يدير أوامر العمل (" + ctx.workOrderCount + " أمراً حالياً) بأنواعها: وقائية (PM)، تصحيحية (CM)، إشراف تنفيذ، وفحص — مع الأولوية والحالة وتاريخ الاستحقاق والربط بـ Maximo. هل تريد فتحه؟";
  }

  if (/(سيرة|cv|خبرات|شهاد)/.test(t)) {
    return "يمكنك تعديل السيرة الذاتية والخبرات والشهادات من قسم «السيرة الذاتية والخبرات»، وتحديث البروفايل والصورة من «الإعدادات ← البروفايل». هل أفتح السيرة الذاتية؟";
  }

  if (/(مساعد|ذكي|ai|gpt|ربط.*نموذج|api key|endpoint)/.test(t)) {
    return "مساعد التطوير يعمل بوضعين: (١) وضع محلي مدمج يعرف اللوحة وينفّذ الأوامر مباشرة، و(٢) وضع نموذج لغوي عبر نقطة نهاية متوافقة مع OpenAI (Chat Completions) — اضبطها من «الإعدادات ← مساعد التطوير» بإدخال رابط خادم وسيط والنموذج. مفاتيح المزود تبقى على الخادم ولا تُحفظ داخل المتصفح.";
  }

  if (/(مرحبا|أهلا|السلام|hello|hi|ورد|مساء|صباح)/.test(t)) {
    return "أهلاً بك في «" + ctx.dashboardName + "». أنا مساعد التطوير — يمكنني فتح الأقسام ونماذج إضافة المشاريع ورفع الملفات، وإرشادك لتغيير الشكل وترتيب القائمة. بأي شيء أساعدك؟";
  }

  // Generic helpful fallback
  return (
    "أنا مساعد التطوير في لوحة «" + ctx.dashboardName + "». يمكنني مساعدتك في:\n" +
    "• فتح أي قسم مباشرة (مثال: «افتح الأرشيف الذكي»).\n" +
    "• فتح نموذج إضافة مشروع أو رفع ملفات.\n" +
    "• إرشادك لتخصيص القائمة والأيقونات والثيم.\n" +
    "• المزامنة والنسخ الاحتياطي.\n" +
    "اطرح سؤالك أو اطلب مني تنفيذ خطوة، وسأوجّهك أو أنفّذها. معلومات سريعة عن اللوحة:\n" +
    EXPERT_KB.trim().split("\n").slice(0, 4).join("\n")
  );
}

export interface OfflineResult {
  reply: string;
  action: AssistantAction | null;
}

export function runOfflineAssistant(
  userText: string,
  ctx: DashboardContext
): OfflineResult {
  const action = detectIntent(userText);
  const reply = action
    ? "سأفتح لك الشاشة المطلوبة. يمكنك إكمال التعديل أو الإدخال فيها، وسأظل متاحًا من زر المساعد."
    : matchOffline(userText, ctx);
  return { reply, action };
}

/* -------------------------------------------------------------------------- */
/* LLM (OpenAI-compatible) call with streaming                                 */
/* -------------------------------------------------------------------------- */

export interface StreamCallbacks {
  onToken?: (delta: string) => void;
  onDone?: (full: string, action: AssistantAction | null) => void;
  onError?: (message: string) => void;
}

export async function sendAssistantMessage(
  config: AssistantConfig,
  messages: ChatMessage[],
  cb: StreamCallbacks,
  context: DashboardContext,
  signal?: AbortSignal
): Promise<void> {
  // Local mode needs no network or credentials.
  if (config.provider !== "openai-compatible" || !config.endpointUrl.trim()) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (signal?.aborted) return;
    const res = runOfflineAssistant(lastUser?.content ?? "", context);
    cb.onToken?.(res.reply);
    cb.onDone?.(res.reply, res.action);
    return;
  }

  const payloadMessages = [
    { role: "system", content: config.systemPrompt + "\nأنت مساعد إرشادي؛ لا تملك وصولاً لشفرة التطبيق أو نظام الملفات ولا تستطيع تعديلهما أو تشغيل أوامر برمجية. لا تدّع تنفيذ تعديلات. الإجراءات المتاحة فقط: فتح الأقسام ونماذج الإضافة.\nسياق اللوحة: " + JSON.stringify(context) },
    ...messages.filter((m) => m.role !== "system").slice(-24).map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const res = await fetch(config.endpointUrl.trim(), {
      method: "POST",
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60000)]) : AbortSignal.timeout(60000),
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({
        model: config.model.trim() || "gpt-4o-mini",
        messages: payloadMessages,
        temperature: config.temperature,
        stream: Boolean(config.stream),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}${detail ? ` — ${detail.slice(0, 200)}` : ""}`);
    }

    let full = "";

    if (config.stream && res.body && !res.headers.get("Content-Type")?.includes("application/json")) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let ended = false;
      function consume(line: string) {
        if (!line.trim().startsWith("data:")) return;
        const data = line.trim().slice(5).trim();
        if (data === "[DONE]") { ended = true; return; }
        let json;
        try { json = JSON.parse(data); } catch { return; }
        if (json.error) throw new Error("أبلغ الخادم عن خطأ أثناء توليد الرد");
        const delta = json.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta) { full += delta; cb.onToken?.(delta); }
      }
      try {
        while (!ended) {
          const { done, value } = await reader.read();
          buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) { consume(line); if (ended) break; }
          if (done) { if (buffer && !ended) consume(buffer); break; }
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    } else {
      const json = await res.json();
      full = json.choices?.[0]?.message?.content ?? "";
      cb.onToken?.(full);
    }

    if (!full.trim()) throw new Error("لم يصل رد نصي من الخادم");
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    cb.onDone?.(full, detectIntent(lastUser?.content ?? ""));
  } catch (err) {
    if (signal?.aborted) return;
    const message =
      err instanceof Error
        ? `تعذر الاتصال بنموذج الذكاء الاصطناعي (${err.message}). تأكد من صحة رابط الخادم وإعدادات السماح بالاتصال، أو استخدم الوضع المحلي المدمج.`
        : "تعذر الاتصال بنموذج الذكاء الاصطناعي.";
    cb.onError?.(message);
  }
}
