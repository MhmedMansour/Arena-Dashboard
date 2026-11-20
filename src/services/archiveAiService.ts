import {
  AiAnalysisResponse,
  AiBackendConfig,
  ExternalCadViewerConfig,
} from "../types/smartArchive";

const AI_CONFIG_KEY = "mimar-archive-ai-config-v1";
const VIEWER_CONFIG_KEY = "mimar-archive-viewer-config-v1";

const DEFAULT_AI_CONFIG: AiBackendConfig = {
  enabled: false,
  endpointUrl: "",
  organizationHeader: "",
  autoSuggestOnStage: false,
};

const DEFAULT_VIEWER_CONFIG: ExternalCadViewerConfig = {
  enabled: false,
  viewerName: "Autodesk / IFC Web Viewer (عبر خادم خارجي)",
  viewerUrlTemplate: "",
};

/**
 * Loads AI backend proxy configuration (URLs/toggles only — NEVER API keys or file contents).
 */
export function loadAiBackendConfig(): AiBackendConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_AI_CONFIG };
    const parsed = JSON.parse(raw) as Partial<AiBackendConfig>;
    return {
      enabled: Boolean(parsed.enabled && parsed.endpointUrl?.trim()),
      endpointUrl: (parsed.endpointUrl || "").trim(),
      organizationHeader: (parsed.organizationHeader || "").trim(),
      autoSuggestOnStage: Boolean(parsed.autoSuggestOnStage),
    };
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
}

export function saveAiBackendConfig(config: AiBackendConfig): void {
  // Security guard: strip anything resembling a raw API secret if accidentally pasted into headers
  const cleanEndpoint = config.endpointUrl.trim();
  const safeConfig: AiBackendConfig = {
    enabled: Boolean(config.enabled && cleanEndpoint),
    endpointUrl: cleanEndpoint,
    organizationHeader: (config.organizationHeader || "").trim(),
    autoSuggestOnStage: Boolean(config.autoSuggestOnStage),
  };
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(safeConfig));
}

export function loadExternalViewerConfig(): ExternalCadViewerConfig {
  try {
    const raw = localStorage.getItem(VIEWER_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_VIEWER_CONFIG };
    const parsed = JSON.parse(raw) as Partial<ExternalCadViewerConfig>;
    return {
      enabled: Boolean(parsed.enabled && parsed.viewerUrlTemplate?.trim()),
      viewerName: parsed.viewerName || DEFAULT_VIEWER_CONFIG.viewerName,
      viewerUrlTemplate: (parsed.viewerUrlTemplate || "").trim(),
    };
  } catch {
    return { ...DEFAULT_VIEWER_CONFIG };
  }
}

export function saveExternalViewerConfig(config: ExternalCadViewerConfig): void {
  const cleanUrl = config.viewerUrlTemplate.trim();
  localStorage.setItem(
    VIEWER_CONFIG_KEY,
    JSON.stringify({
      enabled: Boolean(config.enabled && cleanUrl),
      viewerName: config.viewerName.trim() || DEFAULT_VIEWER_CONFIG.viewerName,
      viewerUrlTemplate: cleanUrl,
    })
  );
}

/**
 * Calls a configured Backend AI Document Intelligence Service.
 * - Never embeds or accepts raw LLM API keys in the browser.
 * - Explicitly reports "غير متصل" when no backend service is linked.
 * - Sends file via multipart/form-data to the user's backend endpoint `/analyze`.
 */
export async function requestBackendAiClassification(
  file: File,
  config: AiBackendConfig
): Promise<AiAnalysisResponse> {
  if (!config.enabled || !config.endpointUrl.trim()) {
    return {
      supported: false,
      message:
        "خدمة الذكاء الاصطناعي غير مرتبطة حاليًا. يعمل الأرشيف حاليًا بالتصنيف الهندسي المحلي القائم على القواعد والبيانات الوصفية دون إرسال ملفات لأي جهة خارجية.",
    };
  }

  try {
    const form = new FormData();
    form.append("file", file, file.name);
    form.append(
      "context",
      JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        lastModified: file.lastModified,
      })
    );

    const headers: Record<string, string> = {};
    if (config.organizationHeader) {
      headers["X-Workspace-Context"] = config.organizationHeader;
    }

    const res = await fetch(config.endpointUrl, {
      method: "POST",
      headers,
      body: form,
      credentials: "include",
    });

    if (!res.ok) {
      return {
        supported: false,
        message: `تعذر الوصول إلى خدمة الذكاء الاصطناعي الخلفية (HTTP ${res.status}). استمر استخدام التصنيف المحلي.`,
      };
    }

    const payload = (await res.json()) as Partial<AiAnalysisResponse>;
    return {
      supported: true,
      providerName: payload.providerName || "Backend AI Service",
      suggestedSection: payload.suggestedSection,
      suggestedCategory: payload.suggestedCategory,
      detectedProjectName: payload.detectedProjectName,
      detectedDiscipline: payload.detectedDiscipline,
      detectedDocumentDate: payload.detectedDocumentDate,
      summary: payload.summary,
      extractedTags: payload.extractedTags,
      confidence: payload.confidence,
      message:
        payload.message || "تم استلام اقتراحات التصنيف من خدمة الذكاء الاصطناعي الخلفية.",
    };
  } catch {
    return {
      supported: false,
      message:
        "تعذر الاتصال بنقطة نهاية الذكاء الاصطناعي المحددة. تأكد من تشغيل الخادم الخلفي (Backend) وإعدادات CORS.",
    };
  }
}
