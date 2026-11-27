import { useState, useRef, useEffect } from "react";
import {
  Palette,
  UserCircle2,
  Sliders,
  Cloud,
  LayoutGrid,
  Upload,
  Trash2,
  Check,
  RefreshCw,
  Download,
  Copy,
  ClipboardPaste,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Plus,
  X,
  Database,
  Sparkles,
} from "lucide-react";
import {
  AvailabilityStatus,
  AvatarFrame,
  AvatarShape,
  BrandIconId,
  DashboardSettings,
  FontScale,
  LayoutDensity,
  MainTabId,
  MhmedSyncSnapshot,
  RadiusStyle,
  SurfaceStyle,
  SyncConfig,
  SyncProvider,
  SyncState,
} from "../types/mhmed";
import { DEFAULT_SETTINGS, THEME_PRESETS } from "../data/mhmedSeedData";
import NavigationSettings from "./NavigationSettings";
import AssistantSettings from "./AssistantSettings";
import { BrandMark, ProfileAvatar } from "./ProfileAvatar";
import {
  compressImageFile,
  decodePortableSyncCode,
  downloadSnapshotJson,
  encodePortableSyncCode,
  parseAndValidateSnapshot,
  SUPABASE_SYNC_SQL,
} from "../services/syncService";

export type SettingsSubTab =
  | "brand"
  | "profile"
  | "appearance"
  | "workspace"
  | "sync"
  | "assistant";

interface SettingsViewProps {
  initialSection?: SettingsSubTab;
  settings: DashboardSettings;
  onUpdateSettings: (next: DashboardSettings) => void;
  syncConfig: SyncConfig;
  syncState: SyncState;
  syncError: string;
  onUpdateSyncConfig: (next: SyncConfig) => void;
  onCloudPush: () => Promise<void>;
  onCloudPull: () => Promise<void>;
  getCurrentSnapshot: () => MhmedSyncSnapshot;
  onApplyImportedSnapshot: (snap: MhmedSyncSnapshot) => void;
  onResetAllToCvDefaults: () => void;
  onNotify: (msg: string) => void;
  allNavTabs: Array<{ id: MainTabId; label: string }>;
}

const BRAND_ICONS: Array<{ id: BrandIconId; label: string }> = [
  { id: "compass", label: "فرجار هندسي" },
  { id: "layers", label: "طبقات CAD" },
  { id: "wrench", label: "صيانة وميكانيكا" },
  { id: "zap", label: "كهرباء وطاقة" },
  { id: "building", label: "مباني ومشاريع" },
  { id: "hardhat", label: "إشراف موقع" },
  { id: "cpu", label: "أنظمة ذكية" },
];

const AVATAR_SHAPES: Array<{ id: AvatarShape; label: string }> = [
  { id: "circle", label: "دائري" },
  { id: "rounded", label: "مربع ناعم" },
  { id: "square", label: "مربع حاد" },
  { id: "hexagon", label: "سداسي هندسي" },
  { id: "shield", label: "درع هندسي" },
];

const AVATAR_FRAMES: Array<{ id: AvatarFrame; label: string }> = [
  { id: "copper", label: "إطار ملوّن بارز" },
  { id: "glow", label: "هالة مضيئة" },
  { id: "solid", label: "إطار نظيف" },
  { id: "none", label: "بدون إطار" },
];

const ACCENT_SWATCHES = [
  { label: "نحاسي", hex: "#f5a16b" },
  { label: "سماوي CAD", hex: "#38bdf8" },
  { label: "ذهبي", hex: "#eab308" },
  { label: "زمردي", hex: "#34d399" },
  { label: "مرجاني", hex: "#fb7185" },
  { label: "بنفسجي", hex: "#a78bfa" },
  { label: "عنابي", hex: "#9b4558" },
  { label: "أزرق ملكي", hex: "#60a5fa" },
];

export default function SettingsView({
  initialSection = "brand",
  settings,
  onUpdateSettings,
  syncConfig,
  syncState,
  syncError,
  onUpdateSyncConfig,
  onCloudPush,
  onCloudPull,
  getCurrentSnapshot,
  onApplyImportedSnapshot,
  onResetAllToCvDefaults,
  onNotify,
  allNavTabs,
}: SettingsViewProps) {
  const [subTab, setSubTab] = useState<SettingsSubTab>(initialSection);
  useEffect(() => setSubTab(initialSection), [initialSection]);
  const [newDiscipline, setNewDiscipline] = useState("");
  const [portableCodeInput, setPortableCodeInput] = useState("");
  const [showSql, setShowSql] = useState(false);

  const avatarFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const importJsonRef = useRef<HTMLInputElement>(null);

  const setProfile = (patch: Partial<DashboardSettings["profile"]>) =>
    onUpdateSettings({
      ...settings,
      profile: { ...settings.profile, ...patch },
    });

  const setAppearance = (patch: Partial<DashboardSettings["appearance"]>) =>
    onUpdateSettings({
      ...settings,
      appearance: { ...settings.appearance, ...patch },
    });

  const setWorkspace = (patch: Partial<DashboardSettings["workspace"]>) =>
    onUpdateSettings({
      ...settings,
      workspace: { ...settings.workspace, ...patch },
    });

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 320, 0.86);
      setProfile({ avatarUrl: dataUrl });
      onNotify("تم تحديث صورة البروفايل بنجاح");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "تعذر تحميل الصورة");
    }
    e.target.value = "";
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 192, 0.88);
      onUpdateSettings({
        ...settings,
        brandIcon: "custom",
        customBrandLogo: dataUrl,
      });
      onNotify("تم تعيين شعار الداشبورد المخصص");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "تعذر تحميل الشعار");
    }
    e.target.value = "";
  }

  async function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const snap = parseAndValidateSnapshot(JSON.parse(text));
      onApplyImportedSnapshot(snap);
      onNotify("تم استيراد النسخة الاحتياطية وتحديث الداشبورد بالكامل");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "ملف النسخة الاحتياطية غير صالح");
    }
    e.target.value = "";
  }

  async function handleCopySyncCode() {
    try {
      const code = encodePortableSyncCode(getCurrentSnapshot());
      await navigator.clipboard.writeText(code);
      onNotify("تم نسخ رمز المزامنة السريع — الصقه في أي جهاز آخر");
    } catch {
      onNotify("تعذر النسخ التلقائي — استخدم تصدير JSON");
    }
  }

  function handleApplyPortableCode() {
    if (!portableCodeInput.trim()) return;
    try {
      const snap = decodePortableSyncCode(portableCodeInput);
      onApplyImportedSnapshot(snap);
      setPortableCodeInput("");
      onNotify("تمت المزامنة بنجاح من رمز المزامنة السريع!");
    } catch {
      onNotify("رمز المزامنة غير صالح أو غير مكتمل");
    }
  }

  function toggleHiddenTab(id: MainTabId) {
    if (id === "overview" || id === "settings") return;
    const exists = settings.workspace.hiddenTabs.includes(id);
    setWorkspace({
      hiddenTabs: exists
        ? settings.workspace.hiddenTabs.filter((x) => x !== id)
        : [...settings.workspace.hiddenTabs, id],
    });
  }

  function addDiscipline() {
    const val = newDiscipline.trim();
    if (!val || settings.workspace.customDisciplines.includes(val)) return;
    setWorkspace({
      customDisciplines: [...settings.workspace.customDisciplines, val],
    });
    setNewDiscipline("");
    onNotify(`تمت إضافة التخصص: ${val}`);
  }

  const subTabs: Array<{ id: SettingsSubTab; label: string; icon: typeof Sliders }> = [
    { id: "brand", label: "الاسم والهوية", icon: Sparkles },
    { id: "profile", label: "البروفايل والصورة", icon: UserCircle2 },
    { id: "appearance", label: "المظهر والألوان", icon: Palette },
    { id: "workspace", label: "الأقسام والواجهة", icon: LayoutGrid },
    { id: "assistant", label: "مساعد التطوير", icon: Sparkles },
    { id: "sync", label: "المزامنة والنسخ", icon: Cloud },
  ];

  return (
    <div className="mh-stack">
      <div className="heading" style={{ marginTop: 4 }}>
        <div>
          <small className="eyebrow">DASHBOARD CONTROL CENTER</small>
          <h2>إعدادات لوحة التحكم الشاملة ({settings.dashboardName})</h2>
        </div>
        <button
          type="button"
          className="sa-btn-subtle"
          onClick={() => {
            onUpdateSettings(DEFAULT_SETTINGS);
            onNotify("تمت استعادة الإعدادات الافتراضية لـ Mhmed");
          }}
        >
          <RotateCcw size={14} /> استعادة إعدادات الشكل
        </button>
      </div>

      {/* Sub-navigation Pills */}
      <div className="mh-settings-tabs">
        {subTabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              className={`mh-stab ${subTab === t.id ? "active" : ""}`}
              onClick={() => setSubTab(t.id)}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 1. BRAND & IDENTITY */}
      {subTab === "brand" && (
        <section className="mh-panel">
          <div className="mh-panel-title">
            <div>
              <small className="eyebrow">BRANDING & NAMING</small>
              <h3>تغيير اسم الداشبورد والشعار ونصوص الواجهة</h3>
            </div>
            <div className="mh-brand-preview">
              <i className="mh-brand-preview-icon">
                <BrandMark
                  icon={settings.brandIcon}
                  customLogo={settings.customBrandLogo}
                  size={24}
                />
              </i>
              <div>
                <strong>{settings.dashboardName || "Mhmed"}</strong>
                <small>{settings.dashboardSubtitle}</small>
              </div>
            </div>
          </div>

          <div className="mh-form-grid">
            <label>
              اسم الداشبورد (Dashboard Name)
              <input
                value={settings.dashboardName}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, dashboardName: e.target.value })
                }
                placeholder="Mhmed"
              />
            </label>
            <label>
              الوصف المختصر أسفل الاسم
              <input
                value={settings.dashboardSubtitle}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, dashboardSubtitle: e.target.value })
                }
              />
            </label>
            <label className="mh-span-2">
              شارة التخصص أعلى الصفحة الرئيسية
              <input
                value={settings.heroBadge}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, heroBadge: e.target.value })
                }
              />
            </label>
            <label>
              عنوان الترحيب الرئيسي (Hero Title)
              <input
                value={settings.heroTitle}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, heroTitle: e.target.value })
                }
              />
            </label>
            <label>
              النص التعريفي في الواجهة الرئيسية
              <input
                value={settings.heroSubtitle}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, heroSubtitle: e.target.value })
                }
              />
            </label>
          </div>

          <div className="mh-edit-subsection">
            <h4>أيقونة أو شعار الداشبورد</h4>
            <div className="mh-icon-grid">
              {BRAND_ICONS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`mh-choice-card ${settings.brandIcon === b.id ? "active" : ""}`}
                  onClick={() => onUpdateSettings({ ...settings, brandIcon: b.id })}
                >
                  <BrandMark icon={b.id} size={22} />
                  <span>{b.label}</span>
                </button>
              ))}
              <button
                type="button"
                className={`mh-choice-card ${settings.brandIcon === "custom" ? "active" : ""}`}
                onClick={() => logoFileRef.current?.click()}
              >
                <Upload size={20} />
                <span>رفع شعار مخصص</span>
              </button>
            </div>
            <input
              ref={logoFileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleLogoUpload}
            />
          </div>
        </section>
      )}

      {/* 2. PROFILE & AVATAR STUDIO */}
      {subTab === "profile" && (
        <section className="mh-panel">
          <div className="mh-panel-title">
            <div>
              <small className="eyebrow">PROFILE & AVATAR STUDIO</small>
              <h3>صورة البروفايل وشكلها وبيانات الهوية</h3>
            </div>
          </div>

          <div className="mh-avatar-studio">
            <div className="mh-avatar-preview-box">
              <ProfileAvatar profile={settings.profile} size="xl" showStatusDot />
              <div style={{ textAlign: "center" }}>
                <b>{settings.profile.displayName}</b>
                <small>{settings.profile.availabilityLabel}</small>
              </div>
              <div className="mh-btn-row">
                <button
                  type="button"
                  className="primary mh-btn-nomargin"
                  onClick={() => avatarFileRef.current?.click()}
                >
                  <Upload size={15} /> رفع صورة شخصية
                </button>
                {settings.profile.avatarUrl && (
                  <button
                    type="button"
                    className="sa-delete-btn"
                    onClick={() => {
                      setProfile({ avatarUrl: "" });
                      onNotify("تمت إزالة صورة البروفايل");
                    }}
                  >
                    <Trash2 size={14} /> إزالة الصورة
                  </button>
                )}
              </div>
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="mh-stack-sm" style={{ flex: 1 }}>
              <div>
                <h4 className="mh-small-head">شكل صورة البروفايل (Avatar Shape)</h4>
                <div className="mh-pill-grid">
                  {AVATAR_SHAPES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`mh-choice-pill ${
                        settings.profile.avatarShape === s.id ? "active" : ""
                      }`}
                      onClick={() => setProfile({ avatarShape: s.id })}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mh-small-head">إطار وتأثير الصورة (Avatar Frame)</h4>
                <div className="mh-pill-grid">
                  {AVATAR_FRAMES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`mh-choice-pill ${
                        settings.profile.avatarFrame === f.id ? "active" : ""
                      }`}
                      onClick={() => setProfile({ avatarFrame: f.id })}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mh-form-grid">
                <label>
                  الاسم المعروض
                  <input
                    value={settings.profile.displayName}
                    onChange={(e) => setProfile({ displayName: e.target.value })}
                  />
                </label>
                <label>
                  الحرف البديل (عند عدم وجود صورة)
                  <input
                    maxLength={3}
                    value={settings.profile.shortInitials}
                    onChange={(e) => setProfile({ shortInitials: e.target.value })}
                  />
                </label>
                <label className="mh-span-2">
                  المسمى الوظيفي الظاهر بالبروفايل
                  <input
                    value={settings.profile.roleTitle}
                    onChange={(e) => setProfile({ roleTitle: e.target.value })}
                  />
                </label>
                <label>
                  حالة التواجد
                  <select
                    value={settings.profile.availability}
                    onChange={(e) =>
                      setProfile({
                        availability: e.target.value as AvailabilityStatus,
                      })
                    }
                  >
                    <option value="available">متاح للمشاريع (أخضر)</option>
                    <option value="on-site">في الموقع الميداني (برتقالي)</option>
                    <option value="office">بالمكتب الفني (أزرق)</option>
                    <option value="busy">مشغول حالياً (أحمر)</option>
                  </select>
                </label>
                <label>
                  نص حالة التواجد
                  <input
                    value={settings.profile.availabilityLabel}
                    onChange={(e) =>
                      setProfile({ availabilityLabel: e.target.value })
                    }
                  />
                </label>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. APPEARANCE & THEMES */}
      {subTab === "appearance" && (
        <section className="mh-panel">
          <div className="mh-panel-title">
            <div>
              <small className="eyebrow">THEME & VISUAL DESIGN</small>
              <h3>تغيير شكل الداشبورد والألوان والخطوط والأسطح</h3>
            </div>
          </div>

          <h4 className="mh-small-head">القوالب اللونية الجاهزة (داكن وفاتح)</h4>
          <div className="mh-themes-grid">
            {THEME_PRESETS.map((theme) => {
              const active = settings.appearance.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  className={`mh-theme-card ${active ? "active" : ""}`}
                  onClick={() =>
                    setAppearance({ theme: theme.id, customAccent: "" })
                  }
                >
                  <div className="mh-swatches">
                    {theme.swatches.map((hex, i) => (
                      <span key={i} style={{ background: hex }} />
                    ))}
                    <em className="mh-mode-tag">
                      {theme.mode === "dark" ? "داكن" : "فاتح"}
                    </em>
                  </div>
                  <b>{theme.name}</b>
                  <small>{theme.description}</small>
                </button>
              );
            })}
          </div>

          <div className="mh-edit-subsection">
            <h4 className="mh-small-head">اللون المميز المخصص (Custom Accent Color)</h4>
            <div className="mh-accent-row">
              {ACCENT_SWATCHES.map((sw) => (
                <button
                  key={sw.hex}
                  type="button"
                  className={`mh-color-dot ${
                    settings.appearance.customAccent.toLowerCase() ===
                    sw.hex.toLowerCase()
                      ? "active"
                      : ""
                  }`}
                  style={{ background: sw.hex }}
                  title={sw.label}
                  onClick={() => setAppearance({ customAccent: sw.hex })}
                />
              ))}
              <label className="mh-color-picker-btn">
                <input
                  type="color"
                  value={settings.appearance.customAccent || "#f5a16b"}
                  onChange={(e) => setAppearance({ customAccent: e.target.value })}
                />
                <span>لون حر</span>
              </label>
              {settings.appearance.customAccent && (
                <button
                  type="button"
                  className="sa-btn-subtle"
                  onClick={() => setAppearance({ customAccent: "" })}
                >
                  افتراضي القالب
                </button>
              )}
            </div>
          </div>

          <div className="mh-form-grid" style={{ marginTop: 18 }}>
            <div>
              <h4 className="mh-small-head">حجم الخط (Font Size)</h4>
              <div className="mh-pill-grid">
                {(
                  [
                    ["sm", "صغير"],
                    ["md", "قياسي"],
                    ["lg", "كبير"],
                  ] as Array<[FontScale, string]>
                ).map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    className={`mh-choice-pill ${
                      settings.appearance.fontSize === val ? "active" : ""
                    }`}
                    onClick={() => setAppearance({ fontSize: val })}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mh-small-head">استدارة الحواف (Border Radius)</h4>
              <div className="mh-pill-grid">
                {(
                  [
                    ["sharp", "حاد 4px"],
                    ["standard", "هندسي 8px"],
                    ["soft", "ناعم 14px"],
                    ["pill", "مستدير 20px"],
                  ] as Array<[RadiusStyle, string]>
                ).map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    className={`mh-choice-pill ${
                      settings.appearance.borderRadius === val ? "active" : ""
                    }`}
                    onClick={() => setAppearance({ borderRadius: val })}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mh-small-head">نمط البطاقات والأسطح (Surface)</h4>
              <div className="mh-pill-grid">
                {(
                  [
                    ["machined", "معدني بارز"],
                    ["flat", "مسطح نظيف"],
                    ["glass", "زجاجي عصري"],
                  ] as Array<[SurfaceStyle, string]>
                ).map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    className={`mh-choice-pill ${
                      settings.appearance.surfaceStyle === val ? "active" : ""
                    }`}
                    onClick={() => setAppearance({ surfaceStyle: val })}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mh-small-head">كثافة العرض (Density)</h4>
              <div className="mh-pill-grid">
                {(
                  [
                    ["compact", "مضغوط"],
                    ["standard", "قياسي"],
                    ["comfortable", "مريح"],
                  ] as Array<[LayoutDensity, string]>
                ).map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    className={`mh-choice-pill ${
                      settings.appearance.density === val ? "active" : ""
                    }`}
                    onClick={() => setAppearance({ density: val })}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mh-toggles-grid">
            <label className="mh-toggle-row">
              <span>شريط جانبي مدمج (أيقونات فقط على الشاشات الكبيرة)</span>
              <input
                type="checkbox"
                checked={settings.appearance.sidebarCompact}
                onChange={(e) =>
                  setAppearance({ sidebarCompact: e.target.checked })
                }
              />
            </label>
            <label className="mh-toggle-row">
              <span>تقليل الحركات والانتقالات (Reduce Motion)</span>
              <input
                type="checkbox"
                checked={settings.appearance.reduceMotion}
                onChange={(e) =>
                  setAppearance({ reduceMotion: e.target.checked })
                }
              />
            </label>
          </div>
        </section>
      )}

      {/* 4. WORKSPACE & MODULES */}
      {subTab === "workspace" && (
        <section className="mh-panel">
          <div className="mh-panel-title">
            <div>
              <small className="eyebrow">WORKSPACE & WIDGETS</small>
              <h3>التحكم في عناصر الصفحة الرئيسية والأقسام والتخصصات</h3>
            </div>
          </div>

          <NavigationSettings workspace={settings.workspace} onChange={setWorkspace} />

          <h4 className="mh-small-head">عناصر الواجهة الرئيسية</h4>
          <div className="mh-toggles-grid">
            <label className="mh-toggle-row">
              <span>إظهار لوحة الرسم الهندسي (Blueprint) في الواجهة الرئيسية</span>
              <input
                type="checkbox"
                checked={settings.appearance.showBlueprint}
                onChange={(e) =>
                  setAppearance({ showBlueprint: e.target.checked })
                }
              />
            </label>
            <label className="mh-toggle-row">
              <span>إظهار بطاقات الإحصائيات السريعة</span>
              <input
                type="checkbox"
                checked={settings.appearance.showStats}
                onChange={(e) => setAppearance({ showStats: e.target.checked })}
              />
            </label>
            <label className="mh-toggle-row">
              <span>إظهار بطاقة السيرة الذاتية السريعة في الرئيسية</span>
              <input
                type="checkbox"
                checked={settings.appearance.showQuickCvCard}
                onChange={(e) =>
                  setAppearance({ showQuickCvCard: e.target.checked })
                }
              />
            </label>
            <label className="mh-toggle-row">
              <span>إظهار بطاقة متابعة الكهرباء والميكانيكا (O&M) في الرئيسية</span>
              <input
                type="checkbox"
                checked={settings.appearance.showQuickOmCard}
                onChange={(e) =>
                  setAppearance({ showQuickOmCard: e.target.checked })
                }
              />
            </label>
            <label className="mh-toggle-row">
              <span>إظهار التاريخ في الشريط العلوي</span>
              <input
                type="checkbox"
                checked={settings.appearance.showDate}
                onChange={(e) => setAppearance({ showDate: e.target.checked })}
              />
            </label>
          </div>

          <div className="mh-edit-subsection">
            <h4 className="mh-small-head">الصفحة الافتراضية عند فتح الداشبورد</h4>
            <select
              className="mh-select"
              style={{ maxWidth: 320 }}
              value={settings.workspace.defaultTab}
              onChange={(e) =>
                setWorkspace({ defaultTab: e.target.value as MainTabId })
              }
            >
              {allNavTabs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mh-edit-subsection">
            <h4 className="mh-small-head">إظهار / إخفاء أقسام القائمة الجانبية</h4>
            <div className="mh-pill-grid">
              {allNavTabs
                .filter((t) => t.id !== "overview" && t.id !== "settings")
                .map((t) => {
                  const visible = !settings.workspace.hiddenTabs.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`mh-choice-pill ${visible ? "active" : ""}`}
                      onClick={() => toggleHiddenTab(t.id)}
                    >
                      {visible ? <Check size={13} /> : <X size={13} />} {t.label}
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="mh-edit-subsection">
            <h4 className="mh-small-head">تصنيفات وتخصصات المشاريع المتاحة</h4>
            <div className="mh-inline-add">
              <input
                placeholder="أضف تخصصاً جديداً (مثال: BMS / إنذار حريق / طاقة شمسية)..."
                value={newDiscipline}
                onChange={(e) => setNewDiscipline(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addDiscipline()}
              />
              <button
                type="button"
                className="sa-btn-subtle active"
                onClick={addDiscipline}
              >
                <Plus size={14} /> إضافة
              </button>
            </div>
            <div className="mh-badges-row" style={{ marginTop: 10 }}>
              {settings.workspace.customDisciplines.map((d) => (
                <span key={d} className="mh-pill">
                  {d}
                  <button
                    type="button"
                    style={{ marginRight: 4, opacity: 0.7 }}
                    onClick={() =>
                      setWorkspace({
                        customDisciplines:
                          settings.workspace.customDisciplines.filter((x) => x !== d),
                      })
                    }
                    title="إزالة"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {subTab === "assistant" && <AssistantSettings onNotify={onNotify} />}

      {/* 5. CLOUD SYNC & BACKUP */}
      {subTab === "sync" && (
        <div className="mh-stack">
          {/* Live Sync Status Bar */}
          <section className="mh-panel">
            <div className="mh-panel-title">
              <div>
                <small className="eyebrow">REAL-TIME & CLOUD SYNCHRONIZATION</small>
                <h3>نظام المزامنة بين الأجهزة والنسخ الاحتياطي</h3>
              </div>
              <span
                className={`mh-pill ${
                  syncState === "error"
                    ? "danger"
                    : syncState === "synced"
                      ? "ok"
                      : "accent"
                }`}
              >
                {syncState === "syncing" ? (
                  <>
                    <RefreshCw size={12} className="mh-spin" /> جارٍ المزامنة...
                  </>
                ) : syncState === "error" ? (
                  <>
                    <AlertCircle size={12} /> خطأ في المزامنة
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={12} />{" "}
                    {syncConfig.provider === "local"
                      ? "مزامنة محلية وتبويبات نشطة"
                      : "متصل ومُزامن سحابياً"}
                  </>
                )}
              </span>
            </div>

            {syncError && (
              <div className="sa-analysis-note warn">
                <AlertCircle size={16} />
                <span>{syncError}</span>
              </div>
            )}

            <p className="mh-body-text" style={{ marginBottom: 14 }}>
              جميع تعديلاتك (الاسم، صورة البروفايل، الشكل، السيرة الذاتية، المشاريع، وأوامر التشغيل
              والصيانة) تتزامن تلقائياً بين كل تبويبات المتصفح، ويمكنك ربطها سحابياً عبر{" "}
              <b>GitHub Gist</b> أو <b>Supabase</b> لتفتح نفس الداشبورد من الموبايل والكمبيوتر في
              أي وقت.
            </p>

            {/* Provider Selector */}
            <h4 className="mh-small-head">اختر وسيلة المزامنة</h4>
            <div className="mh-provider-grid">
              {(
                [
                  {
                    id: "local" as SyncProvider,
                    title: "مزامنة محلية + التبويبات",
                    desc: "حفظ فوري على الجهاز + مزامنة لحظية بين التبويبات + نقل برمز أو ملف JSON",
                  },
                  {
                    id: "github-gist" as SyncProvider,
                    title: "مزامنة سحابية — GitHub Gist",
                    desc: "مزامنة خاصة ومجانية على حسابك في GitHub بدون سيرفر (مثالية لكل أجهزتك)",
                  },
                  {
                    id: "supabase" as SyncProvider,
                    title: "مزامنة سحابية — Supabase",
                    desc: "قاعدة بيانات PostgreSQL سحابية متوافقة مع بنية المشروع الحالية",
                  },
                ]
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`mh-theme-card ${syncConfig.provider === p.id ? "active" : ""}`}
                  onClick={() => onUpdateSyncConfig({ ...syncConfig, provider: p.id })}
                >
                  <b>{p.title}</b>
                  <small>{p.desc}</small>
                </button>
              ))}
            </div>

            {/* GitHub Gist Config */}
            {syncConfig.provider === "github-gist" && (
              <div className="mh-inset-card" style={{ marginTop: 14 }}>
                <div className="mh-flex-between" style={{ marginBottom: 10 }}>
                  <b>إعداد مزامنة GitHub Gist الخاصة</b>
                  <span className="mh-pill">
                    <ShieldCheck size={12} /> يُحفظ التوكن في جهازك فقط
                  </span>
                </div>
                <small style={{ marginBottom: 10 }}>
                  أنشئ Personal Access Token من GitHub مع تفعيل صلاحية <b>gist</b> فقط، ثم الصقه
                  هنا واضغط «رفع للمزامنة». في أي جهاز آخر أدخل نفس التوكن واضغط «سحب من السحابة».
                </small>
                <div className="mh-form-grid">
                  <label>
                    GitHub Token (صلاحية gist)
                    <input
                      type="password"
                      dir="ltr"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      value={syncConfig.githubToken}
                      onChange={(e) =>
                        onUpdateSyncConfig({
                          ...syncConfig,
                          githubToken: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    معرّف Gist (يُنشأ تلقائياً إذا تُرك فارغاً)
                    <input
                      dir="ltr"
                      placeholder="تلقائي عند أول رفع..."
                      value={syncConfig.githubGistId}
                      onChange={(e) =>
                        onUpdateSyncConfig({
                          ...syncConfig,
                          githubGistId: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <label className="mh-toggle-row" style={{ marginTop: 10 }}>
                  <span>مزامنة تلقائية عند أي تعديل (Auto-Sync)</span>
                  <input
                    type="checkbox"
                    checked={syncConfig.autoSync}
                    onChange={(e) =>
                      onUpdateSyncConfig({
                        ...syncConfig,
                        autoSync: e.target.checked,
                      })
                    }
                  />
                </label>
                <div className="mh-btn-row" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="primary mh-btn-nomargin"
                    disabled={syncState === "syncing"}
                    onClick={onCloudPush}
                  >
                    <Upload size={15} /> رفع النسخة الحالية إلى GitHub
                  </button>
                  <button
                    type="button"
                    className="sa-btn-subtle active"
                    disabled={syncState === "syncing"}
                    onClick={onCloudPull}
                  >
                    <Download size={15} /> سحب أحدث نسخة من GitHub
                  </button>
                </div>
              </div>
            )}

            {/* Supabase Config */}
            {syncConfig.provider === "supabase" && (
              <div className="mh-inset-card" style={{ marginTop: 14 }}>
                <div className="mh-flex-between" style={{ marginBottom: 10 }}>
                  <b>إعداد مزامنة Supabase Cloud</b>
                  <button
                    type="button"
                    className="sa-btn-subtle"
                    onClick={() => setShowSql(!showSql)}
                  >
                    <Database size={13} /> {showSql ? "إخفاء SQL" : "عرض كود جدول SQL"}
                  </button>
                </div>
                {showSql && (
                  <div className="mh-sql-box">
                    <pre dir="ltr">{SUPABASE_SYNC_SQL}</pre>
                    <button
                      type="button"
                      className="sa-btn-subtle"
                      onClick={() => {
                        navigator.clipboard.writeText(SUPABASE_SYNC_SQL);
                        onNotify("تم نسخ كود SQL — نفّذه في Supabase SQL Editor");
                      }}
                    >
                      <Copy size={13} /> نسخ SQL
                    </button>
                  </div>
                )}
                <div className="mh-form-grid">
                  <label>
                    Supabase Project URL
                    <input
                      dir="ltr"
                      placeholder="https://xxxxx.supabase.co"
                      value={syncConfig.supabaseUrl}
                      onChange={(e) =>
                        onUpdateSyncConfig({
                          ...syncConfig,
                          supabaseUrl: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Supabase Publishable / Anon Key
                    <input
                      type="password"
                      dir="ltr"
                      placeholder="sb_publishable_..."
                      value={syncConfig.supabaseAnonKey}
                      onChange={(e) =>
                        onUpdateSyncConfig({
                          ...syncConfig,
                          supabaseAnonKey: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="mh-span-2">
                    معرّف مساحة المزامنة السري (8 أحرف فأكثر — استخدم نفس المعرّف على كل أجهزتك)
                    <input
                      dir="ltr"
                      placeholder="mhmed-workspace-2026"
                      value={syncConfig.supabaseSyncKey}
                      onChange={(e) =>
                        onUpdateSyncConfig({
                          ...syncConfig,
                          supabaseSyncKey: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <label className="mh-toggle-row" style={{ marginTop: 10 }}>
                  <span>مزامنة تلقائية عند أي تعديل (Auto-Sync)</span>
                  <input
                    type="checkbox"
                    checked={syncConfig.autoSync}
                    onChange={(e) =>
                      onUpdateSyncConfig({
                        ...syncConfig,
                        autoSync: e.target.checked,
                      })
                    }
                  />
                </label>
                <div className="mh-btn-row" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="primary mh-btn-nomargin"
                    disabled={syncState === "syncing"}
                    onClick={onCloudPush}
                  >
                    <Upload size={15} /> رفع إلى Supabase
                  </button>
                  <button
                    type="button"
                    className="sa-btn-subtle active"
                    disabled={syncState === "syncing"}
                    onClick={onCloudPull}
                  >
                    <Download size={15} /> سحب من Supabase
                  </button>
                </div>
              </div>
            )}

            {syncConfig.lastSyncedAt && (
              <small style={{ marginTop: 10 }}>
                آخر مزامنة:{" "}
                {new Date(syncConfig.lastSyncedAt).toLocaleString("ar-EG")}
              </small>
            )}
          </section>

          {/* Portable Sync & JSON Backup */}
          <section className="mh-panel">
            <div className="mh-panel-title">
              <div>
                <small className="eyebrow">PORTABLE BACKUP & QUICK TRANSFER</small>
                <h3>النسخ الاحتياطي والنقل السريع بين الأجهزة</h3>
              </div>
            </div>

            <div className="mh-btn-row" style={{ marginBottom: 14 }}>
              <button
                type="button"
                className="primary mh-btn-nomargin"
                onClick={() => {
                  downloadSnapshotJson(getCurrentSnapshot());
                  onNotify("تم تنزيل ملف النسخة الاحتياطية الكاملة (JSON)");
                }}
              >
                <Download size={15} /> تصدير نسخة احتياطية كاملة (.json)
              </button>
              <button
                type="button"
                className="sa-btn-subtle"
                onClick={() => importJsonRef.current?.click()}
              >
                <Upload size={15} /> استيراد نسخة احتياطية (.json)
              </button>
              <button
                type="button"
                className="sa-btn-subtle active"
                onClick={handleCopySyncCode}
              >
                <Copy size={15} /> نسخ رمز مزامنة فوري
              </button>
              <input
                ref={importJsonRef}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={handleImportJson}
              />
            </div>

            <div className="mh-inset-card">
              <h4 className="mh-small-head">استقبال المزامنة برمز فوري من جهاز آخر</h4>
              <div className="mh-inline-add">
                <input
                  dir="ltr"
                  placeholder="الصق رمز MHMED-SYNC:... هنا"
                  value={portableCodeInput}
                  onChange={(e) => setPortableCodeInput(e.target.value)}
                />
                <button
                  type="button"
                  className="sa-btn-subtle active"
                  onClick={handleApplyPortableCode}
                >
                  <ClipboardPaste size={14} /> تطبيق المزامنة
                </button>
              </div>
            </div>

            <div className="sa-danger-footer">
              <button
                type="button"
                className="sa-delete-btn"
                onClick={() => {
                  if (
                    window.confirm(
                      "هل تريد إعادة ضبط كافة بيانات الداشبورد والإعدادات للوضع الافتراضي المرتبط بسيرتك الذاتية؟"
                    )
                  ) {
                    onResetAllToCvDefaults();
                  }
                }}
              >
                <RotateCcw size={14} /> إعادة ضبط كل البيانات لافتراضي السيرة الذاتية
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
