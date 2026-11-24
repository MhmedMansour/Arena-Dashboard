import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Files,
  Images,
  Wrench,
  Award,
  FolderArchive,
  UserCheck,
  Settings,
  ChevronLeft,
  Plus,
  Upload,
  CalendarDays,
  Layers,
  MapPin,
  Menu,
  X,
  Download,
  Search,
  FileText,
  Check,
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Zap,
  Briefcase,
  Trash2,
} from "lucide-react";
import SmartArchiveView from "./components/SmartArchiveView";
import CvProfileView from "./components/CvProfileView";
import OmExecutionView from "./components/OmExecutionView";
import SettingsView, { SettingsSubTab } from "./components/SettingsView";
import { BrandMark, ProfileAvatar } from "./components/ProfileAvatar";
import { archiveStorage } from "./services/archiveStorage";
import {
  CvProfileData,
  DashboardSettings,
  LibraryFileItem,
  MainTabId,
  MhmedSyncSnapshot,
  OmWorkOrder,
  ProjectItem,
  SyncConfig,
  SyncState,
} from "./types/mhmed";
import {
  DEFAULT_CV_DATA,
  DEFAULT_OM_WORK_ORDERS,
  DEFAULT_PROJECTS,
  DEFAULT_SAMPLE_FILES,
  DEFAULT_SETTINGS,
} from "./data/mhmedSeedData";
import {
  broadcastTabSync,
  buildSyncSnapshot,
  loadCvData,
  loadProjects,
  loadSettings,
  loadSyncConfig,
  loadWorkOrders,
  pullFromGitHubGist,
  pullFromSupabase,
  pushToGitHubGist,
  pushToSupabase,
  saveCvData,
  saveProjects,
  saveSettings,
  saveSyncConfig,
  saveWorkOrders,
  subscribeTabSync,
} from "./services/syncService";

const ALL_NAV_TABS: Array<{
  id: MainTabId;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
  { id: "cv", label: "السيرة الذاتية والخبرات", icon: UserCheck },
  { id: "projects", label: "المشاريع", icon: FolderKanban },
  { id: "om", label: "التشغيل والصيانة", icon: Wrench },
  { id: "files", label: "مكتبة الملفات", icon: Files },
  { id: "samples", label: "عينات الأعمال", icon: Images },
  { id: "certificates", label: "الشهادات", icon: Award },
  { id: "archive", label: "الأرشيف الذكي", icon: FolderArchive },
  { id: "settings", label: "الإعدادات والمزامنة", icon: Settings },
];

const filesDb = new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open("mimar-files", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("files", { keyPath: "id" });
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});

export default function App() {
  const [settings, setSettingsState] = useState<DashboardSettings>(loadSettings);
  const [cv, setCvState] = useState<CvProfileData>(loadCvData);
  const [projects, setProjectsState] = useState<ProjectItem[]>(loadProjects);
  const [workOrders, setWorkOrdersState] = useState<OmWorkOrder[]>(loadWorkOrders);
  const [syncConfig, setSyncConfigState] = useState<SyncConfig>(loadSyncConfig);

  const [tab, setTab] = useState<MainTabId>(() => {
    const s = loadSettings();
    return s.workspace.defaultTab || "overview";
  });
  const [settingsSection, setSettingsSection] = useState<SettingsSubTab>("brand");

  const [files, setFiles] = useState<LibraryFileItem[]>(DEFAULT_SAMPLE_FILES);
  const [smartArchiveCount, setSmartArchiveCount] = useState(0);
  const [projectFilter, setProjectFilter] = useState("all");
  const [modal, setModal] = useState("");
  const [pid, setPid] = useState("");
  const [q, setQ] = useState("");
  const [mobile, setMobile] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const [syncState, setSyncState] = useState<SyncState>("synced");
  const [syncError, setSyncError] = useState("");

  const input = useRef<HTMLInputElement>(null);
  const autoSyncTimer = useRef<number | null>(null);
  const skipNextAutoSync = useRef(false);

  const project = projects.find((p) => p.id === pid);

  // Apply dynamic theme, custom accent, radius, density, surface & document.title
  useEffect(() => {
    const root = document.documentElement;
    const ap = settings.appearance;
    root.dataset.theme = ap.theme;
    root.dataset.radius = ap.borderRadius;
    root.dataset.surface = ap.surfaceStyle;
    root.dataset.density = ap.density;
    root.dataset.fontSize = ap.fontSize;
    root.dataset.reduceMotion = ap.reduceMotion ? "true" : "false";

    if (ap.customAccent) {
      root.style.setProperty("--accent", ap.customAccent);
      root.style.setProperty("--copper", ap.customAccent);
    } else {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--copper");
    }

    document.title = `${settings.dashboardName || "Mhmed"} | مساحة العمل الهندسية`;
  }, [settings]);

  // Load IndexedDB local files + smart archive count
  useEffect(() => {
    filesDb
      .then((d) => {
        const r = d.transaction("files").objectStore("files").getAll();
        r.onsuccess = () =>
          setFiles([
            ...r.result.map(({ blob: _blob, ...m }: { blob: Blob } & LibraryFileItem) => m).reverse(),
            ...DEFAULT_SAMPLE_FILES,
          ]);
      })
      .catch(() => setMsg("تعذر فتح التخزين المحلي للملفات"));

    archiveStorage
      .listMetadata()
      .then((list) => setSmartArchiveCount(list.length))
      .catch(() => {});
  }, []);

  // Toast timeout
  useEffect(() => {
    if (msg) {
      const t = setTimeout(() => setMsg(""), 4200);
      return () => clearTimeout(t);
    }
  }, [msg]);

  // Multi-tab real-time sync subscription
  useEffect(() => {
    return subscribeTabSync((snap) => {
      skipNextAutoSync.current = true;
      setSettingsState(snap.settings);
      setCvState(snap.cv);
      setProjectsState(snap.projects);
      setWorkOrdersState(snap.workOrders);
      setSyncState("synced");
    });
  }, []);

  const getCurrentSnapshot = useCallback((): MhmedSyncSnapshot => {
    return buildSyncSnapshot(settings, cv, projects, workOrders);
  }, [settings, cv, projects, workOrders]);

  const updateSyncConfig = useCallback((next: SyncConfig) => {
    saveSyncConfig(next);
    setSyncConfigState(next);
  }, []);

  const pushToCloud = useCallback(
    async (silent = false) => {
      const snap = buildSyncSnapshot(settings, cv, projects, workOrders);
      if (syncConfig.provider === "local") {
        broadcastTabSync(snap);
        const updatedCfg: SyncConfig = {
          ...syncConfig,
          lastSyncedAt: Date.now(),
          lastSyncDirection: "tab",
        };
        updateSyncConfig(updatedCfg);
        setSyncState("synced");
        setSyncError("");
        if (!silent) setMsg("تمت مزامنة البيانات محلياً وعبر التبويبات");
        return;
      }

      setSyncState("syncing");
      setSyncError("");
      try {
        if (syncConfig.provider === "github-gist") {
          const res = await pushToGitHubGist(
            syncConfig.githubToken,
            syncConfig.githubGistId,
            snap
          );
          updateSyncConfig({
            ...syncConfig,
            githubGistId: res.gistId,
            lastSyncedAt: res.updatedAt,
            lastSyncDirection: "push",
          });
        } else if (syncConfig.provider === "supabase") {
          const res = await pushToSupabase(
            syncConfig.supabaseUrl,
            syncConfig.supabaseAnonKey,
            syncConfig.supabaseSyncKey,
            snap
          );
          updateSyncConfig({
            ...syncConfig,
            lastSyncedAt: res.updatedAt,
            lastSyncDirection: "push",
          });
        }
        setSyncState("synced");
        if (!silent) setMsg("تمت المزامنة السحابية بنجاح ✓");
      } catch (err) {
        const message = err instanceof Error ? err.message : "فشلت المزامنة السحابية";
        setSyncState("error");
        setSyncError(message);
        if (!silent) setMsg(message);
      }
    },
    [settings, cv, projects, workOrders, syncConfig, updateSyncConfig]
  );

  const pullFromCloud = useCallback(async () => {
    if (syncConfig.provider === "local") {
      setMsg("اختر GitHub Gist أو Supabase أولاً لسحب نسخة سحابية");
      return;
    }
    setSyncState("syncing");
    setSyncError("");
    try {
      let snap: MhmedSyncSnapshot;
      let nextGistId = syncConfig.githubGistId;

      if (syncConfig.provider === "github-gist") {
        const res = await pullFromGitHubGist(
          syncConfig.githubToken,
          syncConfig.githubGistId
        );
        snap = res.snapshot;
        nextGistId = res.gistId;
      } else {
        snap = await pullFromSupabase(
          syncConfig.supabaseUrl,
          syncConfig.supabaseAnonKey,
          syncConfig.supabaseSyncKey
        );
      }

      skipNextAutoSync.current = true;
      saveSettings(snap.settings);
      saveCvData(snap.cv);
      saveProjects(snap.projects);
      saveWorkOrders(snap.workOrders);
      setSettingsState(snap.settings);
      setCvState(snap.cv);
      setProjectsState(snap.projects);
      setWorkOrdersState(snap.workOrders);
      broadcastTabSync(snap);

      updateSyncConfig({
        ...syncConfig,
        githubGistId: nextGistId,
        lastSyncedAt: Date.now(),
        lastSyncDirection: "pull",
      });
      setSyncState("synced");
      setMsg("تم سحب أحدث نسخة متزامنة وتحديث الداشبورد بالكامل ✓");
    } catch (err) {
      const message = err instanceof Error ? err.message : "فشل سحب النسخة السحابية";
      setSyncState("error");
      setSyncError(message);
      setMsg(message);
    }
  }, [syncConfig, updateSyncConfig]);

  // Schedule auto-sync whenever local state changes
  const triggerLocalAndCloudSync = useCallback(
    (
      nextSettings: DashboardSettings,
      nextCv: CvProfileData,
      nextProjects: ProjectItem[],
      nextOrders: OmWorkOrder[]
    ) => {
      const snap = buildSyncSnapshot(nextSettings, nextCv, nextProjects, nextOrders);
      broadcastTabSync(snap);

      if (skipNextAutoSync.current) {
        skipNextAutoSync.current = false;
        return;
      }

      if (syncConfig.provider === "local") {
        setSyncState("synced");
        return;
      }

      setSyncState("dirty");
      if (!syncConfig.autoSync) return;

      if (autoSyncTimer.current) window.clearTimeout(autoSyncTimer.current);
      autoSyncTimer.current = window.setTimeout(async () => {
        setSyncState("syncing");
        try {
          if (syncConfig.provider === "github-gist" && syncConfig.githubToken) {
            const res = await pushToGitHubGist(
              syncConfig.githubToken,
              syncConfig.githubGistId,
              snap
            );
            updateSyncConfig({
              ...syncConfig,
              githubGistId: res.gistId,
              lastSyncedAt: res.updatedAt,
              lastSyncDirection: "push",
            });
            setSyncState("synced");
            setSyncError("");
          } else if (
            syncConfig.provider === "supabase" &&
            syncConfig.supabaseUrl &&
            syncConfig.supabaseAnonKey
          ) {
            const res = await pushToSupabase(
              syncConfig.supabaseUrl,
              syncConfig.supabaseAnonKey,
              syncConfig.supabaseSyncKey,
              snap
            );
            updateSyncConfig({
              ...syncConfig,
              lastSyncedAt: res.updatedAt,
              lastSyncDirection: "push",
            });
            setSyncState("synced");
            setSyncError("");
          }
        } catch (err) {
          setSyncState("error");
          setSyncError(err instanceof Error ? err.message : "تعذرت المزامنة التلقائية");
        }
      }, 2400);
    },
    [syncConfig, updateSyncConfig]
  );

  function updateSettings(next: DashboardSettings) {
    saveSettings(next);
    setSettingsState(next);
    triggerLocalAndCloudSync(next, cv, projects, workOrders);
  }

  function updateCv(next: CvProfileData) {
    saveCvData(next);
    setCvState(next);
    // Keep profile displayName/role synced with CV updates when appropriate
    triggerLocalAndCloudSync(settings, next, projects, workOrders);
  }

  function updateProjects(next: ProjectItem[]) {
    saveProjects(next);
    setProjectsState(next);
    triggerLocalAndCloudSync(settings, cv, next, workOrders);
  }

  function updateWorkOrders(next: OmWorkOrder[]) {
    saveWorkOrders(next);
    setWorkOrdersState(next);
    triggerLocalAndCloudSync(settings, cv, projects, next);
  }

  function applyImportedSnapshot(snap: MhmedSyncSnapshot) {
    skipNextAutoSync.current = true;
    saveSettings(snap.settings);
    saveCvData(snap.cv);
    saveProjects(snap.projects);
    saveWorkOrders(snap.workOrders);
    setSettingsState(snap.settings);
    setCvState(snap.cv);
    setProjectsState(snap.projects);
    setWorkOrdersState(snap.workOrders);
    broadcastTabSync(snap);
    setSyncState("synced");
  }

  function resetAllToCvDefaults() {
    saveSettings(DEFAULT_SETTINGS);
    saveCvData(DEFAULT_CV_DATA);
    saveProjects(DEFAULT_PROJECTS);
    saveWorkOrders(DEFAULT_OM_WORK_ORDERS);
    setSettingsState(DEFAULT_SETTINGS);
    setCvState(DEFAULT_CV_DATA);
    setProjectsState(DEFAULT_PROJECTS);
    setWorkOrdersState(DEFAULT_OM_WORK_ORDERS);
    setMsg("تمت استعادة كافة بيانات السيرة الذاتية وإعدادات Mhmed الافتراضية");
  }

  function nav(nextTab: MainTabId, sub?: SettingsSubTab) {
    if (sub) setSettingsSection(sub);
    setTab(nextTab);
    setQ("");
    setModal("");
    setMobile(false);
  }

  async function downloadFile(f: LibraryFileItem) {
    let href = f.isBuiltinCv
      ? "./cv/Mohamed_Mansour_CV.pdf"
      : `./art/${f.art}.svg`;
    if (!f.art && !f.isBuiltinCv) {
      const d = await filesDb;
      const r = d.transaction("files").objectStore("files").get(f.id);
      const item: { blob: Blob } = await new Promise(
        (ok) => (r.onsuccess = () => ok(r.result))
      );
      href = URL.createObjectURL(item.blob);
    }
    const a = document.createElement("a");
    a.href = href;
    a.download = f.name;
    a.click();
    if (!f.art && !f.isBuiltinCv) setTimeout(() => URL.revokeObjectURL(href), 3000);
  }

  const visibleTabs = useMemo(
    () =>
      ALL_NAV_TABS.filter(
        (t) =>
          t.id === "overview" ||
          t.id === "settings" ||
          !settings.workspace.hiddenTabs.includes(t.id)
      ),
    [settings.workspace.hiddenTabs]
  );

  const activeTabLabel =
    ALL_NAV_TABS.find((t) => t.id === tab)?.label || "نظرة عامة";

  const rows = (list: LibraryFileItem[]) =>
    list.length ? (
      list.map((f) => (
        <div className="row" key={f.id}>
          <span className="fileicon">
            <FileText size={17} />
          </span>
          <div>
            <b>{f.name}</b>
            <small>{projects.find((p) => p.id === f.project)?.name || f.cat}</small>
          </div>
          <label>{f.name.split(".").pop()?.toUpperCase()}</label>
          <button type="button" title="تنزيل الملف" onClick={() => downloadFile(f)}>
            <Download size={17} />
          </button>
        </div>
      ))
    ) : (
      <p className="empty">لا توجد ملفات هنا بعد.</p>
    );

  const activeWorkOrders = workOrders.filter((w) => w.status !== "مكتمل").length;
  const statItems = [
    {
      count: projects.length,
      label: "مشاريع السيرة والعمل",
      icon: FolderKanban,
      target: "projects" as MainTabId,
    },
    {
      count: activeWorkOrders,
      label: "أوامر تشغيل وصيانة MEP",
      icon: Wrench,
      target: "om" as MainTabId,
    },
    {
      count: files.length + smartArchiveCount,
      label: "ملفات ومخططات CAD/BIM",
      icon: Files,
      target: "archive" as MainTabId,
    },
    {
      count: cv.experiences.length,
      label: "شركات وخبرات (+15 سنة)",
      icon: Briefcase,
      target: "cv" as MainTabId,
    },
  ];

  const isOmProject = (p: ProjectItem) =>
    p.type.includes("صيانة") ||
    p.type.includes("تشغيل") ||
    p.type.includes("تنفيذ") ||
    (p.discipline || "").includes("تشغيل");

  const filteredProjects = useMemo(() => {
    if (tab === "overview") {
      return projects.filter((p) => p.progress < 100).slice(0, 3);
    }
    if (tab === "om") {
      return projects.filter(isOmProject);
    }
    if (projectFilter === "all") return projects;
    return projects.filter(
      (p) => p.type === projectFilter || (p.discipline || "").includes(projectFilter)
    );
  }, [projects, tab, projectFilter]);

  const syncLabel =
    syncState === "syncing"
      ? "جارٍ المزامنة..."
      : syncState === "error"
        ? "تعثر الاتصال"
        : syncConfig.provider === "github-gist"
          ? "مزامنة سحابية · GitHub"
          : syncConfig.provider === "supabase"
            ? "مزامنة سحابية · Supabase"
            : "مزامنة التبويبات نشطة";

  const sidebarCompact = settings.appearance.sidebarCompact;

  return (
    <div className={sidebarCompact ? "mh-compact-rail" : ""}>
      {/* Sidebar */}
      <aside className={`${mobile ? "open" : ""} ${sidebarCompact ? "compact" : ""}`}>
        <button
          type="button"
          className="brand"
          onClick={() => nav("settings", "brand")}
          title="اضغط لتغيير اسم أو شعار الداشبورد"
        >
          <i>
            <BrandMark
              icon={settings.brandIcon}
              customLogo={settings.customBrandLogo}
              size={26}
            />
          </i>
          {!sidebarCompact && (
            <div className="mh-brand-text">
              <strong>{settings.dashboardName || "Mhmed"}</strong>
              <small>{settings.dashboardSubtitle}</small>
            </div>
          )}
        </button>

        {!sidebarCompact && <small className="navtitle">مساحة العمل الهندسية</small>}

        <div className="mh-nav-list">
          {visibleTabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={"nav " + (tab === item.id ? "active" : "")}
                onClick={() => nav(item.id)}
                title={item.label}
              >
                <Icon size={19} />
                {!sidebarCompact && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Live Sync Status Widget */}
        <div
          className={`local mh-sync-widget ${syncState === "error" ? "err" : ""}`}
          onClick={() => nav("settings", "sync")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && nav("settings", "sync")}
          title="فتح إعدادات المزامنة"
        >
          <div className="mh-sync-top">
            {syncState === "syncing" ? (
              <RefreshCw size={16} className="mh-spin sa-copper-icon" />
            ) : syncState === "error" ? (
              <AlertCircle size={16} style={{ color: "#f87171" }} />
            ) : syncConfig.provider === "local" ? (
              <Cloud size={16} className="sa-copper-icon" />
            ) : (
              <CheckCircle2 size={16} style={{ color: "#4ade80" }} />
            )}
            {!sidebarCompact && (
              <>
                <b style={{ fontSize: 12 }}>{syncLabel}</b>
                <em>{syncState === "dirty" ? "بانتظار الرفع" : "متزامن"}</em>
              </>
            )}
          </div>
          {!sidebarCompact && (
            <>
              <small>
                {syncConfig.provider === "local"
                  ? "اضغط للربط السحابي (GitHub / Supabase) بين أجهزتك"
                  : syncConfig.lastSyncedAt
                    ? `آخر مزامنة: ${new Date(syncConfig.lastSyncedAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`
                    : "جاهز للمزامنة السحابية الفورية"}
              </small>
              <button
                type="button"
                className="mh-sync-quick-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  pushToCloud(false);
                }}
                disabled={syncState === "syncing"}
              >
                <RefreshCw size={12} className={syncState === "syncing" ? "mh-spin" : ""} />
                مزامنة الآن
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main>
        <header>
          <button type="button" className="menu" onClick={() => setMobile(!mobile)}>
            <Menu />
          </button>
          <span>{settings.dashboardName || "Mhmed"}</span>
          <ChevronLeft size={14} />
          <b>{activeTabLabel}</b>

          <div className="mh-header-end">
            {settings.appearance.showDate && (
              <div className="date">
                <CalendarDays size={15} />
                {new Date().toLocaleDateString("ar-EG", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            )}
            <button
              type="button"
              className="mh-header-icon-btn"
              onClick={() => pushToCloud(false)}
              title="مزامنة الآن"
              disabled={syncState === "syncing"}
            >
              <RefreshCw size={16} className={syncState === "syncing" ? "mh-spin" : ""} />
            </button>
            <button
              type="button"
              className="mh-header-icon-btn"
              onClick={() => nav("settings", "appearance")}
              title="إعدادات الداشبورد والمظهر"
            >
              <Settings size={16} />
            </button>
            <ProfileAvatar
              profile={settings.profile}
              size="sm"
              showStatusDot
              onClick={() => nav("settings", "profile")}
              title={`${settings.profile.displayName} — اضغط لتعديل البروفايل والصورة`}
            />
          </div>
        </header>

        <article>
          {/* OVERVIEW TAB */}
          {tab === "overview" && (
            <>
              <section className="hero">
                {settings.appearance.showBlueprint && (
                  <figure className="blueprint">
                    <b>FIG. 01 / MEP CAD &amp; REVIT STUDY</b>
                    <img
                      src="./art/0.svg"
                      alt="رسم هندسي بمنظور متساوي القياس"
                    />
                    <figcaption>
                      AUTOCAD · REVIT MEP <span>1 : 200</span>
                    </figcaption>
                  </figure>
                )}
                <div className="mh-hero-content">
                  <label>● &nbsp; {settings.heroBadge}</label>
                  <h1>{settings.heroTitle}</h1>
                  <p>{settings.heroSubtitle}</p>
                  <div className="actions">
                    <button
                      type="button"
                      className="cream"
                      onClick={() => setModal("new")}
                    >
                      <Plus size={16} /> مشروع جديد
                    </button>
                    <button
                      type="button"
                      className="outline"
                      onClick={() => nav("cv")}
                    >
                      <UserCheck size={16} /> السيرة الذاتية (CV)
                    </button>
                    <button
                      type="button"
                      className="outline"
                      onClick={() => nav("om")}
                    >
                      <Zap size={16} /> تشغيل وصيانة MEP
                    </button>
                    <button
                      type="button"
                      className="outline"
                      onClick={() => nav("archive")}
                    >
                      <FolderArchive size={16} /> الأرشيف الذكي
                    </button>
                  </div>
                </div>
              </section>

              {settings.appearance.showStats && (
                <div className="stats">
                  {statItems.map((st, i) => {
                    const Icon = st.icon;
                    return (
                      <button
                        type="button"
                        key={st.label}
                        onClick={() => nav(st.target)}
                      >
                        <i className={"c" + i}>
                          <Icon />
                        </i>
                        <div>
                          <strong>{String(st.count).padStart(2, "0")}</strong>
                          <small>{st.label}</small>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Quick CV + O&M Summary Cards */}
              {(settings.appearance.showQuickCvCard ||
                settings.appearance.showQuickOmCard) && (
                <div className="mh-grid-2" style={{ marginTop: 18 }}>
                  {settings.appearance.showQuickCvCard && (
                    <section className="mh-panel mh-quick-card">
                      <div className="mh-quick-profile">
                        <ProfileAvatar
                          profile={settings.profile}
                          size="lg"
                          showStatusDot
                          onClick={() => nav("settings", "profile")}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <small className="eyebrow">ENGINEERING PROFILE · CV</small>
                          <h3 style={{ margin: "2px 0" }}>{cv.fullNameAr}</h3>
                          <small>{cv.jobTitleAr}</small>
                          <div className="mh-badges-row" style={{ marginTop: 8 }}>
                            <span className="mh-pill accent">AutoCAD MEP</span>
                            <span className="mh-pill accent">Revit MEP</span>
                            <span className="mh-pill">IBM Maximo</span>
                            <span className="mh-pill ok">{cv.yearsExperience}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mh-flex-between" style={{ marginTop: 12 }}>
                        <small>{cv.location}</small>
                        <button
                          type="button"
                          className="sa-btn-subtle active"
                          onClick={() => nav("cv")}
                        >
                          فتح السيرة الذاتية الكاملة <ChevronLeft size={14} />
                        </button>
                      </div>
                    </section>
                  )}

                  {settings.appearance.showQuickOmCard && (
                    <section className="mh-panel mh-quick-card">
                      <div className="mh-panel-title" style={{ marginBottom: 10 }}>
                        <div>
                          <small className="eyebrow">ELECTRICAL &amp; MECHANICAL O&amp;M</small>
                          <h3>أوامر التشغيل والصيانة والتنفيذ</h3>
                        </div>
                        <button
                          type="button"
                          className="sa-btn-subtle"
                          onClick={() => nav("om")}
                        >
                          الإدارة الكاملة <ChevronLeft size={14} />
                        </button>
                      </div>
                      <div className="mh-stack-sm">
                        {workOrders.slice(0, 3).map((wo) => (
                          <div key={wo.id} className="mh-inset-card mh-mini-wo">
                            <div>
                              <b>{wo.title}</b>
                              <small>
                                {wo.site} · {wo.system}
                              </small>
                            </div>
                            <span
                              className={`mh-pill ${
                                wo.status === "مكتمل" ? "ok" : "accent"
                              }`}
                            >
                              {wo.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </>
          )}

          {/* CV PROFILE TAB */}
          {tab === "cv" && (
            <CvProfileView
              cv={cv}
              profile={settings.profile}
              onUpdateCv={updateCv}
              onOpenAvatarSettings={() => nav("settings", "profile")}
              onNotify={setMsg}
            />
          )}

          {/* O&M SUPERVISION TAB */}
          {tab === "om" && (
            <OmExecutionView
              workOrders={workOrders}
              onChangeWorkOrders={updateWorkOrders}
              onNotify={setMsg}
            />
          )}

          {/* PROJECTS SECTION (Overview + Projects + O&M) */}
          {(tab === "overview" || tab === "projects" || tab === "om") && (
            <>
              <div className="heading">
                <div>
                  <small className="eyebrow">PROJECT INDEX · MEP &amp; CAD</small>
                  <h2>
                    {tab === "om"
                      ? "مشاريع التشغيل والصيانة والتنفيذ"
                      : tab === "projects"
                        ? `فهرس المشاريع الهندسية (${filteredProjects.length})`
                        : "المشاريع الجارية حالياً"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    tab === "overview" ? nav("projects") : setModal("new")
                  }
                >
                  {tab === "overview" ? "عرض كل المشاريع" : "إضافة مشروع جديد"}
                  <ChevronLeft size={15} />
                </button>
              </div>

              {tab === "projects" && (
                <div className="mh-badges-row" style={{ marginBottom: 14 }}>
                  <button
                    type="button"
                    className={`mh-choice-pill ${projectFilter === "all" ? "active" : ""}`}
                    onClick={() => setProjectFilter("all")}
                  >
                    الكل ({projects.length})
                  </button>
                  {Array.from(new Set(projects.map((p) => p.type))).map((type) => (
                    <button
                      type="button"
                      key={type}
                      className={`mh-choice-pill ${projectFilter === type ? "active" : ""}`}
                      onClick={() => setProjectFilter(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}

              <div className="cards">
                {filteredProjects.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className="card"
                    onClick={() => {
                      setPid(p.id);
                      setModal("detail");
                    }}
                  >
                    <div
                      className="drawing"
                      style={{ backgroundImage: `url(./art/${p.art}.svg)` }}
                    >
                      <label>
                        ● &nbsp; {p.progress === 100 ? "مكتمل" : "قيد التنفيذ"}
                      </label>
                    </div>
                    <div className="cardbody">
                      <small className="tech">
                        <Layers size={13} />
                        {p.type}
                        {p.discipline ? ` · ${p.discipline}` : ""}
                      </small>
                      <h3>{p.name}</h3>
                      <small>
                        <MapPin size={13} />
                        {p.city}
                      </small>
                      <div className="progress">
                        <span>نسبة الإنجاز</span>
                        <b>{p.progress}%</b>
                      </div>
                      <div className="track">
                        <i style={{ width: p.progress + "%" }} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* CERTIFICATES SUMMARY */}
          {tab === "certificates" && (
            <section className="mh-panel" style={{ marginBottom: 16 }}>
              <div className="mh-panel-title">
                <div>
                  <small className="eyebrow">QUALIFICATIONS &amp; CREDENTIALS</small>
                  <h3>المؤهل العلمي والاعتمادات المسجلة من السيرة الذاتية</h3>
                </div>
                <button
                  type="button"
                  className="sa-btn-subtle active"
                  onClick={() => nav("cv")}
                >
                  عرض السيرة الذاتية <ChevronLeft size={14} />
                </button>
              </div>
              <div className="mh-cv-projects-grid">
                {cv.certifications.map((cert) => (
                  <div key={cert.id} className="mh-inset-card">
                    <span className="mh-pill accent">{cert.category}</span>
                    <h4 style={{ margin: "8px 0 4px" }}>{cert.title}</h4>
                    <small>{cert.issuer}</small>
                    <small style={{ marginTop: 6, fontWeight: 600 }}>{cert.year}</small>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* FILES / SAMPLES / CERTIFICATES / O&M SITE FILES */}
          {(tab === "overview" ||
            tab === "files" ||
            tab === "samples" ||
            tab === "certificates" ||
            tab === "om") && (
            <>
              <div className="heading">
                <div>
                  <small className="eyebrow">FILE ARCHIVE</small>
                  <h2>
                    {tab === "overview"
                      ? "أحدث الملفات والمخططات"
                      : tab === "om"
                        ? "ملفات ومخططات المواقع والتشغيل"
                        : activeTabLabel}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (tab === "overview") nav("files");
                    else {
                      setPid("");
                      setModal("upload");
                    }
                  }}
                >
                  {tab === "overview" ? "عرض المكتبة" : "رفع ملفات"}{" "}
                  <ChevronLeft size={15} />
                </button>
              </div>
              {tab !== "overview" && (
                <div className="search">
                  <Search size={17} />
                  <input
                    placeholder="ابحث باسم الملف…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              )}
              <div className="list">
                {rows(
                  files
                    .filter((f) => {
                      const matchesQuery = f.name
                        .toLowerCase()
                        .includes(q.trim().toLowerCase());
                      if (!matchesQuery) return false;
                      if (tab === "overview" || tab === "files") return true;
                      if (tab === "samples") return f.cat === "عينات الأعمال";
                      if (tab === "certificates") return f.cat === "الشهادات";
                      if (tab === "om") {
                        return (
                          f.cat === "التشغيل والصيانة" ||
                          projects.some((p) => isOmProject(p) && p.id === f.project)
                        );
                      }
                      return true;
                    })
                    .slice(0, tab === "overview" ? 4 : undefined)
                )}
              </div>
            </>
          )}

          {/* SMART ARCHIVE TAB */}
          {tab === "archive" && (
            <SmartArchiveView
              projects={projects}
              onNotify={setMsg}
              onArchiveCountChange={setSmartArchiveCount}
            />
          )}

          {/* COMPREHENSIVE SETTINGS & SYNC TAB */}
          {tab === "settings" && (
            <SettingsView
              key={settingsSection}
              initialSection={settingsSection}
              settings={settings}
              onUpdateSettings={updateSettings}
              syncConfig={syncConfig}
              syncState={syncState}
              syncError={syncError}
              onUpdateSyncConfig={updateSyncConfig}
              onCloudPush={() => pushToCloud(false)}
              onCloudPull={pullFromCloud}
              getCurrentSnapshot={getCurrentSnapshot}
              onApplyImportedSnapshot={applyImportedSnapshot}
              onResetAllToCvDefaults={resetAllToCvDefaults}
              onNotify={setMsg}
              allNavTabs={ALL_NAV_TABS.map(({ id, label }) => ({ id, label }))}
            />
          )}
        </article>
      </main>

      {/* Modals: New Project / Upload File / Project Details */}
      {modal && (
        <div className="overlay" onClick={() => !busy && setModal("")}>
          <section
            className="dialog"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="close"
              onClick={() => !busy && setModal("")}
            >
              <X />
            </button>
            <h2>
              {modal === "new"
                ? "إضافة مشروع هندسي جديد"
                : modal === "upload"
                  ? "رفع ملفات ومخططات"
                  : project?.name}
            </h2>
            {modal === "new" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const type = String(f.get("type"));
                  updateProjects([
                    {
                      id: crypto.randomUUID(),
                      name: String(f.get("name")),
                      city: String(f.get("city")),
                      client: String(f.get("client") || ""),
                      discipline: String(f.get("discipline") || ""),
                      notes: String(f.get("notes") || ""),
                      type,
                      art: type.includes("Revit")
                        ? 2
                        : type.includes("صيانة") || type.includes("تشغيل")
                          ? 3
                          : 1,
                      progress: Number(f.get("progress") || 0),
                      updatedAt: Date.now(),
                    },
                    ...projects,
                  ]);
                  setModal("");
                  setMsg("تمت إضافة المشروع ومزامنته");
                }}
              >
                <label>
                  اسم المشروع
                  <input name="name" required placeholder="مثال: توسعة مبنى العيادات..." />
                </label>
                <label>
                  المدينة / الموقع
                  <input name="city" required placeholder="الرياض" />
                </label>
                <label>
                  الجهة المالكة / العميل (اختياري)
                  <input name="client" placeholder="وزارة / شركة استشارية..." />
                </label>
                <label>
                  التخصص / نوع العمل
                  <select
                    name="type"
                    defaultValue={
                      tab === "om"
                        ? "تشغيل وصيانة كهرباء"
                        : settings.workspace.customDisciplines[0] || "AutoCAD MEP"
                    }
                  >
                    {settings.workspace.customDisciplines.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  نطاق العمل (مثال: HVAC / لوحات كهرباء / Shop Drawings)
                  <input name="discipline" placeholder="تكييف وكهرباء ومكافحة حريق" />
                </label>
                <label>
                  نسبة الإنجاز المبدئية (%)
                  <input name="progress" type="number" min={0} max={100} defaultValue={10} />
                </label>
                <button className="primary">إضافة المشروع</button>
              </form>
            ) : modal === "upload" ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  setBusy(true);
                  try {
                    const d = await filesDb;
                    for (const blob of Array.from(input.current!.files || [])) {
                      const m: LibraryFileItem = {
                        id: crypto.randomUUID(),
                        name: blob.name,
                        date: Date.now(),
                        size: blob.size,
                        cat: String(data.get("cat")),
                        project: String(data.get("pid")),
                      };
                      await new Promise((ok, no) => {
                        const t = d.transaction("files", "readwrite");
                        t.objectStore("files").put({ ...m, blob });
                        t.oncomplete = () => ok(true);
                        t.onabort = () => no(t.error);
                      });
                      setFiles((prev) => [m, ...prev]);
                    }
                    setModal("");
                    setMsg("تم حفظ الملفات بنجاح");
                  } catch {
                    setMsg("تعذر الحفظ. تحقق من مساحة التخزين المتاحة.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <p>يدعم DWG وRVT وPDF وExcel والصور وكافة الصيغ الهندسية.</p>
                <input ref={input} type="file" multiple required />
                <label>
                  التصنيف
                  <select
                    name="cat"
                    defaultValue={
                      tab === "samples"
                        ? "عينات الأعمال"
                        : tab === "certificates"
                          ? "الشهادات"
                          : tab === "om"
                            ? "التشغيل والصيانة"
                            : "مكتبة الملفات"
                    }
                  >
                    <option>مكتبة الملفات</option>
                    <option>عينات الأعمال</option>
                    <option>التشغيل والصيانة</option>
                    <option>الشهادات</option>
                  </select>
                </label>
                <label>
                  المشروع
                  <select name="pid" defaultValue={pid}>
                    <option value="">بدون مشروع</option>
                    {projects.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="primary" disabled={busy}>
                  {busy ? "جارٍ الحفظ…" : "حفظ الملفات"}
                </button>
              </form>
            ) : (
              project && (
                <>
                  <p>
                    {project.city} · {project.type}
                    {project.client ? ` · ${project.client}` : ""}
                  </p>
                  {project.notes && (
                    <div className="sa-notes-box">
                      <small>نطاق العمل والملاحظات</small>
                      <p>{project.notes}</p>
                    </div>
                  )}
                  <label>
                    نسبة الإنجاز — {project.progress}%
                    <input
                      type="range"
                      value={project.progress}
                      onChange={(e) =>
                        updateProjects(
                          projects.map((p) =>
                            p.id === pid ? { ...p, progress: +e.target.value } : p
                          )
                        )
                      }
                    />
                  </label>
                  <h3>ملفات المشروع</h3>
                  {rows(files.filter((f) => f.project === pid))}
                  <div className="mh-flex-between" style={{ marginTop: 14 }}>
                    <button
                      type="button"
                      className="primary mh-btn-nomargin"
                      onClick={() => setModal("upload")}
                    >
                      <Upload size={15} /> رفع ملفات للمشروع
                    </button>
                    <button
                      type="button"
                      className="sa-delete-btn"
                      onClick={() => {
                        updateProjects(projects.filter((p) => p.id !== pid));
                        setModal("");
                        setMsg("تم حذف المشروع");
                      }}
                    >
                      <Trash2 size={14} /> حذف المشروع
                    </button>
                  </div>
                </>
              )
            )}
          </section>
        </div>
      )}

      {msg && (
        <div className="toast">
          <Check size={18} />
          {msg}
        </div>
      )}
    </div>
  );
}
