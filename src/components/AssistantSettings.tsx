import { useState } from "react";
import { loadAssistantConfig, saveAssistantConfig } from "../services/assistantService";

export default function AssistantSettings({ onNotify }: { onNotify: (message: string) => void }) {
  const [config, setConfig] = useState(loadAssistantConfig);
  const [error, setError] = useState("");
  return <section className="mh-panel">
    <h3>مساعد التطوير</h3>
    <p className="mh-help-text">مساعد داخل اللوحة للإرشاد وفتح الأقسام والنماذج. لا يملك الوصول إلى شفرة المشروع ولا يعدّل الملفات مثل بيئة تطوير كاملة.</p>
    <form className="mh-assistant-config" onSubmit={(e) => {
      e.preventDefault();
      if (config.provider === 'openai-compatible') {
        try {
          const url = new URL(config.endpointUrl, window.location.origin);
          if (!config.endpointUrl.trim() || url.protocol !== 'https:' && url.origin !== window.location.origin || url.username || url.password) throw new Error();
        } catch {
          setError('أدخل رابط خادم وسيط آمن يبدأ بـ https أو مسارًا على نفس الموقع مثل /api/assistant.'); return;
        }
      }
      if (!saveAssistantConfig(config)) { setError('تعذر حفظ الإعدادات. تحقق من مساحة التخزين وصلاحية المتصفح.'); return; }
      setError(''); onNotify('تم حفظ إعدادات المساعد على هذا الجهاز');
    }}>
      <label>وضع التشغيل<select value={config.provider} onChange={(e) => setConfig({ ...config, provider: e.target.value as typeof config.provider })}>
        <option value="offline">دليل محلي بدون اتصال — قواعد وإرشادات</option>
        <option value="openai-compatible">نموذج ذكاء اصطناعي عبر خادم وسيط</option>
      </select></label>
      {config.provider === 'openai-compatible' && <>
        <p className="mh-help-text">أدخل نقطة نهاية متوافقة مع واجهة المحادثة. مفاتيح مزود الذكاء الاصطناعي تُضبط على الخادم فقط، وليس في المتصفح. سيرسل المساعد رسائلك واسم اللوحة والقسم الحالي وأعداد العناصر للخادم عند الإرسال؛ لا يرسل محتوى ملفاتك. إعداد الاتصال محلي ولا يدخل في النسخ الاحتياطية.</p>
        <label>رابط الخادم الوسيط<input dir="ltr" required value={config.endpointUrl} placeholder="/api/assistant"
          onChange={(e) => setConfig({ ...config, endpointUrl: e.target.value })} /></label>
        <label>اسم النموذج<input dir="ltr" required value={config.model} onChange={(e) => setConfig({ ...config, model: e.target.value })} /></label>
        <label>تعليمات المساعد<textarea rows={5} value={config.systemPrompt} onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })} /></label>
        <label className="mh-toggle-row"><span>عرض الرد تدريجيًا</span><input type="checkbox" checked={config.stream} onChange={(e) => setConfig({ ...config, stream: e.target.checked })} /></label>
      </>}
      {error && <p role="alert">{error}</p>}
      <button type="submit" className="mh-choice-pill active">حفظ إعدادات المساعد</button>
    </form>
  </section>;
}
