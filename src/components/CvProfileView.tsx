import { useState, useRef, useEffect } from "react";
import {
  Briefcase,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Globe,
  UserCheck,
  Award,
  FileText,
  Download,
  Upload,
  Eye,
  Edit3,
  Check,
  X,
  Plus,
  Trash2,
  Printer,
  Wrench,
  Layers,
  Building2,
  ChevronDown,
  ChevronUp,
  Camera,
} from "lucide-react";
import { CvExperience, CvProfileData, CvSkill, ProfileSettings } from "../types/mhmed";
import { ProfileAvatar } from "./ProfileAvatar";
import {
  clearCustomCvPdf,
  loadCustomCvPdf,
  saveCustomCvPdf,
} from "../services/syncService";

interface CvProfileViewProps {
  cv: CvProfileData;
  profile: ProfileSettings;
  onUpdateCv: (next: CvProfileData) => void;
  onOpenAvatarSettings: () => void;
  onNotify: (msg: string) => void;
}

const BUILTIN_CV_URL = "./cv/Mohamed_Mansour_CV.pdf";

export default function CvProfileView({
  cv,
  profile,
  onUpdateCv,
  onOpenAvatarSettings,
  onNotify,
}: CvProfileViewProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CvProfileData>(cv);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>(BUILTIN_CV_URL);
  const [pdfLabel, setPdfLabel] = useState<string>(cv.customPdfName || "CV_2025120123283578.pdf");
  const [expandedProject, setExpandedProject] = useState<string>("cvp-7");

  // New item forms in edit mode
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCat, setNewSkillCat] = useState<CvSkill["category"]>("CAD / BIM");
  const [newSkillLevel, setNewSkillLevel] = useState(90);
  const [newResp, setNewResp] = useState("");

  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(cv);
  }, [cv]);

  useEffect(() => {
    let revokedUrl = "";
    loadCustomCvPdf().then((saved) => {
      if (saved?.blob) {
        const url = URL.createObjectURL(saved.blob);
        revokedUrl = url;
        setPdfUrl(url);
        setPdfLabel(saved.name);
      } else {
        setPdfUrl(BUILTIN_CV_URL);
        setPdfLabel("CV_2025120123283578.pdf");
      }
    });
    return () => {
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [cv.hasCustomPdf, cv.customPdfName]);

  async function handleUploadPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      onNotify("يرجى اختيار ملف بصيغة PDF فقط");
      return;
    }
    try {
      await saveCustomCvPdf(file);
      const next = { ...cv, hasCustomPdf: true, customPdfName: file.name };
      onUpdateCv(next);
      onNotify(`تم تحديث ملف السيرة الذاتية: ${file.name}`);
    } catch {
      onNotify("تعذر حفظ ملف الـ PDF في التخزين المحلي");
    }
    e.target.value = "";
  }

  async function handleResetPdf() {
    await clearCustomCvPdf();
    onUpdateCv({
      ...cv,
      hasCustomPdf: false,
      customPdfName: "CV_2025120123283578.pdf",
    });
    onNotify("تم استرجاع ملف السيرة الذاتية الأصلي المرفق");
  }

  function saveEdits() {
    onUpdateCv(draft);
    setEditing(false);
    onNotify("تم حفظ تعديلات السيرة الذاتية ومزامنتها");
  }

  function addExperience() {
    const item: CvExperience = {
      id: "exp-" + Date.now(),
      company: "Company Name",
      companyAr: "اسم الشركة",
      role: "رسام هندسي MEP / مشرف تشغيل وصيانة",
      location: "الرياض، السعودية",
      period: "2026 - حتى الآن",
      highlights: ["إعداد مخططات AutoCAD & Revit والإشراف على التنفيذ والصيانة."],
    };
    setDraft({ ...draft, experiences: [item, ...draft.experiences] });
  }

  function addSkill() {
    if (!newSkillName.trim()) return;
    setDraft({
      ...draft,
      skills: [
        ...draft.skills,
        {
          id: "sk-" + Date.now(),
          name: newSkillName.trim(),
          category: newSkillCat,
          level: newSkillLevel,
        },
      ],
    });
    setNewSkillName("");
  }

  function addResponsibility() {
    if (!newResp.trim()) return;
    setDraft({
      ...draft,
      responsibilities: [...draft.responsibilities, newResp.trim()],
    });
    setNewResp("");
  }

  function handlePrintCv() {
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) {
      window.print();
      return;
    }
    w.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${cv.fullNameAr} — السيرة الذاتية</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color:#1f2429; max-width:860px; margin:24px auto; padding:0 24px; line-height:1.65; }
  .head { border-bottom:3px solid #ba5c2a; padding-bottom:14px; margin-bottom:18px; }
  h1 { margin:0; font-size:26px; color:#1f2429; }
  .en { font-size:13px; color:#5a626a; letter-spacing:.8px; margin-top:2px; }
  .role { color:#a04c20; font-weight:700; margin-top:6px; font-size:15px; }
  .meta { display:flex; flex-wrap:wrap; gap:14px; font-size:12.5px; color:#454c54; margin-top:10px; }
  h2 { font-size:16px; color:#a04c20; border-bottom:1px solid #d9d6cf; padding-bottom:4px; margin:20px 0 10px; }
  .item { margin-bottom:11px; }
  .item-head { display:flex; justify-content:space-between; gap:10px; font-weight:700; font-size:14px; }
  .sub { font-size:12.5px; color:#555; }
  ul { margin:6px 0 0; padding-right:18px; font-size:13px; }
  .skills { display:flex; flex-wrap:wrap; gap:8px; }
  .chip { background:#f3efe9; border:1px solid #ddd6ca; padding:4px 10px; border-radius:4px; font-size:12px; }
  @media print { body { margin:0; } }
</style>
</head>
<body>
  <div class="head">
    <h1>${cv.fullNameAr}</h1>
    <div class="en">${cv.fullNameEn}</div>
    <div class="role">${cv.jobTitleAr}</div>
    <div class="meta">
      <span>✉ ${cv.email}</span>
      <span>☎ ${cv.phone}</span>
      <span>📍 ${cv.location}</span>
      <span>🌍 ${cv.nationality}</span>
      <span>💼 ${cv.yearsExperience}</span>
    </div>
  </div>
  <h2>الهدف المهني</h2>
  <p style="font-size:13.5px;margin:0">${cv.objectiveAr}</p>
  <h2>الخبرات العملية</h2>
  ${cv.experiences
    .map(
      (exp) => `<div class="item">
        <div class="item-head"><span>${exp.companyAr} (${exp.company})</span><span>${exp.period}</span></div>
        <div class="sub">${exp.role} — ${exp.location}</div>
      </div>`
    )
    .join("")}
  <h2>أبرز المشاريع</h2>
  <ul>${cv.cvProjects
    .map(
      (p) =>
        `<li><b>${p.nameAr}</b> (${p.location}) — ${p.discipline}${
          p.subLocations?.length ? `: ${p.subLocations.join("، ")}` : ""
        }</li>`
    )
    .join("")}</ul>
  <h2>المهارات التقنية والإشرافية</h2>
  <div class="skills">${cv.skills
    .map((s) => `<span class="chip">${s.name} (${s.level}%)</span>`)
    .join("")}</div>
  <h2>المهام والمسؤوليات</h2>
  <ul>${cv.responsibilities.map((r) => `<li>${r}</li>`).join("")}</ul>
  <h2>التعليم والمؤهلات</h2>
  ${cv.education
    .map(
      (e) => `<div class="item"><b>${e.institutionAr} (${e.institutionEn})</b> — ${e.year} · التقدير: ${e.grade}</div>`
    )
    .join("")}
</body>
</html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  }

  const skillGroups = Array.from(new Set(cv.skills.map((s) => s.category)));

  return (
    <div className="mh-stack">
      {/* Executive CV Header Card */}
      <section className="mh-cv-hero">
        <div className="mh-cv-identity">
          <div className="mh-cv-avatar-wrap">
            <ProfileAvatar
              profile={profile}
              size="xl"
              showStatusDot
              onClick={onOpenAvatarSettings}
              title="اضغط لتغيير صورة البروفايل أو شكلها"
            />
            <button
              type="button"
              className="mh-cv-avatar-edit"
              onClick={onOpenAvatarSettings}
              title="تغيير صورة البروفايل وشكلها"
            >
              <Camera size={14} />
            </button>
          </div>
          <div className="mh-cv-info">
            <div className="mh-badges-row">
              <span className="mh-pill accent">
                <Layers size={12} /> رسام AutoCAD & Revit MEP
              </span>
              <span className="mh-pill">
                <Wrench size={12} /> مشرف تشغيل وصيانة وتنفيذ كهرباء وميكانيكا
              </span>
              <span className="mh-pill ok">{cv.yearsExperience}</span>
            </div>
            <h1>{cv.fullNameAr}</h1>
            <p className="mh-cv-en">{cv.fullNameEn}</p>
            <p className="mh-cv-role">{cv.jobTitleAr}</p>
            <div className="mh-contact-chips">
              <a href={`mailto:${cv.email}`}>
                <Mail size={14} /> {cv.email}
              </a>
              <a href={`tel:${cv.phone.replace(/\s+/g, "")}`} dir="ltr">
                <Phone size={14} /> {cv.phone}
              </a>
              <span>
                <MapPin size={14} /> {cv.location}
              </span>
              <span>
                <Globe size={14} /> {cv.nationality}
              </span>
              <span>
                <UserCheck size={14} /> {cv.maritalStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="mh-cv-actions">
          <button
            type="button"
            className="primary mh-btn-nomargin"
            onClick={() => setShowPdfModal(true)}
          >
            <Eye size={16} /> عرض CV الأصلي (PDF)
          </button>
          <a href={pdfUrl} download={pdfLabel} className="sa-btn-subtle">
            <Download size={15} /> تنزيل PDF
          </a>
          <button
            type="button"
            className="sa-btn-subtle"
            onClick={() => pdfInputRef.current?.click()}
          >
            <Upload size={15} /> استبدال ملف PDF
          </button>
          <button type="button" className="sa-btn-subtle" onClick={handlePrintCv}>
            <Printer size={15} /> طباعة نسخة منسّقة
          </button>
          {!editing ? (
            <button
              type="button"
              className="sa-btn-subtle active"
              onClick={() => setEditing(true)}
            >
              <Edit3 size={15} /> تعديل بيانات السيرة
            </button>
          ) : (
            <>
              <button
                type="button"
                className="primary mh-btn-nomargin"
                onClick={saveEdits}
              >
                <Check size={15} /> حفظ التعديلات
              </button>
              <button
                type="button"
                className="sa-btn-subtle"
                onClick={() => {
                  setDraft(cv);
                  setEditing(false);
                }}
              >
                <X size={15} /> إلغاء
              </button>
            </>
          )}
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={handleUploadPdf}
          />
        </div>
      </section>

      {/* Edit Mode Panel */}
      {editing ? (
        <section className="mh-panel mh-edit-panel">
          <div className="mh-panel-title">
            <div>
              <small className="eyebrow">INTERACTIVE CV EDITOR</small>
              <h3>تحرير بيانات السيرة الذاتية بالكامل</h3>
            </div>
            {cv.hasCustomPdf && (
              <button type="button" className="sa-btn-subtle" onClick={handleResetPdf}>
                استعادة ملف CV الأصلي المرفق
              </button>
            )}
          </div>

          <div className="mh-form-grid">
            <label>
              الاسم الكامل (عربي)
              <input
                value={draft.fullNameAr}
                onChange={(e) => setDraft({ ...draft, fullNameAr: e.target.value })}
              />
            </label>
            <label>
              الاسم الكامل (إنجليزي)
              <input
                dir="ltr"
                value={draft.fullNameEn}
                onChange={(e) => setDraft({ ...draft, fullNameEn: e.target.value })}
              />
            </label>
            <label className="mh-span-2">
              المسمى الوظيفي والتخصص
              <input
                value={draft.jobTitleAr}
                onChange={(e) => setDraft({ ...draft, jobTitleAr: e.target.value })}
              />
            </label>
            <label>
              البريد الإلكتروني
              <input
                dir="ltr"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </label>
            <label>
              رقم الجوال
              <input
                dir="ltr"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              />
            </label>
            <label>
              الموقع الحالي
              <input
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              />
            </label>
            <label>
              سنوات الخبرة
              <input
                value={draft.yearsExperience}
                onChange={(e) => setDraft({ ...draft, yearsExperience: e.target.value })}
              />
            </label>
            <label className="mh-span-2">
              الهدف المهني (Objective)
              <textarea
                rows={3}
                value={draft.objectiveAr}
                onChange={(e) => setDraft({ ...draft, objectiveAr: e.target.value })}
              />
            </label>
          </div>

          {/* Edit Experiences */}
          <div className="mh-edit-subsection">
            <div className="mh-subhead">
              <h4>الخبرات العملية ({draft.experiences.length})</h4>
              <button type="button" className="sa-btn-subtle" onClick={addExperience}>
                <Plus size={14} /> إضافة خبرة
              </button>
            </div>
            <div className="mh-stack-sm">
              {draft.experiences.map((exp, idx) => (
                <div key={exp.id} className="mh-inset-card">
                  <div className="mh-form-grid">
                    <label>
                      اسم الشركة (عربي)
                      <input
                        value={exp.companyAr}
                        onChange={(e) => {
                          const list = [...draft.experiences];
                          list[idx] = { ...exp, companyAr: e.target.value };
                          setDraft({ ...draft, experiences: list });
                        }}
                      />
                    </label>
                    <label>
                      اسم الشركة (إنجليزي)
                      <input
                        dir="ltr"
                        value={exp.company}
                        onChange={(e) => {
                          const list = [...draft.experiences];
                          list[idx] = { ...exp, company: e.target.value };
                          setDraft({ ...draft, experiences: list });
                        }}
                      />
                    </label>
                    <label>
                      الدور الوظيفي
                      <input
                        value={exp.role}
                        onChange={(e) => {
                          const list = [...draft.experiences];
                          list[idx] = { ...exp, role: e.target.value };
                          setDraft({ ...draft, experiences: list });
                        }}
                      />
                    </label>
                    <label>
                      الفترة الزمنية
                      <input
                        value={exp.period}
                        onChange={(e) => {
                          const list = [...draft.experiences];
                          list[idx] = { ...exp, period: e.target.value };
                          setDraft({ ...draft, experiences: list });
                        }}
                      />
                    </label>
                    <label>
                      المدينة / الدولة
                      <input
                        value={exp.location}
                        onChange={(e) => {
                          const list = [...draft.experiences];
                          list[idx] = { ...exp, location: e.target.value };
                          setDraft({ ...draft, experiences: list });
                        }}
                      />
                    </label>
                    <div className="mh-row-end">
                      <button
                        type="button"
                        className="sa-delete-btn"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            experiences: draft.experiences.filter((x) => x.id !== exp.id),
                          })
                        }
                      >
                        <Trash2 size={14} /> حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Skills */}
          <div className="mh-edit-subsection">
            <h4>المهارات التقنية والإشرافية ({draft.skills.length})</h4>
            <div className="mh-inline-add">
              <input
                placeholder="اسم المهارة الجديدة (مثال: Navisworks / AutoCAD Electrical)..."
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
              />
              <select
                value={newSkillCat}
                onChange={(e) => setNewSkillCat(e.target.value as CvSkill["category"])}
              >
                <option value="CAD / BIM">CAD / BIM</option>
                <option value="إشراف MEP">إشراف MEP</option>
                <option value="التشغيل والصيانة">التشغيل والصيانة</option>
                <option value="برامج مساعدة">برامج مساعدة</option>
              </select>
              <input
                type="number"
                min={10}
                max={100}
                value={newSkillLevel}
                onChange={(e) => setNewSkillLevel(Number(e.target.value))}
                style={{ width: 78 }}
              />
              <button type="button" className="sa-btn-subtle active" onClick={addSkill}>
                <Plus size={14} /> إضافة
              </button>
            </div>
            <div className="mh-chips-edit">
              {draft.skills.map((s, idx) => (
                <div key={s.id} className="mh-skill-edit-row">
                  <span>{s.name}</span>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    value={s.level}
                    onChange={(e) => {
                      const list = [...draft.skills];
                      list[idx] = { ...s, level: Number(e.target.value) };
                      setDraft({ ...draft, skills: list });
                    }}
                  />
                  <b>{s.level}%</b>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        skills: draft.skills.filter((x) => x.id !== s.id),
                      })
                    }
                    title="حذف المهارة"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Responsibilities */}
          <div className="mh-edit-subsection">
            <h4>المهام والمسؤوليات</h4>
            <div className="mh-inline-add">
              <input
                placeholder="أضف مسؤولية مهنية جديدة..."
                value={newResp}
                onChange={(e) => setNewResp(e.target.value)}
              />
              <button type="button" className="sa-btn-subtle active" onClick={addResponsibility}>
                <Plus size={14} /> إضافة
              </button>
            </div>
            <div className="mh-stack-sm">
              {draft.responsibilities.map((resp, idx) => (
                <div key={idx} className="mh-resp-edit-row">
                  <input
                    value={resp}
                    onChange={(e) => {
                      const list = [...draft.responsibilities];
                      list[idx] = e.target.value;
                      setDraft({ ...draft, responsibilities: list });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        responsibilities: draft.responsibilities.filter((_, i) => i !== idx),
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Objective & Education Row */}
          <div className="mh-grid-2">
            <section className="mh-panel">
              <div className="mh-panel-title">
                <div>
                  <small className="eyebrow">CAREER OBJECTIVE</small>
                  <h3>الهدف والملخص المهني</h3>
                </div>
                <FileText size={20} className="sa-copper-icon" />
              </div>
              <p className="mh-body-text">{cv.objectiveAr}</p>
              <p className="mh-body-en" dir="ltr">
                {cv.objectiveEn}
              </p>
            </section>

            <section className="mh-panel">
              <div className="mh-panel-title">
                <div>
                  <small className="eyebrow">EDUCATION & QUALIFICATIONS</small>
                  <h3>المؤهل العلمي والاعتمادات</h3>
                </div>
                <GraduationCap size={20} className="sa-copper-icon" />
              </div>
              <div className="mh-stack-sm">
                {cv.education.map((edu) => (
                  <div key={edu.id} className="mh-inset-card">
                    <div className="mh-flex-between">
                      <b>{edu.institutionAr}</b>
                      <span className="mh-pill accent">{edu.year}</span>
                    </div>
                    <small dir="ltr" style={{ textAlign: "right" }}>
                      {edu.institutionEn}
                    </small>
                    <small style={{ marginTop: 4 }}>
                      {edu.major} · التقدير: <b>{edu.grade}</b>
                    </small>
                  </div>
                ))}
                {cv.certifications.map((cert) => (
                  <div key={cert.id} className="mh-inset-card mh-cert-mini">
                    <Award size={16} className="sa-copper-icon" />
                    <div>
                      <b>{cert.title}</b>
                      <small>
                        {cert.issuer} · {cert.year}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Skills Matrix */}
          <section className="mh-panel">
            <div className="mh-panel-title">
              <div>
                <small className="eyebrow">TECHNICAL & MEP SKILLS</small>
                <h3>المهارات الهندسية والتشغيلية</h3>
              </div>
              <span className="mh-pill">{cv.skills.length} مهارة متخصصة</span>
            </div>
            <div className="mh-skills-grid">
              {skillGroups.map((group) => (
                <div key={group} className="mh-inset-card">
                  <h4 className="mh-skill-group-title">{group}</h4>
                  <div className="mh-stack-sm">
                    {cv.skills
                      .filter((s) => s.category === group)
                      .map((s) => (
                        <div key={s.id}>
                          <div className="progress" style={{ marginTop: 0 }}>
                            <span>{s.name}</span>
                            <b>{s.level}%</b>
                          </div>
                          <div className="track">
                            <i style={{ width: `${s.level}%` }} />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Experience Timeline + Responsibilities */}
          <div className="mh-grid-2-asym">
            <section className="mh-panel">
              <div className="mh-panel-title">
                <div>
                  <small className="eyebrow">WORK EXPERIENCE · 2009 – PRESENT</small>
                  <h3>السجل الوظيفي والخبرات العملية</h3>
                </div>
                <Briefcase size={20} className="sa-copper-icon" />
              </div>
              <div className="mh-timeline">
                {cv.experiences.map((exp) => (
                  <div
                    key={exp.id}
                    className={`mh-timeline-item ${exp.current ? "current" : ""}`}
                  >
                    <div className="mh-timeline-dot" />
                    <div className="mh-inset-card">
                      <div className="mh-flex-between">
                        <div>
                          <b>{exp.companyAr}</b>
                          <small dir="ltr" style={{ textAlign: "right" }}>
                            {exp.company}
                          </small>
                        </div>
                        <span className={`mh-pill ${exp.current ? "accent" : ""}`}>
                          {exp.period}
                        </span>
                      </div>
                      <p className="mh-exp-role">{exp.role}</p>
                      <small className="mh-exp-loc">
                        <MapPin size={12} /> {exp.location}
                      </small>
                      {exp.highlights?.length > 0 && (
                        <ul className="mh-bullet-list">
                          {exp.highlights.map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mh-panel">
              <div className="mh-panel-title">
                <div>
                  <small className="eyebrow">CORE RESPONSIBILITIES</small>
                  <h3>المهام والمسؤوليات الأساسية</h3>
                </div>
                <Wrench size={20} className="sa-copper-icon" />
              </div>
              <ul className="mh-resp-list">
                {cv.responsibilities.map((r, i) => (
                  <li key={i}>
                    <span className="mh-resp-num">{String(i + 1).padStart(2, "0")}</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Landmark CV Projects */}
          <section className="mh-panel">
            <div className="mh-panel-title">
              <div>
                <small className="eyebrow">KEY ENGINEERING PROJECTS FROM CV</small>
                <h3>المشاريع الهندسية الكبرى المنفّذة ({cv.cvProjects.length})</h3>
              </div>
              <Building2 size={20} className="sa-copper-icon" />
            </div>
            <div className="mh-cv-projects-grid">
              {cv.cvProjects.map((p) => {
                const hasSub = Boolean(p.subLocations?.length);
                const open = expandedProject === p.id;
                return (
                  <div key={p.id} className="mh-inset-card mh-cv-proj-card">
                    <div className="mh-flex-between">
                      <span className="mh-pill accent">{p.discipline}</span>
                      <small>
                        <MapPin size={11} style={{ display: "inline" }} /> {p.location}
                      </small>
                    </div>
                    <h4>{p.nameAr}</h4>
                    <small dir="ltr" style={{ textAlign: "right", opacity: 0.85 }}>
                      {p.nameEn}
                    </small>
                    <p className="mh-proj-scope">{p.scope}</p>
                    {hasSub && (
                      <div style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          className="sa-btn-subtle"
                          onClick={() => setExpandedProject(open ? "" : p.id)}
                        >
                          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          عرض المنشآت السبع ({p.subLocations!.length})
                        </button>
                        {open && (
                          <ul className="mh-subloc-list">
                            {p.subLocations!.map((loc, idx) => (
                              <li key={idx}>{loc}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Embedded PDF Modal */}
      {showPdfModal && (
        <div className="overlay" onClick={() => setShowPdfModal(false)}>
          <section
            className="dialog sa-preview-dialog"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sa-preview-header">
              <div>
                <small className="eyebrow">CURRICULUM VITAE · PDF</small>
                <h2 style={{ margin: "2px 0 0", fontSize: 18 }}>{pdfLabel}</h2>
              </div>
              <div className="sa-preview-controls">
                <a href={pdfUrl} download={pdfLabel} className="primary mh-btn-nomargin">
                  <Download size={15} /> تنزيل PDF
                </a>
                <button
                  type="button"
                  className="sa-btn-subtle"
                  onClick={() => setShowPdfModal(false)}
                >
                  <X size={16} /> إغلاق
                </button>
              </div>
            </div>
            <iframe
              src={pdfUrl}
              title="السيرة الذاتية PDF"
              className="sa-pdf-frame"
            />
          </section>
        </div>
      )}
    </div>
  );
}
