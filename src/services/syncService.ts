import {
  CvProfileData,
  DashboardSettings,
  MhmedSyncSnapshot,
  OmWorkOrder,
  ProjectItem,
  SyncConfig,
} from "../types/mhmed";
import {
  DEFAULT_CV_DATA,
  DEFAULT_OM_WORK_ORDERS,
  DEFAULT_PROJECTS,
  DEFAULT_SETTINGS,
  DEFAULT_SYNC_CONFIG,
} from "../data/mhmedSeedData";

const KEYS = {
  settings: "mhmed-settings-v2",
  cv: "mhmed-cv-v2",
  projects: "mhmed-projects-v2",
  legacyProjects: "mimar-projects",
  workOrders: "mhmed-workorders-v2",
  syncConfig: "mhmed-sync-config-v2",
  deviceId: "mhmed-device-id",
};

const SYNC_FILENAME = "mhmed-dashboard-sync.json";
const SYNC_CHANNEL = "mhmed-dashboard-sync-channel";
const CV_PDF_DB = "mhmed-cv-pdf-store";

export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(KEYS.deviceId);
    if (!id) {
      id = "dev-" + (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36));
      localStorage.setItem(KEYS.deviceId, id);
    }
    return id;
  } catch {
    return "dev-local";
  }
}

export function loadSettings(): DashboardSettings {
  try {
    const raw = localStorage.getItem(KEYS.settings);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<DashboardSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      profile: { ...DEFAULT_SETTINGS.profile, ...(parsed.profile || {}) },
      appearance: { ...DEFAULT_SETTINGS.appearance, ...(parsed.appearance || {}) },
      workspace: { ...DEFAULT_SETTINGS.workspace, ...(parsed.workspace || {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: DashboardSettings): void {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

export function loadCvData(): CvProfileData {
  try {
    const raw = localStorage.getItem(KEYS.cv);
    if (!raw) return DEFAULT_CV_DATA;
    const parsed = JSON.parse(raw) as Partial<CvProfileData>;
    return {
      ...DEFAULT_CV_DATA,
      ...parsed,
      responsibilities: Array.isArray(parsed.responsibilities)
        ? parsed.responsibilities
        : DEFAULT_CV_DATA.responsibilities,
      experiences: Array.isArray(parsed.experiences)
        ? parsed.experiences
        : DEFAULT_CV_DATA.experiences,
      skills: Array.isArray(parsed.skills) ? parsed.skills : DEFAULT_CV_DATA.skills,
      cvProjects: Array.isArray(parsed.cvProjects)
        ? parsed.cvProjects
        : DEFAULT_CV_DATA.cvProjects,
      education: Array.isArray(parsed.education)
        ? parsed.education
        : DEFAULT_CV_DATA.education,
      certifications: Array.isArray(parsed.certifications)
        ? parsed.certifications
        : DEFAULT_CV_DATA.certifications,
    };
  } catch {
    return DEFAULT_CV_DATA;
  }
}

export function saveCvData(cv: CvProfileData): void {
  localStorage.setItem(KEYS.cv, JSON.stringify(cv));
}

export function loadProjects(): ProjectItem[] {
  try {
    const raw = localStorage.getItem(KEYS.projects);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    return DEFAULT_PROJECTS;
  } catch {
    return DEFAULT_PROJECTS;
  }
}

export function saveProjects(projects: ProjectItem[]): void {
  localStorage.setItem(KEYS.projects, JSON.stringify(projects));
}

export function loadWorkOrders(): OmWorkOrder[] {
  try {
    const raw = localStorage.getItem(KEYS.workOrders);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    return DEFAULT_OM_WORK_ORDERS;
  } catch {
    return DEFAULT_OM_WORK_ORDERS;
  }
}

export function saveWorkOrders(orders: OmWorkOrder[]): void {
  localStorage.setItem(KEYS.workOrders, JSON.stringify(orders));
}

export function loadSyncConfig(): SyncConfig {
  try {
    const raw = localStorage.getItem(KEYS.syncConfig);
    if (!raw) return DEFAULT_SYNC_CONFIG;
    return { ...DEFAULT_SYNC_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SYNC_CONFIG;
  }
}

export function saveSyncConfig(cfg: SyncConfig): void {
  localStorage.setItem(KEYS.syncConfig, JSON.stringify(cfg));
}

/**
 * IndexedDB storage for user-uploaded replacement CV PDF
 */
function openCvPdfDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CV_PDF_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains("cv_pdf")) {
        req.result.createObjectStore("cv_pdf");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCustomCvPdf(file: File): Promise<void> {
  const db = await openCvPdfDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cv_pdf", "readwrite");
    tx.objectStore("cv_pdf").put({ blob: file, name: file.name, updatedAt: Date.now() }, "current");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadCustomCvPdf(): Promise<{ blob: Blob; name: string } | null> {
  try {
    const db = await openCvPdfDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("cv_pdf", "readonly");
      const req = tx.objectStore("cv_pdf").get("current");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function clearCustomCvPdf(): Promise<void> {
  const db = await openCvPdfDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cv_pdf", "readwrite");
    tx.objectStore("cv_pdf").delete("current");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Compress an uploaded avatar/logo image so it stays fast, crisp, and cloud-sync friendly
 */
export function compressImageFile(file: File, maxSize = 320, quality = 0.86): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذر قراءة الصورة"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("صيغة الصورة غير مدعومة"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const target = Math.min(maxSize, side);
        canvas.width = target;
        canvas.height = target;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target);
        try {
          resolve(canvas.toDataURL("image/webp", quality));
        } catch {
          resolve(canvas.toDataURL("image/jpeg", quality));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Build & validate full sync snapshot
 */
export function buildSyncSnapshot(
  settings: DashboardSettings,
  cv: CvProfileData,
  projects: ProjectItem[],
  workOrders: OmWorkOrder[]
): MhmedSyncSnapshot {
  return {
    schemaVersion: 2,
    appName: settings.dashboardName || "Mhmed",
    updatedAt: Date.now(),
    deviceId: getOrCreateDeviceId(),
    settings,
    cv,
    projects,
    workOrders,
  };
}

export function parseAndValidateSnapshot(raw: unknown): MhmedSyncSnapshot {
  if (!raw || typeof raw !== "object") {
    throw new Error("بيانات المزامنة غير صالحة");
  }
  const obj = raw as Partial<MhmedSyncSnapshot>;
  if (!obj.settings || !obj.cv || !Array.isArray(obj.projects)) {
    throw new Error("ملف النسخة الاحتياطية ناقص أو لا يطابق هيكل لوحة Mhmed");
  }
  return {
    schemaVersion: 2,
    appName: obj.appName || obj.settings.dashboardName || "Mhmed",
    updatedAt: typeof obj.updatedAt === "number" ? obj.updatedAt : Date.now(),
    deviceId: obj.deviceId || "imported",
    settings: {
      ...DEFAULT_SETTINGS,
      ...obj.settings,
      profile: { ...DEFAULT_SETTINGS.profile, ...(obj.settings.profile || {}) },
      appearance: { ...DEFAULT_SETTINGS.appearance, ...(obj.settings.appearance || {}) },
      workspace: { ...DEFAULT_SETTINGS.workspace, ...(obj.settings.workspace || {}) },
    },
    cv: { ...DEFAULT_CV_DATA, ...obj.cv },
    projects: obj.projects,
    workOrders: Array.isArray(obj.workOrders) ? obj.workOrders : DEFAULT_OM_WORK_ORDERS,
  };
}

/**
 * Multi-tab real-time synchronization via BroadcastChannel
 */
export function broadcastTabSync(snapshot: MhmedSyncSnapshot): void {
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const ch = new BroadcastChannel(SYNC_CHANNEL);
      ch.postMessage({ type: "SNAPSHOT_UPDATED", snapshot });
      ch.close();
    }
  } catch {
    // Fallback handled by storage event
  }
}

export function subscribeTabSync(onSnapshot: (snap: MhmedSyncSnapshot) => void): () => void {
  const myDeviceId = getOrCreateDeviceId();
  let ch: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      ch = new BroadcastChannel(SYNC_CHANNEL);
      ch.onmessage = (ev) => {
        if (ev.data?.type === "SNAPSHOT_UPDATED" && ev.data?.snapshot) {
          try {
            const snap = parseAndValidateSnapshot(ev.data.snapshot);
            if (snap.deviceId !== myDeviceId || document.visibilityState !== "visible") {
              onSnapshot(snap);
            }
          } catch {
            // ignore malformed
          }
        }
      };
    }
  } catch {
    // BroadcastChannel unavailable
  }

  const onStorage = (e: StorageEvent) => {
    if (
      e.key === KEYS.settings ||
      e.key === KEYS.cv ||
      e.key === KEYS.projects ||
      e.key === KEYS.workOrders
    ) {
      onSnapshot(
        buildSyncSnapshot(loadSettings(), loadCvData(), loadProjects(), loadWorkOrders())
      );
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    ch?.close();
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * GitHub Gist Cloud Sync (Private Gist)
 */
export async function pushToGitHubGist(
  token: string,
  gistId: string,
  snapshot: MhmedSyncSnapshot
): Promise<{ gistId: string; updatedAt: number }> {
  const cleanToken = token.trim();
  if (!cleanToken) throw new Error("أدخل GitHub Personal Access Token (بصلاحية gist) أولاً");

  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${cleanToken}`,
    "Content-Type": "application/json",
  };

  let targetGistId = gistId.trim();

  // If no gistId yet, look for an existing mhmed-dashboard-sync.json gist first
  if (!targetGistId) {
    const listRes = await fetch("https://api.github.com/gists?per_page=30", { headers });
    if (!listRes.ok) {
      throw new Error(`تعذر الاتصال بـ GitHub (${listRes.status}) — تأكد من صحة التوكن وصلاحية gist`);
    }
    const gists = (await listRes.json()) as Array<{
      id: string;
      files?: Record<string, unknown>;
    }>;
    const existing = gists.find((g) => g.files && SYNC_FILENAME in g.files);
    if (existing) {
      targetGistId = existing.id;
    }
  }

  const payload = {
    description: `${snapshot.appName} Dashboard Sync Snapshot`,
    public: false,
    files: {
      [SYNC_FILENAME]: {
        content: JSON.stringify(snapshot, null, 2),
      },
    },
  };

  const url = targetGistId
    ? `https://api.github.com/gists/${encodeURIComponent(targetGistId)}`
    : "https://api.github.com/gists";

  const res = await fetch(url, {
    method: targetGistId ? "PATCH" : "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`فشل رفع المزامنة إلى GitHub Gist (${res.status}) ${errText.slice(0, 120)}`);
  }

  const data = (await res.json()) as { id: string };
  return { gistId: data.id, updatedAt: snapshot.updatedAt };
}

export async function pullFromGitHubGist(
  token: string,
  gistId: string
): Promise<{ snapshot: MhmedSyncSnapshot; gistId: string }> {
  const cleanToken = token.trim();
  if (!cleanToken) throw new Error("أدخل GitHub Token أولاً");

  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${cleanToken}`,
  };

  let targetGistId = gistId.trim();

  if (!targetGistId) {
    const listRes = await fetch("https://api.github.com/gists?per_page=30", { headers });
    if (!listRes.ok) {
      throw new Error(`تعذر قراءة قائمة Gists من GitHub (${listRes.status})`);
    }
    const gists = (await listRes.json()) as Array<{
      id: string;
      files?: Record<string, unknown>;
    }>;
    const found = gists.find((g) => g.files && SYNC_FILENAME in g.files);
    if (!found) {
      throw new Error("لم يتم العثور على نسخة مزامنة سابقة في حسابك. اضغط «رفع النسخة الحالية» أولاً.");
    }
    targetGistId = found.id;
  }

  const res = await fetch(`https://api.github.com/gists/${encodeURIComponent(targetGistId)}`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`فشل سحب المزامنة من GitHub Gist (${res.status})`);
  }

  const data = (await res.json()) as {
    id: string;
    files?: Record<string, { content?: string; raw_url?: string; truncated?: boolean }>;
  };

  const file = data.files?.[SYNC_FILENAME];
  if (!file) {
    throw new Error(`الملف ${SYNC_FILENAME} غير موجود داخل هذا الـ Gist`);
  }

  let content = file.content || "";
  if (file.truncated && file.raw_url) {
    const rawRes = await fetch(file.raw_url);
    content = await rawRes.text();
  }

  const parsed = parseAndValidateSnapshot(JSON.parse(content));
  return { snapshot: parsed, gistId: data.id };
}

/**
 * Supabase Cloud Sync via PostgREST (/rest/v1/dashboard_sync_snapshots)
 */
export async function pushToSupabase(
  supabaseUrl: string,
  anonKey: string,
  syncKey: string,
  snapshot: MhmedSyncSnapshot
): Promise<{ updatedAt: number }> {
  const base = supabaseUrl.trim().replace(/\/+$/, "");
  const key = anonKey.trim();
  const wsKey = syncKey.trim();
  if (!base || !key || !wsKey) {
    throw new Error("أكمل رابط Supabase والمفتاح العام ومعرّف مساحة المزامنة");
  }

  const res = await fetch(
    `${base}/rest/v1/dashboard_sync_snapshots?on_conflict=sync_key`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        sync_key: wsKey,
        app_name: snapshot.appName,
        payload: snapshot,
        updated_at: new Date(snapshot.updatedAt).toISOString(),
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `فشل الرفع إلى Supabase (${res.status}) — تأكد من تنفيذ جدول dashboard_sync_snapshots من ملف schema.sql. ${errText.slice(0, 120)}`
    );
  }

  return { updatedAt: snapshot.updatedAt };
}

export async function pullFromSupabase(
  supabaseUrl: string,
  anonKey: string,
  syncKey: string
): Promise<MhmedSyncSnapshot> {
  const base = supabaseUrl.trim().replace(/\/+$/, "");
  const key = anonKey.trim();
  const wsKey = syncKey.trim();
  if (!base || !key || !wsKey) {
    throw new Error("أكمل بيانات Supabase ومعرّف مساحة المزامنة أولاً");
  }

  const res = await fetch(
    `${base}/rest/v1/dashboard_sync_snapshots?sync_key=eq.${encodeURIComponent(wsKey)}&select=payload,updated_at&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`فشل السحب من Supabase (${res.status})`);
  }

  const rows = (await res.json()) as Array<{ payload?: unknown }>;
  if (!rows.length || !rows[0].payload) {
    throw new Error("لا توجد نسخة محفوظة بهذا المعرّف في Supabase بعد.");
  }

  return parseAndValidateSnapshot(rows[0].payload);
}

/**
 * Portable Sync Code (UTF-8 safe Base64) & JSON Export
 */
export function encodePortableSyncCode(snapshot: MhmedSyncSnapshot): string {
  const json = JSON.stringify(snapshot);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return "MHMED-SYNC:" + btoa(binary);
}

export function decodePortableSyncCode(code: string): MhmedSyncSnapshot {
  const cleaned = code.trim().replace(/^MHMED-SYNC:/, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const json = new TextDecoder().decode(bytes);
  return parseAndValidateSnapshot(JSON.parse(json));
}

export function downloadSnapshotJson(snapshot: MhmedSyncSnapshot): void {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${(snapshot.appName || "mhmed").toLowerCase().replace(/\s+/g, "-")}-backup-${dateStr}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

export const SUPABASE_SYNC_SQL = `-- جدول مزامنة لوحة تحكم Mhmed السحابية
create table if not exists public.dashboard_sync_snapshots (
  sync_key text primary key,
  app_name text not null default 'Mhmed',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.dashboard_sync_snapshots enable row level security;

-- سياسة وصول عبر معرّف المزامنة الشخصي (استخدم معرّفًا سريًا طويلًا)
drop policy if exists "mhmed_sync_rw" on public.dashboard_sync_snapshots;
create policy "mhmed_sync_rw"
  on public.dashboard_sync_snapshots
  for all
  to anon, authenticated
  using (length(sync_key) >= 8)
  with check (length(sync_key) >= 8);`;
