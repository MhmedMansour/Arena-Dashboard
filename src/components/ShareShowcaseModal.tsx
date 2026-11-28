import { useMemo, useState } from "react";
import {
  Check,
  CheckSquare,
  Copy,
  Download,
  Eye,
  FileText,
  FolderKanban,
  Award,
  Printer,
  Share2,
  ShieldCheck,
  Square,
  X,
  MessageCircle,
  SlidersHorizontal,
} from "lucide-react";
import {
  CvProfileData,
  LibraryFileItem,
  ProfileSettings,
  ProjectItem,
} from "../types/mhmed";
import { ProfileAvatar } from "./ProfileAvatar";
import { formatFileSize } from "../services/archiveStorage";

interface ShareShowcaseModalProps {
  open: boolean;
  onClose: () => void;
  cv: CvProfileData;
  profile: ProfileSettings;
  files: LibraryFileItem[];
  projects: ProjectItem[];
  onToggleFileDisplay: (fileId: string) => void;
  onToggleProjectDisplay: (projectId: string) => void;
  onToggleCertDisplay: (certId: string) => void;
  onPreviewFile: (file: LibraryFileItem) => void;
  onNotify: (msg: string) => void;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function ShareShowcaseModal({
  open,
  onClose,
  cv,
  profile,
  files,
  projects,
  onToggleFileDisplay,
  onToggleProjectDisplay,
  onToggleCertDisplay,
  onPreviewFile,
  onNotify,
}: ShareShowcaseModalProps) {
  const [includeCv, setIncludeCv] = useState(true);
  const [includeSamples, setIncludeSamples] = useState(true);
  const [includeProjects, setIncludeProjects] = useState(true);
  const [includeCerts, setIncludeCerts] = useState(true);
  const [showAllLibraryInPicker, setShowAllLibraryInPicker] = useState(false);
  const [showSelectorPanel, setShowSelectorPanel] = useState(true);
  const [reviewedAndConfirmed, setReviewedAndConfirmed] = useState(false);

  const candidateSamples = useMemo(() => {
    if (showAllLibraryInPicker) return files;
    return files.filter(
      (f) => f.cat === "عينات الأعمال" || f.selectedForDisplay
    );
  }, [files, showAllLibraryInPicker]);

  const selectedSamples = useMemo(
    () =>
      files
        .filter((f) =>
          showAllLibraryInPicker
            ? Boolean(f.selectedForDisplay)
            : (f.cat === "عينات الأعمال" || f.selectedForDisplay) &&
              f.selectedForDisplay !== false
        )
        .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999)),
    [files, showAllLibraryInPicker]
  );

  const selectedProjects = useMemo(
    () => projects.filter((p) => p.selectedForDisplay !== false),
    [projects]
  );

  const selectedCerts = useMemo(
    () =>
      cv.certifications.filter((c) => c.selectedForDisplay !== false),
    [cv.certifications]
  );

  if (!open) return null;

  function buildShareTextSummary(): string {
    const lines: string[] = [];
    if (includeCv) {
      lines.push(`📐 ${cv.fullNameAr}`);
      lines.push(`${cv.jobTitleAr} (${cv.yearsExperience})`);
      lines.push(`📍 ${cv.location} | ☎ ${cv.phone} | ✉ ${cv.email}`);
      lines.push("");
    }
    if (includeSamples && selectedSamples.length > 0) {
      lines.push(`📂 عينات الأعمال الهندسية المختارة (${selectedSamples.length}):`);
      selectedSamples.forEach((s, idx) => {
        const proj = projects.find((p) => p.id === s.project)?.name;
        lines.push(
          `${idx + 1}. ${s.name}${proj ? ` — (${proj})` : ""}${
            s.notes ? `: ${s.notes}` : ""
          }`
        );
      });
      lines.push("");
    }
    if (includeProjects && selectedProjects.length > 0) {
      lines.push(`🏗️ أبرز المشاريع المختارة (${selectedProjects.length}):`);
      selectedProjects.forEach((p, idx) => {
        lines.push(`${idx + 1}. ${p.name} (${p.city}) — ${p.type}`);
      });
      lines.push("");
    }
    if (includeCerts && selectedCerts.length > 0) {
      lines.push(`🎓 المؤهلات والاعتمادات (${selectedCerts.length}):`);
      selectedCerts.forEach((c) => {
        lines.push(`• ${c.title} — ${c.issuer} (${c.year})`);
      });
    }
    return lines.join("\n").trim();
  }

  function buildStandaloneShowcaseHtml(): string {
    const samplesHtml =
      includeSamples && selectedSamples.length > 0
        ? `<h2>عينات الأعمال الهندسية المختارة (${selectedSamples.length})</h2>
          <div class="grid">${selectedSamples
            .map((s) => {
              const projName =
                projects.find((p) => p.id === s.project)?.name || s.cat;
              const ext = (s.name.split(".").pop() || "FILE").toUpperCase();
              return `<div class="card">
                <div class="badge">${escapeHtml(ext)} · ${escapeHtml(
                  formatFileSize(s.size)
                )}</div>
                <h3>${escapeHtml(s.name)}</h3>
                <div class="sub">${escapeHtml(projName)}</div>
                ${
                  s.notes
                    ? `<p class="notes">${escapeHtml(s.notes)}</p>`
                    : ""
                }
              </div>`;
            })
            .join("")}</div>`
        : "";

    const projectsHtml =
      includeProjects && selectedProjects.length > 0
        ? `<h2>المشاريع الهندسية المختارة (${selectedProjects.length})</h2>
          <div class="grid">${selectedProjects
            .map(
              (p) => `<div class="card">
                <div class="badge">${escapeHtml(p.type)} · إنجاز ${
                  p.progress
                }%</div>
                <h3>${escapeHtml(p.name)}</h3>
                <div class="sub">${escapeHtml(p.city)}${
                  p.client ? ` · ${escapeHtml(p.client)}` : ""
                }</div>
                ${p.notes ? `<p class="notes">${escapeHtml(p.notes)}</p>` : ""}
              </div>`
            )
            .join("")}</div>`
        : "";

    const certsHtml =
      includeCerts && selectedCerts.length > 0
        ? `<h2>المؤهلات والاعتمادات (${selectedCerts.length})</h2>
          <div class="grid">${selectedCerts
            .map(
              (c) => `<div class="card">
                <div class="badge">${escapeHtml(c.category)} · ${escapeHtml(
                  c.year
                )}</div>
                <h3>${escapeHtml(c.title)}</h3>
                <div class="sub">${escapeHtml(c.issuer)}</div>
              </div>`
            )
            .join("")}</div>`
        : "";

    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>ملف العرض الهندسي — ${escapeHtml(cv.fullNameAr)}</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background:#f5f4ef; color:#1f2429; margin:0; padding:28px 16px; line-height:1.65; }
  .sheet { max-width:940px; margin:0 auto; background:#fff; border:1px solid #dedad0; border-radius:14px; padding:28px; box-shadow:0 8px 28px rgba(0,0,0,.06); }
  .hero { border-bottom:3px solid #c25e28; padding-bottom:18px; margin-bottom:22px; }
  h1 { margin:0; font-size:26px; }
  .role { color:#b4531f; font-weight:700; margin:6px 0; }
  .meta { display:flex; flex-wrap:wrap; gap:14px; font-size:13px; color:#555; }
  h2 { font-size:18px; color:#b4531f; margin:24px 0 12px; border-bottom:1px solid #e6e2d8; padding-bottom:6px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:12px; }
  .card { background:#faf9f5; border:1px solid #e2ded4; border-radius:10px; padding:14px; }
  .card h3 { margin:8px 0 4px; font-size:15px; }
  .badge { display:inline-block; font-size:11px; font-weight:700; color:#b4531f; background:#f3ebe2; padding:2px 8px; border-radius:99px; }
  .sub { font-size:12.5px; color:#5d646b; }
  .notes { margin:8px 0 0; font-size:12.5px; color:#333; }
  @media print { body { background:#fff; padding:0; } .sheet { box-shadow:none; border:0; } }
</style>
</head>
<body>
  <div class="sheet">
    ${
      includeCv
        ? `<div class="hero">
            <h1>${escapeHtml(cv.fullNameAr)}</h1>
            <div style="font-size:13px;color:#666">${escapeHtml(
              cv.fullNameEn
            )}</div>
            <div class="role">${escapeHtml(cv.jobTitleAr)}</div>
            <div class="meta">
              <span>📍 ${escapeHtml(cv.location)}</span>
              <span>☎ ${escapeHtml(cv.phone)}</span>
              <span>✉ ${escapeHtml(cv.email)}</span>
              <span>💼 ${escapeHtml(cv.yearsExperience)}</span>
            </div>
            <p style="margin:12px 0 0;font-size:13.5px">${escapeHtml(
              cv.objectiveAr
            )}</p>
          </div>`
        : ""
    }
    ${samplesHtml}
    ${projectsHtml}
    ${certsHtml}
  </div>
</body>
</html>`;
  }

  function ensureConfirmed(): boolean {
    if (!reviewedAndConfirmed) {
      onNotify("يرجى مراجعة المعاينة بالأسفل وتفعيل مربع «اطلعت على المحتوى وأعتمد المشاركة» أولاً");
      return false;
    }
    return true;
  }

  async function handleNativeOrClipboardShare() {
    if (!ensureConfirmed()) return;
    const summary = buildShareTextSummary();
    if (!summary) {
      onNotify("حدد قسماً واحداً على الأقل للمشاركة");
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ملف الأعمال الهندسية — ${cv.fullNameAr}`,
          text: summary,
        });
        onNotify("تمت المشاركة بنجاح");
        return;
      } catch {
        // user cancelled or share unsupported
      }
    }
    await navigator.clipboard?.writeText(summary);
    onNotify("تم نسخ ملخص العرض المختار للحافظة — جاهز للإرسال");
  }

  function handleWhatsAppShare() {
    if (!ensureConfirmed()) return;
    const summary = buildShareTextSummary();
    if (!summary) {
      onNotify("حدد قسماً واحداً على الأقل للمشاركة");
      return;
    }
    const url = `https://wa.me/?text=${encodeURIComponent(summary)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleDownloadHtmlShowcase() {
    if (!ensureConfirmed()) return;
    const html = buildStandaloneShowcaseHtml();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Mhmed_Showcase_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    onNotify("تم تصدير صفحة العرض المستقلة (.HTML) بالعناصر المختارة فقط");
  }

  function handlePrintShowcase() {
    if (!ensureConfirmed()) return;
    const html = buildStandaloneShowcaseHtml();
    const w = window.open("", "_blank", "width=960,height=920");
    if (!w) {
      onNotify("يرجى السماح بالنوافذ المنبثقة للطباعة أو استخدم تصدير HTML");
      return;
    }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 300);
  }

  return (
    <div className="overlay" style={{ zIndex: 28 }} onClick={onClose}>
      <section
        className="dialog mh-showcase-dialog"
        role="dialog"
        aria-label="اختيار العينات ومعاينة العرض قبل المشاركة"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sa-preview-header">
          <div>
            <small className="eyebrow">
              PRE-SHARE REVIEW &amp; SAMPLE CURATION · المعاينة قبل المشاركة
            </small>
            <h2 style={{ margin: "2px 0 0" }}>
              اختيار العينات المعروضة والاطلاع عليها قبل المشاركة
            </h2>
          </div>
          <div className="mh-btn-row">
            <button
              type="button"
              className={`sa-btn-subtle ${showSelectorPanel ? "active" : ""}`}
              onClick={() => setShowSelectorPanel((v) => !v)}
            >
              <SlidersHorizontal size={15} />
              {showSelectorPanel ? "إخفاء لوحة الاختيار" : "تعديل اختيار العينات"}
            </button>
            <button type="button" className="sa-btn-subtle" onClick={onClose}>
              <X size={16} /> إغلاق
            </button>
          </div>
        </div>

        <div className="sa-analysis-note warn" style={{ marginBottom: 12 }}>
          <ShieldCheck size={16} />
          <span>
            <b>تحكم كامل قبل المشاركة:</b> اختر بالضبط العينات والمشاريع والشهادات التي
            تريد إظهارها، واضغط زر <b>«معاينة الملف»</b> على أي عينة للاطلاع عليها
            بنفسك قبل مشاركة أو تصدير أي شيء.
          </span>
        </div>

        {/* Step 1: Curate / Select Which Samples & Sections Are Displayed */}
        {showSelectorPanel && (
          <div className="mh-inset-card" style={{ marginBottom: 14 }}>
            <div className="mh-flex-between" style={{ marginBottom: 10 }}>
              <b>1. اختر الأقسام والعينات التي تود إظهارها في العرض:</b>
              <button
                type="button"
                className="mh-choice-pill"
                onClick={() => setShowAllLibraryInPicker((v) => !v)}
              >
                {showAllLibraryInPicker
                  ? "إظهار قسم عينات الأعمال فقط"
                  : "عرض كل ملفات المكتبة لاختيار عينات إضافية"}
              </button>
            </div>

            <div className="mh-badges-row" style={{ marginBottom: 12 }}>
              <button
                type="button"
                className={`mh-choice-pill ${includeCv ? "active" : ""}`}
                onClick={() => setIncludeCv((v) => !v)}
              >
                {includeCv ? <Check size={13} /> : <X size={13} />} البطاقة التعريفية (CV)
              </button>
              <button
                type="button"
                className={`mh-choice-pill ${includeSamples ? "active" : ""}`}
                onClick={() => setIncludeSamples((v) => !v)}
              >
                {includeSamples ? <Check size={13} /> : <X size={13} />} عينات الأعمال (
                {selectedSamples.length})
              </button>
              <button
                type="button"
                className={`mh-choice-pill ${includeProjects ? "active" : ""}`}
                onClick={() => setIncludeProjects((v) => !v)}
              >
                {includeProjects ? <Check size={13} /> : <X size={13} />} المشاريع (
                {selectedProjects.length})
              </button>
              <button
                type="button"
                className={`mh-choice-pill ${includeCerts ? "active" : ""}`}
                onClick={() => setIncludeCerts((v) => !v)}
              >
                {includeCerts ? <Check size={13} /> : <X size={13} />} الشهادات (
                {selectedCerts.length})
              </button>
            </div>

            {includeSamples && (
              <div style={{ marginBottom: 10 }}>
                <small style={{ marginBottom: 6, fontWeight: 600 }}>
                  تحديد عينات الأعمال المعروضة (اضغط على العينة لتفعيلها أو إخفائها، أو
                  اضغط «اطّلع» لمعاينة محتواها):
                </small>
                <div className="mh-sample-picker-list">
                  {candidateSamples.length === 0 ? (
                    <small>لا توجد عينات حالياً — ارفع ملفات في قسم عينات الأعمال.</small>
                  ) : (
                    candidateSamples.map((f) => {
                      const checked = showAllLibraryInPicker
                        ? Boolean(f.selectedForDisplay)
                        : f.selectedForDisplay !== false;
                      return (
                        <div
                          key={f.id}
                          className={`mh-sample-pick-item ${
                            checked ? "checked" : ""
                          }`}
                        >
                          <button
                            type="button"
                            className="mh-sample-check-btn"
                            onClick={() => {
                              onToggleFileDisplay(f.id);
                              setReviewedAndConfirmed(false);
                            }}
                          >
                            {checked ? (
                              <CheckSquare size={17} className="sa-copper-icon" />
                            ) : (
                              <Square size={17} />
                            )}
                            <span>{f.name}</span>
                          </button>
                          <button
                            type="button"
                            className="sa-btn-subtle"
                            onClick={() => onPreviewFile(f)}
                            title="الاطلاع على محتوى الملف قبل المشاركة"
                          >
                            <Eye size={14} /> اطّلع
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {includeProjects && projects.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <small style={{ marginBottom: 6, fontWeight: 600 }}>
                  تحديد المشاريع المعروضة ({selectedProjects.length} من {projects.length}):
                </small>
                <div className="mh-badges-row">
                  {projects.map((p) => {
                    const checked = p.selectedForDisplay !== false;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`mh-choice-pill ${checked ? "active" : ""}`}
                        onClick={() => {
                          onToggleProjectDisplay(p.id);
                          setReviewedAndConfirmed(false);
                        }}
                      >
                        {checked ? <Check size={12} /> : null} {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {includeCerts && cv.certifications.length > 0 && (
              <div>
                <small style={{ marginBottom: 6, fontWeight: 600 }}>
                  تحديد الشهادات والاعتمادات ({selectedCerts.length} من{" "}
                  {cv.certifications.length}):
                </small>
                <div className="mh-badges-row">
                  {cv.certifications.map((c) => {
                    const checked = c.selectedForDisplay !== false;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`mh-choice-pill ${checked ? "active" : ""}`}
                        onClick={() => {
                          onToggleCertDisplay(c.id);
                          setReviewedAndConfirmed(false);
                        }}
                      >
                        {checked ? <Check size={12} /> : null} {c.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Live Preview of Curated Portfolio */}
        <div className="mh-showcase-live-box">
          <div className="mh-showcase-live-banner">
            <span>
              <Eye size={14} /> المعاينة الحية للعرض المختار (هكذا سيظهر تماماً عند
              المشاركة)
            </span>
            <small>
              العينات: {includeSamples ? selectedSamples.length : 0} · المشاريع:{" "}
              {includeProjects ? selectedProjects.length : 0} · الشهادات:{" "}
              {includeCerts ? selectedCerts.length : 0}
            </small>
          </div>

          <div className="mh-showcase-canvas">
            {includeCv && (
              <div className="mh-inset-card" style={{ marginBottom: 14 }}>
                <div className="mh-quick-profile">
                  <ProfileAvatar profile={profile} size="lg" showStatusDot />
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: "0 0 3px" }}>{cv.fullNameAr}</h3>
                    <small style={{ color: "var(--accent)", fontWeight: 600 }}>
                      {cv.jobTitleAr}
                    </small>
                    <small style={{ marginTop: 4 }}>
                      {cv.location} · {cv.phone} · {cv.email} · {cv.yearsExperience}
                    </small>
                  </div>
                </div>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 12.5,
                    color: "var(--muted)",
                    lineHeight: 1.65,
                  }}
                >
                  {cv.objectiveAr}
                </p>
              </div>
            )}

            {includeSamples && (
              <div style={{ marginBottom: 14 }}>
                <h4 className="mh-small-head">
                  <FileText
                    size={15}
                    className="sa-copper-icon"
                    style={{ display: "inline", verticalAlign: "middle" }}
                  />{" "}
                  عينات الأعمال المختارة للعرض ({selectedSamples.length})
                </h4>
                {selectedSamples.length === 0 ? (
                  <p className="empty">
                    لم يتم تحديد أي عينات بعد — فعّل عينة واحدة على الأقل من الأعلى.
                  </p>
                ) : (
                  <div className="mh-cv-projects-grid">
                    {selectedSamples.map((s) => {
                      const proj = projects.find((p) => p.id === s.project);
                      return (
                        <div key={s.id} className="mh-inset-card mh-showcase-sample-card">
                          {typeof s.art === "number" && (
                            <div
                              className="mh-showcase-thumb"
                              style={{
                                backgroundImage: `url(./art/${s.art}.svg)`,
                              }}
                            />
                          )}
                          <div className="mh-flex-between" style={{ marginTop: 6 }}>
                            <span className="sa-ext-badge">
                              {(s.name.split(".").pop() || "FILE").toUpperCase()}
                            </span>
                            <small>{formatFileSize(s.size)}</small>
                          </div>
                          <b style={{ display: "block", margin: "6px 0 3px" }}>
                            {s.name}
                          </b>
                          <small>{proj ? proj.name : s.cat}</small>
                          {s.notes && (
                            <p
                              style={{
                                margin: "6px 0 0",
                                fontSize: 12,
                                color: "var(--muted)",
                              }}
                            >
                              {s.notes}
                            </p>
                          )}
                          <button
                            type="button"
                            className="sa-btn-subtle active"
                            style={{ marginTop: 10, width: "100%", justifyContent: "center" }}
                            onClick={() => onPreviewFile(s)}
                          >
                            <Eye size={14} /> معاينة الملف والاطلاع عليه بالكامل
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {includeProjects && selectedProjects.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <h4 className="mh-small-head">
                  <FolderKanban
                    size={15}
                    className="sa-copper-icon"
                    style={{ display: "inline", verticalAlign: "middle" }}
                  />{" "}
                  المشاريع الهندسية المختارة ({selectedProjects.length})
                </h4>
                <div className="mh-cv-projects-grid">
                  {selectedProjects.map((p) => (
                    <div key={p.id} className="mh-inset-card">
                      <div className="mh-flex-between">
                        <span className="mh-pill accent">{p.type}</span>
                        <small>{p.city}</small>
                      </div>
                      <b style={{ display: "block", margin: "6px 0 3px" }}>
                        {p.name}
                      </b>
                      {p.notes && <small>{p.notes}</small>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {includeCerts && selectedCerts.length > 0 && (
              <div>
                <h4 className="mh-small-head">
                  <Award
                    size={15}
                    className="sa-copper-icon"
                    style={{ display: "inline", verticalAlign: "middle" }}
                  />{" "}
                  الشهادات والاعتمادات ({selectedCerts.length})
                </h4>
                <div className="mh-cv-projects-grid">
                  {selectedCerts.map((c) => (
                    <div key={c.id} className="mh-inset-card">
                      <span className="mh-pill accent">{c.category}</span>
                      <b style={{ display: "block", margin: "6px 0 2px" }}>
                        {c.title}
                      </b>
                      <small>
                        {c.issuer} · {c.year}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Explicit Review Confirmation + Share Buttons */}
        <div className="mh-showcase-footer">
          <label className="mh-toggle-row" style={{ margin: 0, flex: 1, minWidth: 260 }}>
            <span>
              <b>اطّلعت على العينات والبيانات المعروضة أعلاه وأعتمد مشاركتها الآن</b>
            </span>
            <input
              type="checkbox"
              checked={reviewedAndConfirmed}
              onChange={(e) => setReviewedAndConfirmed(e.target.checked)}
            />
          </label>

          <div className="mh-btn-row">
            <button
              type="button"
              className="primary mh-btn-nomargin"
              onClick={handleNativeOrClipboardShare}
            >
              <Share2 size={15} /> مشاركة الآن
            </button>
            <button
              type="button"
              className="sa-btn-subtle active"
              onClick={handleWhatsAppShare}
            >
              <MessageCircle size={15} /> واتساب
            </button>
            <button
              type="button"
              className="sa-btn-subtle"
              onClick={handleDownloadHtmlShowcase}
            >
              <Download size={15} /> تصدير صفحة عرض (.HTML)
            </button>
            <button
              type="button"
              className="sa-btn-subtle"
              onClick={handlePrintShowcase}
            >
              <Printer size={15} /> طباعة / PDF
            </button>
            <button
              type="button"
              className="sa-btn-subtle"
              onClick={async () => {
                if (!ensureConfirmed()) return;
                await navigator.clipboard?.writeText(buildShareTextSummary());
                onNotify("تم نسخ نص العرض المنسّق للحافظة");
              }}
            >
              <Copy size={15} /> نسخ النص
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
