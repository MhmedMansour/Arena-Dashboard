import { useRef, useState } from "react";
import { Download, Eye, FileText, Trash2, Upload } from "lucide-react";
import { LibraryFileItem } from "../types/mhmed";
import { formatFileSize } from "../services/archiveStorage";

export interface CvProjectFileActions {
  files: LibraryFileItem[];
  onUploadProjectFiles: (projectId: string, files: File[]) => Promise<void>;
  onPreviewProjectFile: (file: LibraryFileItem) => void;
  onDownloadProjectFile: (file: LibraryFileItem) => void;
  onDeleteProjectFile: (file: LibraryFileItem) => Promise<void>;
}

export default function CvProjectFiles({
  projectId, projectName, files, onUploadProjectFiles,
  onPreviewProjectFile, onDownloadProjectFile, onDeleteProjectFile,
}: CvProjectFileActions & { projectId: string; projectName: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const projectFiles = files.filter((file) => file.cvProjectId === projectId);

  return (
    <div className="mh-cv-project-files">
      <div className="mh-flex-between">
        <b>ملفات المشروع ({projectFiles.length})</b>
        <button type="button" className="sa-btn-subtle" disabled={busy}
          onClick={() => input.current?.click()} aria-label={`رفع ملفات مشروع ${projectName}`}>
          <Upload size={14} /> {busy ? "جارٍ الحفظ…" : "إضافة ملفات"}
        </button>
      </div>
      <input ref={input} type="file" multiple hidden disabled={busy}
        aria-label={`اختيار ملفات ${projectName}`}
        onChange={async (e) => {
          const uploads = Array.from(e.currentTarget.files || []);
          e.currentTarget.value = "";
          if (!uploads.length) return;
          setBusy(true);
          setError("");
          try { await onUploadProjectFiles(projectId, uploads); }
          catch { setError("تعذر حفظ الملفات، حاول مجدداً وتحقق من مساحة المتصفح."); }
          finally { setBusy(false); }
        }} />
      {projectFiles.length === 0 && <p className="mh-project-files-hint">أضف مخططات المشروع، الصور، التقارير أو أي ملفات خاصة به.</p>}
      <ul className="mh-project-file-list">
        {projectFiles.map((file) => (
          <li key={file.id}>
            <FileText size={16} className="sa-copper-icon" />
            <div className="mh-project-file-name">
              <b title={file.name} dir="auto">{file.name}</b>
              <small>{formatFileSize(file.size)}</small>
            </div>
            <div className="mh-btn-row">
              <button type="button" className="sa-btn-subtle" aria-label={`معاينة ${file.name}`} title="معاينة" onClick={() => onPreviewProjectFile(file)}><Eye size={14} /></button>
              <button type="button" className="sa-btn-subtle" aria-label={`تنزيل ${file.name}`} title="تنزيل" onClick={() => onDownloadProjectFile(file)}><Download size={14} /></button>
              <button type="button" className="sa-btn-subtle" disabled={busy} aria-label={`حذف ${file.name}`} title="حذف" onClick={async () => {
                if (!window.confirm(`حذف الملف «${file.name}» من المشروع والمكتبة؟`)) return;
                setBusy(true);
                try { await onDeleteProjectFile(file); }
                catch { setError("تعذر حذف الملف. حاول مجدداً."); }
                finally { setBusy(false); }
              }}><Trash2 size={14} /></button>
            </div>
          </li>
        ))}
      </ul>
      <small className="mh-project-files-hint">الملفات محفوظة في هذا المتصفح؛ المزامنة تنقل بياناتها فقط، وليس محتواها. احتفظ بنسخة أصلية.</small>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
