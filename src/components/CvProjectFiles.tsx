import { useEffect, useRef, useState } from "react";
import { Paperclip, Upload, Download, Trash2, FileText, ChevronDown, ChevronUp, X } from "lucide-react";
import { addCvProjectFiles, CvProjectFile, deleteCvProjectFile, getCvProjectFileBlob, listCvProjectFiles } from "../services/cvProjectFiles";

function formatSize(size: number) {
  const unit = size >= 1024 * 1024 ? "ميجابايت" : "كيلوبايت";
  return `${new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 1 }).format(size / (size >= 1024 * 1024 ? 1024 * 1024 : 1024))} ${unit}`;
}

export default function CvProjectFiles({ projectId, projectName, onNotify }: {
  projectId: string; projectName: string; onNotify: (message: string) => void;
}) {
  const [files, setFiles] = useState<CvProjectFile[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    let cancelled = false;
    setLoading(true);
    listCvProjectFiles(projectId).then((items) => {
      if (!cancelled) { setFiles(items); setError(""); }
    }).catch(() => { if (!cancelled) setError("تعذر تحميل ملفات المشروع. تحقق من السماح بالتخزين المحلي."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; active.current = false; };
  }, [projectId]);

  async function upload(selected: File[]) {
    if (!selected.length || busy) return;
    setBusy(true); setError(""); setOpen(true);
    try {
      const added = await addCvProjectFiles(projectId, selected);
      if (active.current) setFiles((current) => [...added, ...current]);
      onNotify(`تم حفظ ${selected.length.toLocaleString("ar-SA")} ملف في مشروع «${projectName}» على هذا الجهاز`);
    } catch {
      if (active.current) setError("تعذر حفظ الملفات. تحقق من مساحة تخزين المتصفح ثم أعد المحاولة؛ لم تُحفظ الدفعة الجديدة.");
    } finally {
      if (active.current) setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  async function download(file: CvProjectFile) {
    setBusy(true); setError("");
    try {
      const blob = await getCvProjectFileBlob(projectId, file.id);
      if (!blob) throw new Error("missing");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = file.name; document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch { if (active.current) setError("تعذر تنزيل الملف من هذا المتصفح."); }
    finally { if (active.current) setBusy(false); }
  }
  async function remove(file: CvProjectFile) {
    setBusy(true); setError("");
    try {
      await deleteCvProjectFile(projectId, file.id);
      if (active.current) { setFiles((current) => current.filter((item) => item.id !== file.id)); setDeleting(null); }
      onNotify("تم حذف المرفق من هذا المشروع فقط");
    } catch { if (active.current) setError("تعذر حذف الملف. حاول مرة أخرى."); }
    finally { if (active.current) setBusy(false); }
  }
  return <section className="mh-cv-project-files" aria-label={`ملفات مشروع ${projectName}`}>
    <div className="mh-project-files-toolbar">
      <button type="button" className="mh-project-files-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Paperclip size={15} /><span>ملفات المشروع <b>({loading ? "…" : files.length.toLocaleString("ar-SA")})</b></span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      <button type="button" className="sa-btn-subtle" disabled={busy || loading} onClick={() => input.current?.click()}>
        <Upload size={14} /> {busy ? "جارٍ التنفيذ…" : "إضافة ملفات"}
      </button>
      <input ref={input} type="file" multiple hidden aria-label={`إضافة ملفات لمشروع ${projectName}`} disabled={busy || loading}
        onChange={(event) => void upload(Array.from(event.target.files || []))} />
    </div>
    {error && <p className="mh-project-file-error" role="alert">{error}</p>}
    {open && <>
      <p className="mh-project-files-note">ملفات هذا المشروع فقط · محفوظة محليًا في هذا المتصفح، ولا تشملها المزامنة أو نسخة السيرة JSON. احتفظ بنسخة أصلية لديك.</p>
      {!loading && !files.length && <div className="mh-project-files-empty"><Paperclip size={20} /><p>أضف مخططات المشروع أو الصور أو المستندات الخاصة به.</p></div>}
      <ul className="mh-project-file-list">
        {files.map((file) => <li key={file.id}>
          <div className="mh-project-file-row"><FileText size={18} />
            <div className="mh-project-file-info"><b dir="auto">{file.name}</b><small>{formatSize(file.size)}</small></div>
            <button type="button" disabled={busy} aria-label={`تنزيل ${file.name}`} title="تنزيل" onClick={() => void download(file)}><Download size={16} /></button>
            <button type="button" disabled={busy} aria-label={`حذف ${file.name}`} title="حذف" onClick={() => setDeleting(deleting === file.id ? null : file.id)}><Trash2 size={16} /></button>
          </div>
          {deleting === file.id && <div className="mh-project-file-confirm" role="group" aria-label={`تأكيد حذف ${file.name}`}>
            <span>حذف هذا المرفق من المشروع؟</span>
            <button type="button" disabled={busy} onClick={() => void remove(file)}>تأكيد الحذف</button>
            <button type="button" disabled={busy} onClick={() => setDeleting(null)}><X size={12} /> إلغاء</button>
          </div>}
        </li>)}
      </ul>
    </>}
  </section>;
}
