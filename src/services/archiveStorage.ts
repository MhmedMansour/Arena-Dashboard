import {
  ArchiveFileMetadata,
  ArchiveFileRecord,
  ArchiveFolder,
  ArchiveStorageAdapter,
  StorageStats,
} from "../types/smartArchive";

const DB_NAME = "mimar-smart-archive";
const DB_VERSION = 1;
const STORE_FILES = "archive_files";
const STORE_FOLDERS = "archive_folders";

export const DEFAULT_ARCHIVE_SECTIONS: string[] = [
  "المخططات الهندسية (CAD)",
  "نماذج معلومات البناء (BIM)",
  "التنسيق والفحص (Navisworks & DWF)",
  "المستندات والتقارير الفنية",
  "الجداول وحساب الكميات (BOQ)",
  "العروض والاعتمادات",
  "الصور والتوثيق الميداني",
];

export const DEFAULT_ARCHIVE_FOLDERS: ArchiveFolder[] = [
  {
    id: "fld-arch-drawings",
    name: "المخططات التنفيذية (Shop Drawings)",
    section: "المخططات الهندسية (CAD)",
    createdAt: 1700000000000,
    isSystem: true,
  },
  {
    id: "fld-as-built",
    name: "مخططات مطابق للواقع (As-Built)",
    section: "المخططات الهندسية (CAD)",
    createdAt: 1700000001000,
    isSystem: true,
  },
  {
    id: "fld-bim-models",
    name: "نماذج Revit و IFC المركزية",
    section: "نماذج معلومات البناء (BIM)",
    createdAt: 1700000002000,
    isSystem: true,
  },
  {
    id: "fld-clash-coord",
    name: "ملفات التنسيق وكشف التعارضات",
    section: "التنسيق والفحص (Navisworks & DWF)",
    createdAt: 1700000003000,
    isSystem: true,
  },
  {
    id: "fld-specs-contracts",
    name: "المواصفات والعقود والمحاضر",
    section: "المستندات والتقارير الفنية",
    createdAt: 1700000004000,
    isSystem: true,
  },
  {
    id: "fld-boq-schedules",
    name: "حصر الكميات والجداول الزمنية",
    section: "الجداول وحساب الكميات (BOQ)",
    createdAt: 1700000005000,
    isSystem: true,
  },
  {
    id: "fld-site-photos",
    name: "صور الموقع والتقارير المصورة",
    section: "الصور والتوثيق الميداني",
    createdAt: 1700000006000,
    isSystem: true,
  },
];

let dbPromise: Promise<IDBDatabase> | null = null;

function openArchiveDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        const fileStore = db.createObjectStore(STORE_FILES, { keyPath: "id" });
        fileStore.createIndex("by_addedAt", "addedAt", { unique: false });
        fileStore.createIndex("by_folderId", "folderId", { unique: false });
        fileStore.createIndex("by_projectId", "projectId", { unique: false });
        fileStore.createIndex("by_section", "section", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
        db.createObjectStore(STORE_FOLDERS, { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function stripBlob(record: ArchiveFileRecord): ArchiveFileMetadata {
  const { blob: _blob, ...meta } = record;
  return meta;
}

/**
 * IndexedDB implementation of ArchiveStorageAdapter.
 * Stores binary Blobs strictly in IndexedDB without altering original engineering files.
 * Never writes file contents to localStorage.
 */
export class IndexedDbArchiveStorage implements ArchiveStorageAdapter {
  readonly driverId = "indexeddb" as const;
  readonly isCloudSynced = false;

  async listMetadata(): Promise<ArchiveFileMetadata[]> {
    const db = await openArchiveDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, "readonly");
      const store = tx.objectStore(STORE_FILES);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = (req.result as ArchiveFileRecord[]) || [];
        const metas = records
          .map(stripBlob)
          .sort((a, b) => b.addedAt - a.addedAt);
        resolve(metas);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getFileBlob(id: string): Promise<Blob | null> {
    const db = await openArchiveDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, "readonly");
      const req = tx.objectStore(STORE_FILES).get(id);
      req.onsuccess = () => {
        const record = req.result as ArchiveFileRecord | undefined;
        resolve(record?.blob ?? null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveFile(record: ArchiveFileRecord): Promise<void> {
    const db = await openArchiveDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, "readwrite");
      // Preserve exact original File/Blob bytes without transcoding or mutation
      tx.objectStore(STORE_FILES).put({
        ...record,
        isOriginalPreserved: true,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async updateMetadata(
    id: string,
    patch: Partial<Omit<ArchiveFileMetadata, "id">>
  ): Promise<ArchiveFileMetadata | null> {
    const db = await openArchiveDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, "readwrite");
      const store = tx.objectStore(STORE_FILES);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result as ArchiveFileRecord | undefined;
        if (!existing) {
          resolve(null);
          return;
        }
        // Keep original binary blob completely untouched
        const updated: ArchiveFileRecord = {
          ...existing,
          ...patch,
          id: existing.id,
          blob: existing.blob,
          isOriginalPreserved: true,
        };
        store.put(updated);
        tx.oncomplete = () => resolve(stripBlob(updated));
      };
      getReq.onerror = () => reject(getReq.error);
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteFile(id: string): Promise<void> {
    const db = await openArchiveDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, "readwrite");
      const store = tx.objectStore(STORE_FILES);

      // Remove deleted id from relatedFileIds of any linked records
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const records = (allReq.result as ArchiveFileRecord[]) || [];
        for (const rec of records) {
          if (rec.id !== id && rec.relatedFileIds?.includes(id)) {
            store.put({
              ...rec,
              relatedFileIds: rec.relatedFileIds.filter((rid) => rid !== id),
            });
          }
        }
        store.delete(id);
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async linkFilesBidirectional(idA: string, idB: string): Promise<void> {
    if (idA === idB) return;
    const db = await openArchiveDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, "readwrite");
      const store = tx.objectStore(STORE_FILES);
      const reqA = store.get(idA);
      const reqB = store.get(idB);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);

      reqA.onsuccess = () => {
        reqB.onsuccess = () => {
          const recA = reqA.result as ArchiveFileRecord | undefined;
          const recB = reqB.result as ArchiveFileRecord | undefined;
          if (!recA || !recB) return;
          if (!recA.relatedFileIds.includes(idB)) {
            store.put({
              ...recA,
              relatedFileIds: [...recA.relatedFileIds, idB],
            });
          }
          if (!recB.relatedFileIds.includes(idA)) {
            store.put({
              ...recB,
              relatedFileIds: [...recB.relatedFileIds, idA],
            });
          }
        };
      };
    });
  }

  async unlinkFilesBidirectional(idA: string, idB: string): Promise<void> {
    const db = await openArchiveDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, "readwrite");
      const store = tx.objectStore(STORE_FILES);
      const reqA = store.get(idA);
      const reqB = store.get(idB);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);

      reqA.onsuccess = () => {
        reqB.onsuccess = () => {
          const recA = reqA.result as ArchiveFileRecord | undefined;
          const recB = reqB.result as ArchiveFileRecord | undefined;
          if (recA) {
            store.put({
              ...recA,
              relatedFileIds: recA.relatedFileIds.filter((r) => r !== idB),
            });
          }
          if (recB) {
            store.put({
              ...recB,
              relatedFileIds: recB.relatedFileIds.filter((r) => r !== idA),
            });
          }
        };
      };
    });
  }

  async listFolders(): Promise<ArchiveFolder[]> {
    const db = await openArchiveDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FOLDERS, "readwrite");
      const store = tx.objectStore(STORE_FOLDERS);
      const req = store.getAll();
      req.onsuccess = () => {
        const existing = (req.result as ArchiveFolder[]) || [];
        let alreadySeeded = false;
        try {
          alreadySeeded = localStorage.getItem("mimar-archive-folders-seeded") === "1";
        } catch {
          alreadySeeded = false;
        }
        if (existing.length === 0 && !alreadySeeded) {
          for (const folder of DEFAULT_ARCHIVE_FOLDERS) {
            store.put(folder);
          }
          try {
            localStorage.setItem("mimar-archive-folders-seeded", "1");
          } catch {
            // ignore
          }
          resolve([...DEFAULT_ARCHIVE_FOLDERS]);
        } else {
          if (existing.length > 0 && !alreadySeeded) {
            try {
              localStorage.setItem("mimar-archive-folders-seeded", "1");
            } catch {
              // ignore
            }
          }
          resolve(existing.sort((a, b) => a.createdAt - b.createdAt));
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async restoreDefaultFolders(): Promise<void> {
    const db = await openArchiveDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FOLDERS, "readwrite");
      const store = tx.objectStore(STORE_FOLDERS);
      for (const folder of DEFAULT_ARCHIVE_FOLDERS) {
        store.put(folder);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async saveFolder(folder: ArchiveFolder): Promise<void> {
    const db = await openArchiveDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FOLDERS, "readwrite");
      tx.objectStore(STORE_FOLDERS).put(folder);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteFolder(folderId: string): Promise<void> {
    const db = await openArchiveDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_FOLDERS, STORE_FILES], "readwrite");
      tx.objectStore(STORE_FOLDERS).delete(folderId);

      // Reassign any files in this folder to default unassigned ("")
      const fileStore = tx.objectStore(STORE_FILES);
      const allReq = fileStore.getAll();
      allReq.onsuccess = () => {
        const records = (allReq.result as ArchiveFileRecord[]) || [];
        for (const rec of records) {
          if (rec.folderId === folderId) {
            fileStore.put({ ...rec, folderId: "" });
          }
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getStats(): Promise<StorageStats> {
    const metas = await this.listMetadata();
    const totalBytes = metas.reduce((acc, m) => acc + (m.size || 0), 0);

    let quotaBytes: number | undefined;
    let usageBytes: number | undefined;
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        quotaBytes = est.quota;
        usageBytes = est.usage;
      } catch {
        // StorageManager API optional
      }
    }

    return {
      totalFiles: metas.length,
      totalBytes,
      quotaBytes,
      usageBytes,
      driverName: "IndexedDB (تخزين المتصفح المحلي)",
      isCloudSynced: false,
    };
  }
}

/**
 * Cloud Storage Adapter Skeleton (ready to connect to S3 / Supabase / Azure Blob / GCS via Backend API).
 * Keeps UI decoupled from the underlying storage engine.
 */
export interface CloudSyncEndpointConfig {
  apiBaseUrl: string;
  bucketLabel?: string;
}

export const archiveStorage = new IndexedDbArchiveStorage();

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const val = bytes / Math.pow(1024, i);
  return `${val >= 10 || i === 0 ? val.toFixed(0) : val.toFixed(1)} ${units[i]}`;
}
