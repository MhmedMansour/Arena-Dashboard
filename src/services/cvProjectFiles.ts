export interface CvProjectFile {
  id: string;
  cvProjectId: string;
  name: string;
  size: number;
  mimeType: string;
  addedAt: number;
}
interface CvProjectFileRecord extends CvProjectFile { blob: Blob }
const DB_NAME = "mhmed-cv-project-files";
const STORE = "files";
let connection: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("by_cvProjectId", "cvProjectId", { unique: false });
    };
    request.onerror = () => { connection = null; reject(request.error); };
    request.onblocked = () => { connection = null; reject(new Error("أغلق تبويبات اللوحة الأخرى ثم أعد المحاولة")); };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = null; };
      resolve(db);
    };
  });
  return connection;
}

function metadata(record: CvProjectFileRecord): CvProjectFile {
  const { blob: _blob, ...info } = record;
  return info;
}

export async function listCvProjectFiles(cvProjectId: string): Promise<CvProjectFile[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const result: CvProjectFile[] = [];
    // Cursor returns metadata per project without loading unrelated project blobs.
    const request = tx.objectStore(STORE).index("by_cvProjectId").openCursor(IDBKeyRange.only(cvProjectId));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) { result.push(metadata(cursor.value)); cursor.continue(); }
    };
    tx.oncomplete = () => resolve(result.sort((a, b) => b.addedAt - a.addedAt));
    tx.onabort = () => reject(tx.error || new Error("تعذر قراءة الملفات"));
    tx.onerror = () => reject(tx.error || new Error("تعذر قراءة الملفات"));
  });
}

/** A batch is atomic: either every selected file is saved, or none is. */
export async function addCvProjectFiles(cvProjectId: string, files: File[]): Promise<CvProjectFile[]> {
  if (!cvProjectId.trim()) throw new Error("المشروع غير محدد");
  if (!files.length) return [];
  const db = await openDatabase();
  const records: CvProjectFileRecord[] = files.map((file) => ({
    id: crypto.randomUUID(), cvProjectId, name: file.name, size: file.size,
    mimeType: file.type || "application/octet-stream", addedAt: Date.now(), blob: file,
  }));
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve(records.map(metadata));
    tx.onabort = () => reject(tx.error || new Error("تعذر حفظ الملفات"));
    tx.onerror = () => reject(tx.error || new Error("تعذر حفظ الملفات"));
    for (const record of records) tx.objectStore(STORE).add(record);
  });
}

async function readFileRecord(id: string): Promise<CvProjectFileRecord | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(id);
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCvProjectFileBlob(cvProjectId: string, id: string): Promise<Blob | null> {
  const record = await readFileRecord(id);
  return record?.cvProjectId === cvProjectId ? record.blob : null;
}

export async function deleteCvProjectFile(cvProjectId: string, id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const request = store.get(id);
    request.onsuccess = () => {
      const record = request.result as CvProjectFileRecord | undefined;
      if (record?.cvProjectId === cvProjectId) store.delete(id);
    };
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error("تعذر حذف الملف"));
    tx.onerror = () => reject(tx.error || new Error("تعذر حذف الملف"));
  });
}
