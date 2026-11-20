import React, { useState } from "react";
import { Check, CheckCircle2, Copy, ExternalLink, FileCode2, Globe, Rocket, Terminal } from "lucide-react";
import { Badge, Button, GitHubMark, Notice, SectionLabel, Stepper } from "./UI";

interface DeployGuideViewProps {
  onNotify: (msg: string) => void;
}

const GIT_COMMANDS = `git init
git add .
git commit -m "Deploy GitDash dashboard"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main`;

const WORKFLOW = `name: Deploy Dashboard to GitHub Pages
on:
  push:
    branches: ["main"]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci && npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
  deploy:
    environment:
      name: github-pages
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/deploy-pages@v4`;

export const DeployGuideView: React.FC<DeployGuideViewProps> = ({ onNotify }) => {
  const [copied, setCopied] = useState<"git" | "yaml" | null>(null);

  const copy = async (text: string, key: "git" | "yaml", label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      onNotify(`تم نسخ ${label}`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      onNotify("تعذر النسخ التلقائي — يمكنك النسخ يدويًا");
    }
  };

  const features = [
    {
      title: "بناء ملف واحد ثابت",
      desc: "يُجمّع المشروع في dist/index.html واحد عبر vite-plugin-singlefile، فلا تتعطل المسارات تحت رابط فرعي مثل /repo.",
    },
    {
      title: "توجيه Hash بدون 404",
      desc: "كل الصفحات تعمل عبر روابط #overview و#calendar، وهي طريقة إعادة التحميل المضمونة على GitHub Pages.",
    },
    {
      title: "بدون خادم أو قاعدة بيانات",
      desc: "GitHub API مباشرة من المتصفح + حفظ محلي للمهام والروابط وإعدادات الواجهة.",
    },
    {
      title: "نشر تلقائي جاهز",
      desc: "ملف .github/workflows/deploy.yml موجود داخل المشروع وينشر الموقع عند كل push لفرع main.",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow mb-1">Deploy · GitHub Pages</div>
          <h1 className="font-display text-xl font-bold text-[var(--ink)] sm:text-2xl">التشغيل على GitHub</h1>
          <p className="mt-0.5 max-w-2xl text-[11px] text-[var(--muted)]">
            لوحة GitDash مشروع ثابت 100% — ارفعه على GitHub وفعّل Pages ليصبح متاحًا على الإنترنت مجانًا.
          </p>
        </div>
        <a href="https://github.com/new" target="_blank" rel="noreferrer" className="btn btn-primary">
          <GitHubMark className="h-3.5 w-3.5" />
          إنشاء مستودع جديد
        </a>
      </div>

      {/* Readiness */}
      <div className="panel overflow-hidden p-4 sm:p-5">
        <div
          className="pointer-events-none absolute -left-16 -top-24 h-56 w-56 rounded-full opacity-70 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(246,178,160,.32), transparent 68%)" }}
        />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <SectionLabel>Readiness checklist</SectionLabel>
              <h2 className="font-display text-lg font-bold text-[var(--ink)]">
                جاهزية النشر <span className="text-[var(--salmon)]">100%</span>
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge tone="success" count={<Check className="h-3 w-3" />} label="Build" />
              <Badge tone="success" count={<Check className="h-3 w-3" />} label="Routing" />
              <Badge tone="info" count={1} label="Static" />
              <Badge tone="pink" count={2} label="Ready" />
            </div>
          </div>

          <div className="mt-4">
            <Stepper steps={["مستودع GitHub", "تفعيل Pages", "نشر تلقائي", "الموقع مباشر"]} current={1} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="panel-inset flex items-start gap-2 rounded-xl p-2.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--success)" }} />
                <div>
                  <div className="text-[11px] font-semibold text-[var(--ink)]">{f.title}</div>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Step 1 */}
        <div className="panel p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-display text-xs font-bold text-[var(--salmon-ink)]"
                style={{ background: "linear-gradient(180deg,#f7b7a8,#e99a87)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.5)" }}
              >
                1
              </span>
              <div>
                <h3 className="text-sm font-bold text-[var(--ink)]">ارفع الكود إلى GitHub</h3>
                <p className="text-[10px] text-[var(--faint)]">استبدل USERNAME و REPO_NAME ببياناتك</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => copy(GIT_COMMANDS, "git", "أوامر Git")}
              className="!px-2 !py-1 !text-[10px]"
              icon={copied === "git" ? <Check className="h-3 w-3" style={{ color: "var(--success)" }} /> : <Copy className="h-3 w-3" />}
            >
              {copied === "git" ? "تم" : "نسخ"}
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[#202a25]" dir="ltr">
            <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2 text-[10px] text-[#9db3a8]">
              <Terminal className="h-3 w-3" />
              <span className="font-mono">terminal</span>
              <span className="mr-auto text-[#ff5b9e]">●</span>
            </div>
            <pre className="overflow-x-auto p-3 font-mono text-[10px] leading-relaxed text-[#a9d3bd]">{GIT_COMMANDS}</pre>
          </div>
        </div>

        {/* Step 2 */}
        <div className="panel p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-display text-xs font-bold text-[var(--salmon-ink)]"
                style={{ background: "linear-gradient(180deg,#f7b7a8,#e99a87)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.5)" }}
              >
                2
              </span>
              <div>
                <h3 className="text-sm font-bold text-[var(--ink)]">فعّل GitHub Pages</h3>
                <p className="text-[10px] text-[var(--faint)]">Settings ← Pages ← Source: GitHub Actions</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => copy(WORKFLOW, "yaml", "ملف النشر deploy.yml")}
              className="!px-2 !py-1 !text-[10px]"
              icon={copied === "yaml" ? <Check className="h-3 w-3" style={{ color: "var(--success)" }} /> : <Copy className="h-3 w-3" />}
            >
              {copied === "yaml" ? "تم" : "نسخ YAML"}
            </Button>
          </div>

          <ol className="mb-2.5 space-y-1.5 text-[10px] leading-relaxed text-[var(--muted)]">
            <li className="flex gap-1.5">
              <span className="text-[var(--salmon)]">01</span>
              افتح المستودع ثم <strong className="mx-1 font-mono text-[var(--ink)]">Settings → Pages</strong>.
            </li>
            <li className="flex gap-1.5">
              <span className="text-[var(--salmon)]">02</span>
              اختر <strong className="mx-1 text-[var(--ink)]">GitHub Actions</strong> من قائمة Source.
            </li>
            <li className="flex gap-1.5">
              <span className="text-[var(--salmon)]">03</span>
              سيُشغّل الملف المضمّن workflow وينشر dist تلقائيًا، ثم يظهر الرابط في تبويب Actions.
            </li>
          </ol>

          <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[#202a25]" dir="ltr">
            <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2 text-[10px] text-[#9db3a8]">
              <FileCode2 className="h-3 w-3" />
              <span className="font-mono">.github/workflows/deploy.yml</span>
            </div>
            <pre className="max-h-[168px] overflow-auto p-3 font-mono text-[9px] leading-relaxed text-[#bcd8c8]">{WORKFLOW}</pre>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Notice
            title="Toast message"
            text="بعد نجاح أول تشغيل، سيكون رابط لوحتك هكذا: https://USERNAME.github.io/REPO_NAME — افتحه على أي جهاز."
            tone="success"
          />
          <div className="panel mt-3 flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2">
              <span className="panel-inset flex h-8 w-8 items-center justify-center rounded-lg" style={{ color: "var(--salmon)" }}>
                <Rocket className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[11px] font-semibold text-[var(--ink)]">تحتاج مساعدة في النشر؟</div>
                <div className="text-[9px] text-[var(--faint)]">الوثائق الرسمية تشرح كل التفاصيل خطوة بخطوة.</div>
              </div>
            </div>
            <a
              href="https://docs.github.com/pages"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary !py-1.5 !text-[10px]"
            >
              <Globe className="h-3.5 w-3.5" />
              توثيق GitHub Pages
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="panel p-4 lg:col-span-4">
          <SectionLabel>Hosting facts</SectionLabel>
          <div className="space-y-2">
            {[
              ["الاستضافة", "GitHub Pages"],
              ["التكلفة", "مجانية"],
              ["النوع", "Static / SPA"],
              ["الخادم", "لا يوجد"],
              ["التخزين", "localStorage"],
              ["البناء", "Vite + React"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-2 text-[10px]">
                <span className="text-[var(--muted)]">{k}</span>
                <span className="chip !py-0.5 !text-[9px] font-mono">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
