import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  FolderKanban,
  Files,
  Wrench,
  Settings,
  ChevronLeft,
  ChevronRight,
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
  Trash2,
  Edit3,
  Eye,
  Share2,
  CheckSquare,
  Square,
  RotateCcw,
  Award,
} from "lucide-react";
import SmartArchiveView from "./components/SmartArchiveView";
import CvProfileView from "./components/CvProfileView";
import OmExecutionView from "./components/OmExecutionView";
import SettingsView, { SettingsSubTab } from "./components/SettingsView";
import MonthlyCalendarView, {
  OverviewMonthCalendarCard,
} from "./components/MonthlyCalendarView";
import UniversalFilePreviewModal, {
  PreviewTarget,
} from "./components/UniversalFilePreviewModal";
import ShareShowcaseModal from "./components/ShareShowcaseModal";
import { BrandMark, ProfileAvatar } from "./components/ProfileAvatar";
import { archiveStorage } from "./services/archiveStorage";
import { ArchiveFileMetadata } from "./types/smartArchive";
import {
  CalendarEventItem,
  CvCertification,
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
  DEFAULT_CALENDAR_EVENTS,
  DEFAULT_CV_DATA,
  DEFAULT_OM_WORK_ORDERS,
  DEFAULT_PROJECTS,
  DEFAULT_SAMPLE_FILES,
  DEFAULT_SETTINGS,
} from "./data/mhmedSeedData";
import {
  broadcastTabSync,
  buildSyncSnapshot,
  loadActiveMonth,
  loadCalendarEvents,
  loadCvData,
  loadLibraryFilesMeta,
  loadProjects,
  loadSettings,
  loadSyncConfig,
  loadWorkOrders,
  pullFromGitHubGist,
  pullFromSupabase,
  pushToGitHubGist,
  pushToSupabase,
  saveActiveMonth,
  saveCalendarEvents,
  saveCvData,
  saveLibraryFilesMeta,
  saveProjects,
  saveSettings,
  saveSyncConfig,
  saveWorkOrders,
  subscribeTabSync,
} from "./services/syncService";
import { buildNavTabs } from "./components/navIcons";
import {
  clampDateToMonth,
  defaultDateInMonth,
  formatMonthArabic,
  shiftMonthKey,
  todayKey,
  todayMonthKey,
} from "./utils/date";

const filesDb = new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open("mimar-files", 1);
  r.onupgradeneeded = () => {
    if (!r.result.objectStoreNames.contains("files")) {
      r.result.createObjectStore("files", { keyPath: "id" });
    }
  };
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});

async function getStoredFileBlob(id: string): Promise<Blob | null> {
  try {
    const d = await filesDb;
    const req = d.transaction("files", "readonly").objectStore("files").get(id);
    const row: { blob?: Blob } | undefined = await new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });
    return row?.blob instanceof Blob ? row.blob : null;
  } catch {
    return null;
  }
}

async function putStoredFileBlob(meta: LibraryFileItem, blob: Blob): Promise<void> {
  const d = await filesDb;
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction("files", "readwrite");
    tx.objectStore("files").put({ ...meta, blob });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteStoredFileBlob(id: string): Promise<void> {
  try {
    const d = await filesDb;
    await new Promise<void>((resolve) => {
      const tx = d.transaction("files", "readwrite");
      tx.objectStore("files").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

export default function App() {
  const [settings, setSettingsState] = useState<DashboardSettings>(loadSettings);
  const [cv, setCvState] = useState<CvProfileData>(loadCvData);
  const [projects, setProjectsState] = useState<ProjectItem[]>(loadProjects);
  const [workOrders, setWorkOrdersState] = useState<OmWorkOrder[]>(loadWorkOrders);
  const [calendarEvents, setCalendarEventsState] =
    useState<CalendarEventItem[]>(loadCalendarEvents);
  const [activeMonth, setActiveMonthState] = useState<string>(loadActiveMonth);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const m = loadActiveMonth();
    const t = todayKey();
    return clampDateToMonth(t, m);
  });
  const [syncConfig, setSyncConfigState] = useState<SyncConfig>(loadSyncConfig);

  const [tab, setTab] = useState<MainTabId>(() => {
    const s = loadSettings();
    return s.workspace.defaultTab || "overview";
  });
  const [settingsSection, setSettingsSection] = useState<SettingsSubTab>("brand");

  const [files, setFilesState] = useState<LibraryFileItem[]>(
    () => loadLibraryFilesMeta() ?? DEFAULT_SAMPLE_FILES
  );
  const [smartArchiveCount, setSmartArchiveCount] = useState(0);
  const [projectFilter, setProjectFilter] = useState("all");
  const [modal, setModal] = useState<"" | "new" | "upload" | "detail">("");
  const [pid, setPid] = useState("");
  const [q, setQ] = useState("");
  const [mobile, setMobile] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Full Edit & Preview & Pre-Share Showcase Modals
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [editingFile, setEditingFile] = useState<LibraryFileItem | null>(null);
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [addingCert, setAddingCert] = useState(false);
  const [editingCert, setEditingCert] = useState<CvCertification | null>(null);

  const [syncState, setSyncState] = useState<SyncState>("synced");
  const [syncError, setSyncError] = useState("");

  const input = useRef<HTMLInputElement>(null);
  const quickUploadInput = useRef<HTMLInputElement>(null);
  const replaceFileInput = useRef<HTMLInputElement>(null);
  const quickUploadCatRef = useRef<string>("عينات الأعمال");
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

  // Hydrate IndexedDB local files if not yet stored in filesMeta + smart archive count
  useEffect(() => {
    filesDb
      .then((d) => {
        const r = d.transaction("files").objectStore("files").getAll();
        r.onsuccess = () => {
          const savedMeta = loadLibraryFilesMeta();
          const idbMetas = (r.result || [])
            .map(({ blob: _blob, ...m }: { blob?: Blob } & LibraryFileItem) => m)
            .reverse();
          if (savedMeta !== null) {
            // Merge any IndexedDB entries not yet listed in savedMeta
            const existingIds = new Set(savedMeta.map((x) => x.id));
            const missing = idbMetas.filter((x) => !existingIds.has(x.id));
            if (missing.length > 0) {
              const merged = [...missing, ...savedMeta];
              setFilesState(merged);
              saveLibraryFilesMeta(merged);
            }
          } else if (idbMetas.length > 0) {
            const merged = [...idbMetas, ...DEFAULT_SAMPLE_FILES];
            setFilesState(merged);
            saveLibraryFilesMeta(merged);
          }
        };
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
      if (Array.isArray(snap.calendarEvents)) {
        setCalendarEventsState(snap.calendarEvents);
      }
      if (Array.isArray(snap.libraryFiles)) {
        setFilesState(snap.libraryFiles);
      }
      if (snap.activeMonth) {
        setActiveMonthState(snap.activeMonth);
      }
      setSyncState("synced");
    });
  }, []);

  const getCurrentSnapshot = useCallback((): MhmedSyncSnapshot => {
    return buildSyncSnapshot(
      settings,
      cv,
      projects,
      workOrders,
      calendarEvents,
      files,
      activeMonth
    );
  }, [settings, cv, projects, workOrders, calendarEvents, files, activeMonth]);

  const updateSyncConfig = useCallback((next: SyncConfig) => {
    saveSyncConfig(next);
    setSyncConfigState(next);
  }, []);

  const pushToCloud = useCallback(
    async (silent = false) => {
      const snap = buildSyncSnapshot(
        settings,
        cv,
        projects,
        workOrders,
        calendarEvents,
        files,
        activeMonth
      );
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
        const message =
          err instanceof Error ? err.message : "فشلت المزامنة السحابية";
        setSyncState("error");
        setSyncError(message);
        if (!silent) setMsg(message);
      }
    },
    [
      settings,
      cv,
      projects,
      workOrders,
      calendarEvents,
      files,
      activeMonth,
      syncConfig,
      updateSyncConfig,
    ]
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

      applyImportedSnapshot(snap);
      updateSyncConfig({
        ...syncConfig,
        githubGistId: nextGistId,
        lastSyncedAt: Date.now(),
        lastSyncDirection: "pull",
      });
      setSyncState("synced");
      setMsg("تم سحب أحدث نسخة متزامنة وتحديث الداشبورد بالكامل ✓");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "فشل سحب النسخة السحابية";
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
      nextOrders: OmWorkOrder[],
      nextEvents: CalendarEventItem[],
      nextFiles: LibraryFileItem[],
      nextMonth: string
    ) => {
      const snap = buildSyncSnapshot(
        nextSettings,
        nextCv,
        nextProjects,
        nextOrders,
        nextEvents,
        nextFiles,
        nextMonth
      );
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
          setSyncError(
            err instanceof Error ? err.message : "تعذرت المزامنة التلقائية"
          );
        }
      }, 2400);
    },
    [syncConfig, updateSyncConfig]
  );

  function updateSettings(next: DashboardSettings) {
    saveSettings(next);
    setSettingsState(next);
    triggerLocalAndCloudSync(
      next,
      cv,
      projects,
      workOrders,
      calendarEvents,
      files,
      activeMonth
    );
  }

  function updateCv(next: CvProfileData) {
    saveCvData(next);
    setCvState(next);
    triggerLocalAndCloudSync(
      settings,
      next,
      projects,
      workOrders,
      calendarEvents,
      files,
      activeMonth
    );
  }

  function updateProjects(next: ProjectItem[]) {
    saveProjects(next);
    setProjectsState(next);
    triggerLocalAndCloudSync(
      settings,
      cv,
      next,
      workOrders,
      calendarEvents,
      files,
      activeMonth
    );
  }

  function updateWorkOrders(next: OmWorkOrder[]) {
    saveWorkOrders(next);
    setWorkOrdersState(next);
    triggerLocalAndCloudSync(
      settings,
      cv,
      projects,
      next,
      calendarEvents,
      files,
      activeMonth
    );
  }

  function updateCalendarEvents(next: CalendarEventItem[]) {
    saveCalendarEvents(next);
    setCalendarEventsState(next);
    triggerLocalAndCloudSync(
      settings,
      cv,
      projects,
      workOrders,
      next,
      files,
      activeMonth
    );
  }

  function updateFiles(next: LibraryFileItem[]) {
    saveLibraryFilesMeta(next);
    setFilesState(next);
    triggerLocalAndCloudSync(
      settings,
      cv,
      projects,
      workOrders,
      calendarEvents,
      next,
      activeMonth
    );
  }

  function changeActiveMonth(nextMonth: string) {
    saveActiveMonth(nextMonth);
    setActiveMonthState(nextMonth);
    if (!selectedDate.startsWith(nextMonth)) {
      setSelectedDate(clampDateToMonth(selectedDate, nextMonth));
    }
    triggerLocalAndCloudSync(
      settings,
      cv,
      projects,
      workOrders,
      calendarEvents,
      files,
      nextMonth
    );
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

    if (Array.isArray(snap.calendarEvents)) {
      saveCalendarEvents(snap.calendarEvents);
      setCalendarEventsState(snap.calendarEvents);
    }
    if (Array.isArray(snap.libraryFiles)) {
      saveLibraryFilesMeta(snap.libraryFiles);
      setFilesState(snap.libraryFiles);
    }
    if (snap.activeMonth) {
      saveActiveMonth(snap.activeMonth);
      setActiveMonthState(snap.activeMonth);
    }

    broadcastTabSync(snap);
    setSyncState("synced");
  }

  function resetAllToCvDefaults() {
    const defMonth = todayMonthKey();
    saveSettings(DEFAULT_SETTINGS);
    saveCvData(DEFAULT_CV_DATA);
    saveProjects(DEFAULT_PROJECTS);
    saveWorkOrders(DEFAULT_OM_WORK_ORDERS);
    saveCalendarEvents(DEFAULT_CALENDAR_EVENTS);
    saveLibraryFilesMeta(DEFAULT_SAMPLE_FILES);
    saveActiveMonth(defMonth);

    setSettingsState(DEFAULT_SETTINGS);
    setCvState(DEFAULT_CV_DATA);
    setProjectsState(DEFAULT_PROJECTS);
    setWorkOrdersState(DEFAULT_OM_WORK_ORDERS);
    setCalendarEventsState(DEFAULT_CALENDAR_EVENTS);
    setFilesState(DEFAULT_SAMPLE_FILES);
    setActiveMonthState(defMonth);
    setMsg("تمت استعادة كافة بيانات السيرة الذاتية وإعدادات Mhmed الافتراضية");
  }

  function nav(nextTab: MainTabId, sub?: SettingsSubTab) {
    if (sub) setSettingsSection(sub);
    setTab(nextTab);
    setQ("");
    setModal("");
    setMobile(false);
  }

  /* ---------- Universal File Preview, Upload, Edit & Delete ---------- */
  async function previewLibraryFile(f: LibraryFileItem) {
    const projName = projects.find((p) => p.id === f.project)?.name;
    // Check if there is a binary blob stored in IndexedDB (uploaded or replaced)
    const storedBlob = await getStoredFileBlob(f.id);
    if (storedBlob) {
      setPreviewTarget({
        id: f.id,
        name: f.name,
        size: f.size || storedBlob.size,
        mimeType: f.mimeType || storedBlob.type,
        blob: storedBlob,
        category: f.cat,
        projectName: projName,
        notes: f.notes,
        addedAt: f.date,
      });
      return;
    }

    // Check if promoted from Smart Archive
    if (f.archiveFileId) {
      const archBlob = await archiveStorage.getFileBlob(f.archiveFileId);
      if (archBlob) {
        setPreviewTarget({
          id: f.id,
          name: f.name,
          size: f.size || archBlob.size,
          mimeType: f.mimeType || archBlob.type,
          blob: archBlob,
          category: f.cat,
          projectName: projName,
          notes: f.notes,
          addedAt: f.date,
        });
        return;
      }
    }

    // Built-in CV or built-in sample SVG artwork
    const staticUrl = f.isBuiltinCv
      ? "./cv/Mohamed_Mansour_CV.pdf"
      : f.art !== undefined
        ? `./art/${f.art}.svg`
        : undefined;

    if (staticUrl) {
      setPreviewTarget({
        id: f.id,
        name: f.name,
        size: f.size,
        url: staticUrl,
        category: f.cat,
        projectName: projName,
        notes: f.notes,
        addedAt: f.date,
      });
    } else {
      setMsg("محتوى هذا الملف غير محفوظ محلياً في هذا المتصفح");
    }
  }

  async function downloadFile(f: LibraryFileItem) {
    const storedBlob = await getStoredFileBlob(f.id);
    if (storedBlob) {
      const href = URL.createObjectURL(storedBlob);
      const a = document.createElement("a");
      a.href = href;
      a.download = f.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 3000);
      return;
    }
    if (f.archiveFileId) {
      const archBlob = await archiveStorage.getFileBlob(f.archiveFileId);
      if (archBlob) {
        const href = URL.createObjectURL(archBlob);
        const a = document.createElement("a");
        a.href = href;
        a.download = f.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(href), 3000);
        return;
      }
    }
    const href = f.isBuiltinCv
      ? "./cv/Mohamed_Mansour_CV.pdf"
      : f.art !== undefined
        ? `./art/${f.art}.svg`
        : "";
    if (!href) {
      setMsg("تعذر العثور على الملف للتنزيل");
      return;
    }
    const a = document.createElement("a");
    a.href = href;
    a.download = f.name;
    a.click();
  }

  async function deleteFileItem(f: LibraryFileItem) {
    await deleteStoredFileBlob(f.id);
    updateFiles(files.filter((x) => x.id !== f.id));
    if (editingFile?.id === f.id) setEditingFile(null);
    if (previewTarget?.id === f.id) setPreviewTarget(null);
    setMsg(`تم حذف الملف "${f.name}"`);
  }

  function triggerQuickUpload(category: string) {
    quickUploadCatRef.current = category;
    quickUploadInput.current?.click();
  }

  async function handleQuickUploadFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const cat = quickUploadCatRef.current;
    const created: LibraryFileItem[] = [];
    let firstBlob: Blob | null = null;

    for (const raw of Array.from(fileList)) {
      const item: LibraryFileItem = {
        id: "file-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        name: raw.name,
        cat,
        project: pid || "",
        size: raw.size,
        date: Date.now(),
        mimeType: raw.type || undefined,
        dueDate: defaultDateInMonth(activeMonth, new Date().getDate()),
        selectedForDisplay: cat === "عينات الأعمال" || cat === "الشهادات",
      };
      try {
        await putStoredFileBlob(item, raw);
      } catch {
        // Ignore quota errors
      }
      if (!firstBlob) firstBlob = raw;
      created.push(item);
    }

    if (created.length > 0) {
      const next = [...created, ...files];
      updateFiles(next);
      // Immediately open the Universal Preview Modal for the uploaded file!
      if (firstBlob) {
        setPreviewTarget({
          id: created[0].id,
          name: created[0].name,
          size: created[0].size,
          mimeType: created[0].mimeType,
          blob: firstBlob,
          category: created[0].cat,
          addedAt: created[0].date,
        });
      }
      setMsg(
        created.length === 1
          ? `تم رفع "${created[0].name}" وفتح المعاينة الفورية`
          : `تم رفع ${created.length} ملفات وفتح المعاينة الفورية`
      );
    }
  }

  async function handlePromoteArchiveToSample(
    meta: ArchiveFileMetadata,
    blob: Blob
  ) {
    const item: LibraryFileItem = {
      id: "arch-sample-" + Date.now(),
      name: meta.name,
      cat: "عينات الأعمال",
      project: meta.projectId || "",
      size: meta.size,
      date: Date.now(),
      archiveFileId: meta.id,
      dueDate: meta.documentDate || defaultDateInMonth(activeMonth, 15),
      notes: `${meta.section} · ${meta.discipline}${meta.notes ? ` — ${meta.notes}` : ""}`,
      selectedForDisplay: true,
    };
    try {
      await putStoredFileBlob(item, blob);
    } catch {
      // Fallback to archiveFileId lookup
    }
    updateFiles([item, ...files]);
    setMsg(`تمت إضافة "${meta.name}" إلى عينات الأعمال المختارة للعرض`);
  }

  async function handleReplaceEditingFileBlob(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const raw = e.target.files?.[0];
    if (!raw || !editingFile) return;
    const updated: LibraryFileItem = {
      ...editingFile,
      name: raw.name,
      size: raw.size,
      mimeType: raw.type || undefined,
      isBuiltinCv: false,
      art: undefined,
      date: Date.now(),
    };
    try {
      await putStoredFileBlob(updated, raw);
    } catch {
      setMsg("تعذر حفظ محتوى الملف الجديد في المتصفح");
      return;
    }
    setEditingFile(updated);
    updateFiles(files.map((x) => (x.id === updated.id ? updated : x)));
    setMsg(`تم استبدال محتوى الملف بـ "${raw.name}"`);
    e.target.value = "";
  }

  function handleSaveFileEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingFile) return;
    const f = new FormData(e.currentTarget);
    const updated: LibraryFileItem = {
      ...editingFile,
      name: String(f.get("name") || "").trim() || editingFile.name,
      cat: String(f.get("cat") || editingFile.cat),
      project: String(f.get("project") || ""),
      dueDate: String(f.get("dueDate") || "").trim() || undefined,
      notes: String(f.get("notes") || "").trim() || undefined,
      selectedForDisplay: f.get("selectedForDisplay") === "on",
    };
    updateFiles(files.map((x) => (x.id === updated.id ? updated : x)));
    setEditingFile(null);
    setMsg(`تم حفظ تعديلات الملف "${updated.name}"`);
  }

  function toggleFileDisplay(fileId: string) {
    updateFiles(
      files.map((f) =>
        f.id === fileId
          ? { ...f, selectedForDisplay: f.selectedForDisplay === false }
          : f
      )
    );
  }

  function toggleProjectDisplay(projectId: string) {
    updateProjects(
      projects.map((p) =>
        p.id === projectId
          ? { ...p, selectedForDisplay: p.selectedForDisplay === false }
          : p
      )
    );
  }

  function toggleCertDisplay(certId: string) {
    updateCv({
      ...cv,
      certifications: cv.certifications.map((c) =>
        c.id === certId
          ? { ...c, selectedForDisplay: c.selectedForDisplay === false }
          : c
      ),
    });
  }

  /* ---------- Project Edit & Delete ---------- */
  function handleSaveProjectEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingProject) return;
    const f = new FormData(e.currentTarget);
    const type = String(f.get("type") || editingProject.type);
    const updated: ProjectItem = {
      ...editingProject,
      name: String(f.get("name") || "").trim() || editingProject.name,
      nameEn: String(f.get("nameEn") || "").trim() || undefined,
      city: String(f.get("city") || "").trim() || editingProject.city,
      client: String(f.get("client") || "").trim() || undefined,
      type,
      discipline: String(f.get("discipline") || "").trim() || undefined,
      progress: Math.min(100, Math.max(0, Number(f.get("progress") || 0))),
      targetDate: String(f.get("targetDate") || "").trim() || undefined,
      notes: String(f.get("notes") || "").trim() || undefined,
      selectedForDisplay: f.get("selectedForDisplay") === "on",
      art:
        editingProject.art ||
        (type.includes("Revit")
          ? 2
          : type.includes("صيانة") || type.includes("تشغيل")
            ? 3
            : 1),
      updatedAt: Date.now(),
    };
    updateProjects(projects.map((p) => (p.id === updated.id ? updated : p)));
    setEditingProject(null);
    setMsg(`تم حفظ تعديلات المشروع "${updated.name}"`);
  }

  function deleteProjectById(id: string) {
    updateProjects(projects.filter((p) => p.id !== id));
    if (pid === id) {
      setPid("");
      setModal("");
    }
    if (editingProject?.id === id) setEditingProject(null);
    setMsg("تم حذف المشروع");
  }

  /* ---------- Certificate Quick CRUD ---------- */
  function handleCreateCert(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const item: CvCertification = {
      id: "cert-" + Date.now(),
      title: String(f.get("title") || "").trim(),
      issuer: String(f.get("issuer") || "").trim(),
      year: String(f.get("year") || "2026").trim(),
      category: String(f.get("category") || "اعتماد هندسي").trim(),
      selectedForDisplay: f.get("selectedForDisplay") === "on",
    };
    updateCv({ ...cv, certifications: [item, ...cv.certifications] });
    setAddingCert(false);
    setMsg("تمت إضافة الشهادة / الاعتماد");
  }

  function handleSaveCertEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingCert) return;
    const f = new FormData(e.currentTarget);
    const updated: CvCertification = {
      ...editingCert,
      title: String(f.get("title") || "").trim() || editingCert.title,
      issuer: String(f.get("issuer") || "").trim() || editingCert.issuer,
      year: String(f.get("year") || "").trim() || editingCert.year,
      category: String(f.get("category") || "").trim() || editingCert.category,
      selectedForDisplay: f.get("selectedForDisplay") === "on",
    };
    updateCv({
      ...cv,
      certifications: cv.certifications.map((c) =>
        c.id === updated.id ? updated : c
      ),
    });
    setEditingCert(null);
    setMsg("تم حفظ تعديلات الشهادة");
  }

  function deleteCertById(certId: string) {
    updateCv({
      ...cv,
      certifications: cv.certifications.filter((c) => c.id !== certId),
    });
    if (editingCert?.id === certId) setEditingCert(null);
    setMsg("تم حذف الشهادة");
  }

  /* ---------- Navigation & Computed Collections ---------- */
  const navTabs = useMemo(
    () =>
      buildNavTabs({
        order: settings.workspace.navOrder,
        iconOverrides: settings.workspace.navIcons,
        labels: settings.workspace.navLabels,
      }),
    [
      settings.workspace.navOrder,
      settings.workspace.navIcons,
      settings.workspace.navLabels,
    ]
  );

  const visibleTabs = useMemo(
    () =>
      navTabs.filter(
        (t) =>
          t.id === "overview" ||
          t.id === "settings" ||
          !settings.workspace.hiddenTabs.includes(t.id)
      ),
    [navTabs, settings.workspace.hiddenTabs]
  );

  const activeTabLabel =
    navTabs.find((t) => t.id === tab)?.label || "نظرة عامة";

  const sampleFilesAll = useMemo(
    () => files.filter((f) => f.cat === "عينات الأعمال"),
    [files]
  );
  const selectedSampleCount = useMemo(
    () =>
      sampleFilesAll.filter((f) => f.selectedForDisplay !== false).length,
    [sampleFilesAll]
  );

  const monthItemsCount = useMemo(
    () =>
      calendarEvents.filter((e) => e.date.startsWith(activeMonth)).length +
      workOrders.filter((w) => w.dueDate.startsWith(activeMonth)).length,
    [calendarEvents, workOrders, activeMonth]
  );

  const renderFileRows = (list: LibraryFileItem[], showSampleToggle = false) =>
    list.length ? (
      list.map((f) => {
        const selected = f.selectedForDisplay !== false;
        return (
          <div
            className={`row ${showSampleToggle ? "mh-sample-row" : ""} ${
              showSampleToggle && !selected ? "is-hidden" : ""
            }`}
            key={f.id}
          >
            {showSampleToggle ? (
              <button
                type="button"
                className={`mh-sample-check ${selected ? "checked" : ""}`}
                onClick={() => toggleFileDisplay(f.id)}
                title={
                  selected
                    ? "معروضة في صفحة المشاركة — اضغط لإخفائها"
                    : "مخفية عن المشاركة — اضغط لإظهارها"
                }
              >
                {selected ? <CheckSquare size={17} /> : <Square size={17} />}
              </button>
            ) : (
              <span className="fileicon">
                <FileText size={17} />
              </span>
            )}
            <div
              style={{ cursor: "pointer" }}
              onClick={() => previewLibraryFile(f)}
              title="اضغط لمعاينة الملف داخل الداشبورد"
            >
              <b>{f.name}</b>
              <small>
                {projects.find((p) => p.id === f.project)?.name || f.cat}
                {f.dueDate ? ` · ${f.dueDate}` : ""}
              </small>
            </div>
            {showSampleToggle && (
              <button
                type="button"
                className={`mh-display-chip ${selected ? "on" : ""}`}
                onClick={() => toggleFileDisplay(f.id)}
              >
                {selected ? "معروضة للمشاركة" : "مخفية"}
              </button>
            )}
            <label>{f.name.split(".").pop()?.toUpperCase()}</label>
            <div className="sa-row-actions">
              <button
                type="button"
                title="معاينة الملف داخل الداشبورد"
                onClick={() => previewLibraryFile(f)}
              >
                <Eye size={16} />
              </button>
              <button
                type="button"
                title="تعديل بيانات أو استبدال الملف"
                onClick={() => setEditingFile(f)}
              >
                <Edit3 size={15} />
              </button>
              <button
                type="button"
                title="تنزيل الملف"
                onClick={() => downloadFile(f)}
              >
                <Download size={16} />
              </button>
              <button
                type="button"
                title="حذف الملف"
                onClick={() => deleteFileItem(f)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        );
      })
    ) : (
      <p className="empty">لا توجد ملفات هنا بعد — ارفع أي ملف لمعاينته فوراً.</p>
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
      count: monthItemsCount,
      label: `أجندة ${formatMonthArabic(activeMonth)}`,
      icon: CalendarDays,
      target: "calendar" as MainTabId,
    },
    {
      count: activeWorkOrders,
      label: "أوامر تشغيل وصيانة MEP",
      icon: Wrench,
      target: "om" as MainTabId,
    },
    {
      count: files.length + smartArchiveCount,
      label: "ملفات ومخططات قابلة للمعاينة",
      icon: Files,
      target: "archive" as MainTabId,
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
      (p) =>
        p.type === projectFilter || (p.discipline || "").includes(projectFilter)
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
  const navPos = settings.workspace.navPosition || "right";

  return (
    <div
      className={[
        sidebarCompact ? "mh-compact-rail" : "",
        `mh-nav-${navPos}`,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Hidden Quick Upload & File Replace Inputs — accept ANY file type */}
      <input
        ref={quickUploadInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          handleQuickUploadFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceFileInput}
        type="file"
        hidden
        onChange={handleReplaceEditingFileBlob}
      />

      {/* Sidebar */}
      <aside
        className={`${mobile ? "open" : ""} ${sidebarCompact ? "compact" : ""}`}
      >
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

        {!sidebarCompact && (
          <small className="navtitle">مساحة العمل الهندسية</small>
        )}

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
                <RefreshCw
                  size={12}
                  className={syncState === "syncing" ? "mh-spin" : ""}
                />
                مزامنة الآن
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main>
        <header>
          <button
            type="button"
            className="menu"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <span>{settings.dashboardName || "Mhmed"}</span>
          <ChevronLeft size={14} />
          <b>{activeTabLabel}</b>

          <div className="mh-header-end">
            {/* Global Month Switcher Linked to Calendar */}
            <div
              className="mh-header-month"
              title="الشهر النشط المرتبط بالتقويم والمهام"
            >
              <button
                type="button"
                className="mh-month-step"
                onClick={() => changeActiveMonth(shiftMonthKey(activeMonth, -1))}
                aria-label="الشهر السابق"
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                className={`mh-month-Display ${tab === "calendar" ? "active" : ""}`}
                onClick={() => nav("calendar")}
              >
                <CalendarDays size={14} />
                <span>{formatMonthArabic(activeMonth)}</span>
              </button>
              <button
                type="button"
                className="mh-month-step"
                onClick={() => changeActiveMonth(shiftMonthKey(activeMonth, 1))}
                aria-label="الشهر التالي"
              >
                <ChevronLeft size={14} />
              </button>
            </div>

            {/* Pre-Share Sample Selection & Preview Button */}
            <button
              type="button"
              className="sa-btn-subtle active"
              onClick={() => setShowShareModal(true)}
              title="اختيار العينات والاطلاع على المعاينة قبل المشاركة"
            >
              <Share2 size={15} />
              <span className="mh-hide-xs">
                معاينة ومشاركة ({selectedSampleCount})
              </span>
            </button>

            <button
              type="button"
              className="mh-header-icon-btn"
              onClick={() => pushToCloud(false)}
              title="مزامنة الآن"
              disabled={syncState === "syncing"}
            >
              <RefreshCw
                size={16}
                className={syncState === "syncing" ? "mh-spin" : ""}
              />
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
          {/* ==================== OVERVIEW TAB ==================== */}
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
                  <div className="mh-flex-between" style={{ gap: 8 }}>
                    <label>● &nbsp; {settings.heroBadge}</label>
                    <button
                      type="button"
                      className="sa-btn-subtle"
                      style={{ padding: "4px 10px", fontSize: 11.5 }}
                      onClick={() => nav("settings", "brand")}
                      title="تعديل عنوان ووصف البانر الترحيبي"
                    >
                      <Edit3 size={12} /> تعديل البانر
                    </button>
                  </div>
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
                      onClick={() => triggerQuickUpload("عينات الأعمال")}
                    >
                      <Upload size={16} /> رفع ملف ومعاينته فوراً
                    </button>
                    <button
                      type="button"
                      className="outline"
                      onClick={() => setShowShareModal(true)}
                    >
                      <Share2 size={16} /> اختيار العينات ومعاينة المشاركة
                    </button>
                    <button
                      type="button"
                      className="outline"
                      onClick={() => nav("calendar")}
                    >
                      <CalendarDays size={16} /> التقويم الشهري
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

              {/* Month-Linked Quick Calendar Card */}
              {settings.appearance.showQuickCalendarCard !== false && (
                <div style={{ marginTop: 18 }}>
                  <OverviewMonthCalendarCard
                    activeMonth={activeMonth}
                    onChangeMonth={changeActiveMonth}
                    selectedDate={selectedDate}
                    onSelectDate={(d) => {
                      setSelectedDate(d);
                      nav("calendar");
                    }}
                    events={calendarEvents}
                    workOrders={workOrders}
                    projects={projects}
                    onOpenCalendar={() => nav("calendar")}
                  />
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
                          عرض وتعديل السيرة الذاتية <ChevronLeft size={14} />
                        </button>
                      </div>
                    </section>
                  )}

                  {settings.appearance.showQuickOmCard && (
                    <section className="mh-panel mh-quick-card">
                      <div className="mh-flex-between">
                        <div>
                          <small className="eyebrow">MEP O&amp;M · MAXIMO</small>
                          <h3 style={{ margin: "2px 0" }}>
                            إشراف التشغيل والصيانة (كهرباء وميكانيكا)
                          </h3>
                        </div>
                        <Zap size={22} className="sa-copper-icon" />
                      </div>
                      <p className="mh-quick-desc">
                        {activeWorkOrders} أوامر عمل نشطة في الصيانة الوقائية
                        والتصحيحية وإشراف التنفيذ الكهروميكانيكي.
                      </p>
                      <div className="mh-flex-between" style={{ marginTop: 12 }}>
                        <span className="mh-pill">
                          إجمالي المسجل: {workOrders.length} أمر عمل
                        </span>
                        <button
                          type="button"
                          className="sa-btn-subtle active"
                          onClick={() => nav("om")}
                        >
                          لوحة أوامر العمل <ChevronLeft size={14} />
                        </button>
                      </div>
                    </section>
                  )}
                </div>
              )}
            </>
          )}

          {/* ==================== MONTH-LINKED CALENDAR TAB ==================== */}
          {tab === "calendar" && (
            <MonthlyCalendarView
              activeMonth={activeMonth}
              onChangeMonth={changeActiveMonth}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              events={calendarEvents}
              onChangeEvents={updateCalendarEvents}
              workOrders={workOrders}
              onChangeWorkOrders={updateWorkOrders}
              projects={projects}
              files={files}
              onOpenProject={(projId) => {
                setPid(projId);
                setModal("detail");
              }}
              onPreviewFile={previewLibraryFile}
              onOpenOmTab={() => nav("om")}
              onNotify={setMsg}
            />
          )}

          {/* ==================== INTERACTIVE CV TAB ==================== */}
          {tab === "cv" && (
            <CvProfileView
              cv={cv}
              profile={settings.profile}
              onUpdateCv={updateCv}
              onOpenAvatarSettings={() => nav("settings", "profile")}
              onOpenShareShowcase={() => setShowShareModal(true)}
              onNotify={setMsg}
            />
          )}

          {/* ==================== MEP O&M EXECUTION TAB ==================== */}
          {tab === "om" && (
            <OmExecutionView
              workOrders={workOrders}
              onChangeWorkOrders={updateWorkOrders}
              activeMonth={activeMonth}
              onOpenCalendar={() => nav("calendar")}
              onNotify={setMsg}
            />
          )}

          {/* ==================== PROJECTS SECTION ==================== */}
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
                <div className="mh-btn-row">
                  {tab === "projects" && (
                    <button
                      type="button"
                      className="sa-btn-subtle active"
                      onClick={() => setShowShareModal(true)}
                    >
                      <Share2 size={14} /> معاينة المشاريع بالمشاركة
                    </button>
                  )}
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
                {filteredProjects.map((p) => {
                  const shown = p.selectedForDisplay !== false;
                  return (
                    <div
                      key={p.id}
                      className="card"
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setPid(p.id);
                        setModal("detail");
                      }}
                    >
                      <div
                        className="drawing"
                        style={{ backgroundImage: `url(./art/${p.art || 1}.svg)` }}
                      >
                        <label>
                          ● &nbsp; {p.progress === 100 ? "مكتمل" : "قيد التنفيذ"}
                        </label>
                      </div>
                      <div className="cardbody">
                        <div
                          className="mh-flex-between"
                          style={{ gap: 6, marginBottom: 4 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <small className="tech" style={{ margin: 0 }}>
                            <Layers size={13} />
                            {p.type}
                          </small>
                          <div className="mh-card-inline-tools">
                            <button
                              type="button"
                              className={`mh-display-chip ${shown ? "on" : ""}`}
                              onClick={() => toggleProjectDisplay(p.id)}
                              title="تحديد أو إخفاء المشروع عند المشاركة"
                            >
                              {shown ? "معروض" : "مخفي"}
                            </button>
                            <button
                              type="button"
                              className="mh-icon-tiny"
                              title="تعديل المشروع"
                              onClick={() => setEditingProject(p)}
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              className="mh-icon-tiny danger"
                              title="حذف المشروع"
                              onClick={() => deleteProjectById(p.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <h3>{p.name}</h3>
                        <small>
                          <MapPin size={13} />
                          {p.city}
                          {p.targetDate ? ` · ${p.targetDate}` : ""}
                        </small>
                        <div className="progress">
                          <span>نسبة الإنجاز</span>
                          <b>{p.progress}%</b>
                        </div>
                        <div className="track">
                          <i style={{ width: p.progress + "%" }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ==================== CERTIFICATES SUMMARY (WITH FULL CRUD) ==================== */}
          {tab === "certificates" && (
            <section className="mh-panel" style={{ marginBottom: 16 }}>
              <div className="mh-panel-title">
                <div>
                  <small className="eyebrow">QUALIFICATIONS &amp; CREDENTIALS</small>
                  <h3>المؤهل العلمي والشهادات والاعتمادات المسجلة</h3>
                </div>
                <div className="mh-btn-row">
                  <button
                    type="button"
                    className="sa-btn-subtle active"
                    onClick={() => setAddingCert(true)}
                  >
                    <Plus size={14} /> إضافة شهادة جديدة
                  </button>
                  <button
                    type="button"
                    className="sa-btn-subtle"
                    onClick={() => nav("cv")}
                  >
                    عرض السيرة الذاتية <ChevronLeft size={14} />
                  </button>
                </div>
              </div>
              <div className="mh-cv-projects-grid">
                {cv.certifications.map((cert) => {
                  const shown = cert.selectedForDisplay !== false;
                  return (
                    <div key={cert.id} className="mh-inset-card">
                      <div className="mh-flex-between" style={{ gap: 6 }}>
                        <span className="mh-pill accent">
                          <Award size={12} /> {cert.category}
                        </span>
                        <div className="mh-card-inline-tools">
                          <button
                            type="button"
                            className={`mh-display-chip ${shown ? "on" : ""}`}
                            onClick={() => toggleCertDisplay(cert.id)}
                          >
                            {shown ? "معروضة" : "مخفية"}
                          </button>
                          <button
                            type="button"
                            className="mh-icon-tiny"
                            title="تعديل الشهادة"
                            onClick={() => setEditingCert(cert)}
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            className="mh-icon-tiny danger"
                            title="حذف الشهادة"
                            onClick={() => deleteCertById(cert.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <h4 style={{ margin: "8px 0 4px" }}>{cert.title}</h4>
                      <small>{cert.issuer}</small>
                      <small style={{ marginTop: 6, fontWeight: 600 }}>
                        {cert.year}
                      </small>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ==================== FILES / SAMPLES / CERTIFICATES / O&M SITE FILES ==================== */}
          {(tab === "overview" ||
            tab === "files" ||
            tab === "samples" ||
            tab === "certificates" ||
            tab === "om") && (
            <>
              <div className="heading">
                <div>
                  <small className="eyebrow">
                    {tab === "samples"
                      ? "CURATED WORK SAMPLES · اختيار العينات والاطلاع عليها قبل المشاركة"
                      : "FILE ARCHIVE & UNIVERSAL PREVIEW"}
                  </small>
                  <h2>
                    {tab === "overview"
                      ? "أحدث الملفات والمخططات (اضغط على أي ملف للمعاينة)"
                      : tab === "om"
                        ? "ملفات ومخططات المواقع والتشغيل"
                        : activeTabLabel}
                  </h2>
                </div>
                <div className="mh-btn-row">
                  {tab === "samples" && (
                    <button
                      type="button"
                      className="primary mh-btn-nomargin"
                      onClick={() => setShowShareModal(true)}
                    >
                      <Share2 size={15} /> معاينة المختار قبل المشاركة (
                      {selectedSampleCount})
                    </button>
                  )}
                  {tab === "files" && (
                    <button
                      type="button"
                      className="sa-btn-subtle"
                      onClick={() => {
                        updateFiles(DEFAULT_SAMPLE_FILES);
                        setMsg("تمت استعادة الملفات الافتراضية");
                      }}
                    >
                      <RotateCcw size={14} /> استعادة الافتراضي
                    </button>
                  )}
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
                    {tab === "overview" ? "عرض المكتبة" : "رفع ملف ومعاينته"}{" "}
                    <ChevronLeft size={15} />
                  </button>
                </div>
              </div>

              {/* Dedicated Sample Curation Bar in Samples Tab */}
              {tab === "samples" && (
                <section
                  className="mh-panel mh-sample-curation-bar"
                  style={{ marginBottom: 14 }}
                >
                  <div>
                    <b>
                      العينات المختارة للعرض والمشاركة: {selectedSampleCount} من
                      أصل {sampleFilesAll.length}
                    </b>
                    <small>
                      فعّل العينات التي ترغب بعرضها واضغط «الاطلاع على العرض قبل
                      المشاركة» لمراجعة كل شيء قبل الإرسال.
                    </small>
                  </div>
                  <div className="mh-btn-row">
                    <button
                      type="button"
                      className="sa-btn-subtle"
                      onClick={() =>
                        updateFiles(
                          files.map((f) =>
                            f.cat === "عينات الأعمال"
                              ? { ...f, selectedForDisplay: true }
                              : f
                          )
                        )
                      }
                    >
                      <CheckSquare size={14} /> تحديد الكل
                    </button>
                    <button
                      type="button"
                      className="sa-btn-subtle"
                      onClick={() =>
                        updateFiles(
                          files.map((f) =>
                            f.cat === "عينات الأعمال"
                              ? { ...f, selectedForDisplay: false }
                              : f
                          )
                        )
                      }
                    >
                      <Square size={14} /> إلغاء تحديد الكل
                    </button>
                    <button
                      type="button"
                      className="sa-btn-subtle active"
                      onClick={() => setShowShareModal(true)}
                    >
                      <Eye size={14} /> الاطلاع على العرض قبل المشاركة
                    </button>
                  </div>
                </section>
              )}

              {tab !== "overview" && (
                <div className="search">
                  <Search size={17} />
                  <input
                    placeholder="ابحث باسم الملف أو التصنيف…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              )}
              <div className="list">
                {renderFileRows(
                  files
                    .filter((f) => {
                      const matchesQuery = `${f.name} ${f.cat}`
                        .toLowerCase()
                        .includes(q.trim().toLowerCase());
                      if (!matchesQuery) return false;
                      if (tab === "overview" || tab === "files") return true;
                      if (tab === "samples") return f.cat === "عينات الأعمال";
                      if (tab === "certificates") return f.cat === "الشهادات";
                      if (tab === "om") {
                        return (
                          f.cat === "التشغيل والصيانة" ||
                          projects.some(
                            (p) => isOmProject(p) && p.id === f.project
                          )
                        );
                      }
                      return true;
                    })
                    .slice(0, tab === "overview" ? 5 : undefined),
                  tab === "samples"
                )}
              </div>
            </>
          )}

          {/* ==================== SMART ARCHIVE TAB ==================== */}
          {tab === "archive" && (
            <SmartArchiveView
              projects={projects}
              onNotify={setMsg}
              onArchiveCountChange={setSmartArchiveCount}
              onPromoteToSample={handlePromoteArchiveToSample}
            />
          )}

          {/* ==================== COMPREHENSIVE SETTINGS & SYNC TAB ==================== */}
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
              allNavTabs={navTabs.map(({ id, label }) => ({ id, label }))}
            />
          )}
        </article>
      </main>

      {/* ==================== UNIVERSAL IN-APP FILE PREVIEW MODAL ==================== */}
      <UniversalFilePreviewModal
        target={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />

      {/* ==================== PRE-SHARE SHOWCASE & SAMPLE SELECTOR MODAL ==================== */}
      <ShareShowcaseModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        cv={cv}
        profile={settings.profile}
        files={files}
        projects={projects}
        onToggleFileDisplay={toggleFileDisplay}
        onToggleProjectDisplay={toggleProjectDisplay}
        onToggleCertDisplay={toggleCertDisplay}
        onPreviewFile={previewLibraryFile}
        onNotify={setMsg}
      />

      {/* ==================== MODALS: NEW PROJECT / UPLOAD FILE / PROJECT DETAILS ==================== */}
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
                  ? "رفع ملفات ومخططات (مع معاينة فورية)"
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
                      targetDate:
                        String(f.get("targetDate") || "").trim() ||
                        defaultDateInMonth(activeMonth, 20),
                      selectedForDisplay: f.get("selectedForDisplay") === "on",
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
                  setMsg("تمت إضافة المشروع وربطه بالتقويم");
                }}
              >
                <label>
                  اسم المشروع
                  <input
                    name="name"
                    required
                    placeholder="مثال: توسعة مبنى العيادات..."
                  />
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
                        : settings.workspace.customDisciplines[0] ||
                          "AutoCAD MEP"
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
                  <input
                    name="discipline"
                    placeholder="تكييف وكهرباء ومكافحة حريق"
                  />
                </label>
                <label>
                  تاريخ المتابعة (مرتبط بالتقويم الشهري)
                  <input
                    name="targetDate"
                    type="date"
                    defaultValue={defaultDateInMonth(activeMonth, 20)}
                  />
                </label>
                <label>
                  نسبة الإنجاز المبدئية (%)
                  <input
                    name="progress"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={10}
                  />
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <input
                    type="checkbox"
                    name="selectedForDisplay"
                    style={{ width: 16, height: 16, margin: 0 }}
                    defaultChecked
                  />
                  <span>إظهار المشروع في صفحة المشاركة</span>
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
                    const cat = String(data.get("cat"));
                    const projId = String(data.get("pid") || "");
                    const dueDate = String(data.get("dueDate") || "");
                    const selectedForDisplay =
                      data.get("selectedForDisplay") === "on";
                    const created: LibraryFileItem[] = [];
                    let firstBlob: Blob | null = null;

                    for (const blob of Array.from(input.current!.files || [])) {
                      const m: LibraryFileItem = {
                        id: crypto.randomUUID(),
                        name: blob.name,
                        date: Date.now(),
                        size: blob.size,
                        mimeType: blob.type || undefined,
                        cat,
                        project: projId,
                        dueDate: dueDate || defaultDateInMonth(activeMonth, 15),
                        selectedForDisplay,
                      };
                      await putStoredFileBlob(m, blob);
                      if (!firstBlob) firstBlob = blob;
                      created.push(m);
                    }

                    if (created.length > 0) {
                      updateFiles([...created, ...files]);
                      setModal("");
                      // Open Universal Preview right away!
                      if (firstBlob) {
                        setPreviewTarget({
                          id: created[0].id,
                          name: created[0].name,
                          size: created[0].size,
                          mimeType: created[0].mimeType,
                          blob: firstBlob,
                          category: created[0].cat,
                          addedAt: created[0].date,
                        });
                      }
                      setMsg("تم حفظ الملفات وفتح المعاينة الفورية");
                    }
                  } catch {
                    setMsg("تعذر الحفظ. تحقق من مساحة التخزين المتاحة.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <p>
                  يدعم معاينة كافة الصيغ: PDF، Excel، Word، PowerPoint، CSV،
                  DXF، IFC، DWG، RVT، الصور، الفيديو، الصوت، ZIP والملفات النصية.
                </p>
                <button
                  type="button"
                  className="mh-choice-pill"
                  onClick={() => nav("archive")}
                >
                  للتصنيف التلقائي حسب محتوى الملف: افتح الأرشيف الذكي
                </button>
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
                <label>
                  تاريخ الوثيقة (مرتبط بالتقويم الشهري)
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={defaultDateInMonth(
                      activeMonth,
                      new Date().getDate()
                    )}
                  />
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <input
                    type="checkbox"
                    name="selectedForDisplay"
                    style={{ width: 16, height: 16, margin: 0 }}
                    defaultChecked={
                      tab === "samples" || tab === "certificates"
                    }
                  />
                  <span>إظهار الملف ضمن العينات المختارة للمشاركة</span>
                </label>
                <button className="primary" disabled={busy}>
                  {busy ? "جارٍ الحفظ…" : "حفظ ومعاينة الملف"}
                </button>
              </form>
            ) : (
              project && (
                <>
                  <p>
                    {project.city} · {project.type}
                    {project.client ? ` · ${project.client}` : ""}
                    {project.targetDate
                      ? ` · المتابعة: ${project.targetDate}`
                      : ""}
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
                  {renderFileRows(files.filter((f) => f.project === pid))}
                  <div className="mh-flex-between" style={{ marginTop: 14 }}>
                    <div className="mh-btn-row">
                      <button
                        type="button"
                        className="primary mh-btn-nomargin"
                        onClick={() => setModal("upload")}
                      >
                        <Upload size={15} /> رفع ملفات للمشروع
                      </button>
                      <button
                        type="button"
                        className="sa-btn-subtle active"
                        onClick={() => {
                          setModal("");
                          setEditingProject(project);
                        }}
                      >
                        <Edit3 size={15} /> تعديل بيانات المشروع
                      </button>
                    </div>
                    <button
                      type="button"
                      className="sa-delete-btn"
                      onClick={() => deleteProjectById(pid)}
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

      {/* ==================== EDIT PROJECT MODAL ==================== */}
      {editingProject && (
        <div className="overlay" onClick={() => setEditingProject(null)}>
          <section
            className="dialog sa-wide-dialog"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="close"
              onClick={() => setEditingProject(null)}
            >
              <X />
            </button>
            <h2>تعديل بيانات المشروع الهندسي</h2>
            <form onSubmit={handleSaveProjectEdit}>
              <div className="mh-form-grid">
                <label>
                  اسم المشروع (عربي)
                  <input
                    name="name"
                    required
                    defaultValue={editingProject.name}
                  />
                </label>
                <label>
                  اسم المشروع (إنجليزي — اختياري)
                  <input
                    name="nameEn"
                    dir="ltr"
                    defaultValue={editingProject.nameEn || ""}
                  />
                </label>
                <label>
                  المدينة / الموقع
                  <input
                    name="city"
                    required
                    defaultValue={editingProject.city}
                  />
                </label>
                <label>
                  العميل / الجهة المالكة
                  <input
                    name="client"
                    defaultValue={editingProject.client || ""}
                  />
                </label>
                <label>
                  نوع العمل / التخصص الرئيسي
                  <input
                    name="type"
                    required
                    defaultValue={editingProject.type}
                  />
                </label>
                <label>
                  التخصص التفصيلي
                  <input
                    name="discipline"
                    defaultValue={editingProject.discipline || ""}
                  />
                </label>
                <label>
                  نسبة الإنجاز (%)
                  <input
                    name="progress"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={editingProject.progress}
                  />
                </label>
                <label>
                  تاريخ المتابعة (مرتبط بالتقويم الشهري)
                  <input
                    name="targetDate"
                    type="date"
                    defaultValue={
                      editingProject.targetDate ||
                      defaultDateInMonth(activeMonth, 20)
                    }
                  />
                </label>
                <label className="mh-span-2">
                  نطاق العمل والملاحظات
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={editingProject.notes || ""}
                  />
                </label>
                <label
                  className="mh-span-2"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <input
                    type="checkbox"
                    name="selectedForDisplay"
                    style={{ width: 16, height: 16, margin: 0 }}
                    defaultChecked={editingProject.selectedForDisplay !== false}
                  />
                  <span>إظهار هذا المشروع ضمن البروفايل المعدّ للمشاركة</span>
                </label>
              </div>
              <div className="mh-flex-between" style={{ marginTop: 14 }}>
                <button type="submit" className="primary mh-btn-nomargin">
                  <Check size={15} /> حفظ تعديلات المشروع
                </button>
                <button
                  type="button"
                  className="sa-delete-btn"
                  onClick={() => deleteProjectById(editingProject.id)}
                >
                  <Trash2 size={14} /> حذف المشروع
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ==================== EDIT LIBRARY FILE / SAMPLE MODAL ==================== */}
      {editingFile && (
        <div className="overlay" onClick={() => setEditingFile(null)}>
          <section
            className="dialog"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="close"
              onClick={() => setEditingFile(null)}
            >
              <X />
            </button>
            <h2>تعديل بيانات الملف / العينة</h2>
            <form onSubmit={handleSaveFileEdit}>
              <label>
                اسم الملف المعروض
                <input name="name" required defaultValue={editingFile.name} />
              </label>
              <label>
                التصنيف
                <select name="cat" defaultValue={editingFile.cat}>
                  <option>مكتبة الملفات</option>
                  <option>عينات الأعمال</option>
                  <option>التشغيل والصيانة</option>
                  <option>الشهادات</option>
                  <option>السيرة الذاتية</option>
                </select>
              </label>
              <label>
                المشروع المرتبط
                <select name="project" defaultValue={editingFile.project || ""}>
                  <option value="">بدون مشروع</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                التاريخ المرتبط بالتقويم الشهري
                <input
                  name="dueDate"
                  type="date"
                  defaultValue={
                    editingFile.dueDate || defaultDateInMonth(activeMonth, 15)
                  }
                />
              </label>
              <label>
                ملاحظات فنية (تظهر في صفحة المشاركة والمعاينة)
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingFile.notes || ""}
                />
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <input
                  type="checkbox"
                  name="selectedForDisplay"
                  style={{ width: 16, height: 16, margin: 0 }}
                  defaultChecked={editingFile.selectedForDisplay !== false}
                />
                <span>إظهار هذه العينة عند مشاركة البروفايل</span>
              </label>

              <div className="mh-btn-row" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="sa-btn-subtle"
                  onClick={() => previewLibraryFile(editingFile)}
                >
                  <Eye size={14} /> معاينة الملف الحالي
                </button>
                <button
                  type="button"
                  className="sa-btn-subtle"
                  onClick={() => replaceFileInput.current?.click()}
                >
                  <Upload size={14} /> استبدال الملف بملف جديد من جهازك
                </button>
              </div>

              <div className="mh-flex-between" style={{ marginTop: 16 }}>
                <button type="submit" className="primary mh-btn-nomargin">
                  <Check size={15} /> حفظ التعديلات
                </button>
                <button
                  type="button"
                  className="sa-delete-btn"
                  onClick={() => deleteFileItem(editingFile)}
                >
                  <Trash2 size={14} /> حذف الملف
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ==================== ADD / EDIT CERTIFICATE MODALS ==================== */}
      {addingCert && (
        <div className="overlay" onClick={() => setAddingCert(false)}>
          <section
            className="dialog"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="close"
              onClick={() => setAddingCert(false)}
            >
              <X />
            </button>
            <h2>إضافة شهادة أو اعتماد جديد</h2>
            <form onSubmit={handleCreateCert}>
              <label>
                عنوان الشهادة / الاعتماد
                <input
                  name="title"
                  required
                  placeholder="مثال: دورة Revit MEP المتقدمة..."
                />
              </label>
              <label>
                الجهة المانحة
                <input
                  name="issuer"
                  required
                  placeholder="Autodesk / جهة معتمدة"
                />
              </label>
              <label>
                الفئة
                <input name="category" defaultValue="اعتماد هندسي" />
              </label>
              <label>
                السنة / الفترة
                <input name="year" defaultValue="2026" />
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <input
                  type="checkbox"
                  name="selectedForDisplay"
                  style={{ width: 16, height: 16, margin: 0 }}
                  defaultChecked
                />
                <span>إظهار الشهادة في صفحة المشاركة</span>
              </label>
              <button className="primary">إضافة الشهادة</button>
            </form>
          </section>
        </div>
      )}

      {editingCert && (
        <div className="overlay" onClick={() => setEditingCert(null)}>
          <section
            className="dialog"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="close"
              onClick={() => setEditingCert(null)}
            >
              <X />
            </button>
            <h2>تعديل الشهادة / الاعتماد</h2>
            <form onSubmit={handleSaveCertEdit}>
              <label>
                عنوان الشهادة / الاعتماد
                <input name="title" required defaultValue={editingCert.title} />
              </label>
              <label>
                الجهة المانحة
                <input
                  name="issuer"
                  required
                  defaultValue={editingCert.issuer}
                />
              </label>
              <label>
                الفئة
                <input name="category" defaultValue={editingCert.category} />
              </label>
              <label>
                السنة / الفترة
                <input name="year" defaultValue={editingCert.year} />
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <input
                  type="checkbox"
                  name="selectedForDisplay"
                  style={{ width: 16, height: 16, margin: 0 }}
                  defaultChecked={editingCert.selectedForDisplay !== false}
                />
                <span>إظهار الشهادة في صفحة المشاركة</span>
              </label>
              <div className="mh-flex-between" style={{ marginTop: 14 }}>
                <button type="submit" className="primary mh-btn-nomargin">
                  <Check size={15} /> حفظ التعديلات
                </button>
                <button
                  type="button"
                  className="sa-delete-btn"
                  onClick={() => deleteCertById(editingCert.id)}
                >
                  <Trash2 size={14} /> حذف الشهادة
                </button>
              </div>
            </form>
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
