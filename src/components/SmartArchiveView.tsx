import { useState, useEffect, useRef, useMemo } from "react";
import {
  Upload,
  Search,
  FolderPlus,
  Folder,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Layers,
  Box,
  Compass,
  Eye,
  Download,
  Trash2,
  Edit3,
  FolderInput,
  Link2,
  Unlink,
  Check,
  X,
  HardDrive,
  AlertTriangle,
  Sparkles,
  Settings2,
  ShieldCheck,
  Filter,
  Calendar,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Info,
} from "lucide-react";
import {
  AiBackendConfig,
  ArchiveFileGroup,
  ArchiveFileMetadata,
  ArchiveFolder,
  EngineeringDiscipline,
  ExternalCadViewerConfig,
  StagedUploadItem,
  StorageStats,
} from "../types/smartArchive";
import {
  archiveStorage,
  DEFAULT_ARCHIVE_SECTIONS,
  formatFileSize,
} from "../services/archiveStorage";
import {
  ACCEPT_FILE_EXTENSIONS,
  ALL_DISCIPLINES,
  classifyFileSmart,
  ExistingProjectRef,
} from "../services/smartClassifier";
import {
  loadAiBackendConfig,
  loadExternalViewerConfig,
  requestBackendAiClassification,
  saveAiBackendConfig,
  saveExternalViewerConfig,
} from "../services/archiveAiService";
import {
  DxfPreviewData,
  IfcHeaderInspection,
  inspectIfcStepMetadata,
  parseAsciiDxfPreview,
} from "../utils/dxfPreview";

interface SmartArchiveViewProps {
  projects: ExistingProjectRef[];
  onNotify: (msg: string) => void;
  onArchiveCountChange?: (count: number) => void;
}

type DateFilterPreset = "all" | "today" | "7days" | "30days" | "custom";

const GROUP_LABELS: Record<ArchiveFileGroup | "all", string> = {
  all: "كل الأنواع",
  cad: "مخططات CAD (DWG/DXF/DWT/DWS)",
  bim: "نماذج BIM (RVT/RFA/RTE/IFC)",
  navisworks: "تنسيق ومراجعة (NWC/NWD/DWF)",
  office: "مستندات وجداول (PDF/Office)",
  image: "صور ورسوم (JPG/PNG/TIFF/SVG)",
  other: "أخرى",
};

export default function SmartArchiveView({
  projects,
  onNotify,
  onArchiveCountChange,
}: SmartArchiveViewProps) {
  const [files, setFiles] = useState<ArchiveFileMetadata[]>([]);
  const [folders, setFolders] = useState<ArchiveFolder[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Navigation & Filters
  const [activeSection, setActiveSection] = useState<string>("all");
  const [activeFolderId, setActiveFolderId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [groupFilter, setGroupFilter] = useState<ArchiveFileGroup | "all">("all");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);

  // Staging queue for smart classification before approval
  const [stagedItems, setStagedItems] = useState<StagedUploadItem[]>([]);
  const [stagingBusy, setStagingBusy] = useState(false);
  const [aiRequestingId, setAiRequestingId] = useState<string>("");

  // Active modals / drawers
  const [selectedFile, setSelectedFile] = useState<ArchiveFileMetadata | null>(null);
  const [previewFile, setPreviewFile] = useState<ArchiveFileMetadata | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [dxfPreview, setDxfPreview] = useState<DxfPreviewData | null>(null);
  const [ifcInspection, setIfcInspection] = useState<IfcHeaderInspection | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Folder creation modal
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderSection, setNewFolderSection] = useState(DEFAULT_ARCHIVE_SECTIONS[0]);
  const [customSectionInput, setCustomSectionInput] = useState("");

  // Rename / Move / Edit metadata state inside Details modal
  const [editMode, setEditMode] = useState<"none" | "rename" | "move" | "edit" | "link">("none");
  const [renameValue, setRenameValue] = useState("");
  const [moveFolderId, setMoveFolderId] = useState("");
  const [moveSection, setMoveSection] = useState("");
  const [linkTargetId, setLinkTargetId] = useState("");

  // Edit classification fields for existing file
  const [editCategory, setEditCategory] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editProjectName, setEditProjectName] = useState("");
  const [editDiscipline, setEditDiscipline] = useState<EngineeringDiscipline>("عام / متعدد التخصصات");
  const [editDocDate, setEditDocDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // AI & Viewer Integration Settings Modal
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [aiConfig, setAiConfig] = useState<AiBackendConfig>(() => loadAiBackendConfig());
  const [viewerConfig, setViewerConfig] = useState<ExternalCadViewerConfig>(() =>
    loadExternalViewerConfig()
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refreshArchive() {
    try {
      const [loadedFolders, loadedFiles, loadedStats] = await Promise.all([
        archiveStorage.listFolders(),
        archiveStorage.listMetadata(),
        archiveStorage.getStats(),
      ]);
      setFolders(loadedFolders);
      setFiles(loadedFiles);
      setStats(loadedStats);
      onArchiveCountChange?.(loadedFiles.length);
    } catch {
      onNotify("تعذر قراءة بيانات الأرشيف الذكي من التخزين المحلي IndexedDB");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshArchive();
  }, []);

  // Cleanup Blob object URL when preview closes
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const allSections = useMemo(() => {
    const set = new Set<string>(DEFAULT_ARCHIVE_SECTIONS);
    for (const f of folders) {
      if (f.section) set.add(f.section);
    }
    for (const file of files) {
      if (file.section) set.add(file.section);
    }
    return Array.from(set);
  }, [folders, files]);

  // Stage selected files for Smart Classification review before saving
  async function handleStageFiles(fileList: FileList | File[]) {
    const arr = Array.from(fileList);
    if (!arr.length) return;
    setStagingBusy(true);
    try {
      const currentFolders = folders.length ? folders : await archiveStorage.listFolders();
      const built: StagedUploadItem[] = [];

      for (const file of arr) {
        const suggestion = await classifyFileSmart(file, projects, currentFolders);
        const matchedProj = projects.find((p) => p.id === suggestion.detectedProjectId);

        built.push({
          tempId: crypto.randomUUID(),
          file,
          customName: file.name,
          suggestion,
          section: suggestion.suggestedSection,
          category: suggestion.suggestedCategory,
          folderId: suggestion.suggestedFolderId,
          projectId: suggestion.detectedProjectId,
          projectName: matchedProj ? matchedProj.name : suggestion.detectedProjectName,
          discipline: suggestion.detectedDiscipline,
          documentDate: suggestion.detectedDocumentDate,
          drawingCode: suggestion.detectedDrawingCode || "",
          revision: suggestion.detectedRevision || "",
          tagsInput: suggestion.extractedTags.join(", "),
          notes: "",
          relatedFileIds: [],
        });
      }

      setStagedItems((prev) => [...built, ...prev]);
    } catch {
      onNotify("حدث خطأ أثناء تجهيز التصنيف المبدئي للملفات");
    } finally {
      setStagingBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function updateStagedItem(tempId: string, patch: Partial<StagedUploadItem>) {
    setStagedItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, ...patch } : item))
    );
  }

  async function handleTriggerBackendAiForStaged(item: StagedUploadItem) {
    setAiRequestingId(item.tempId);
    try {
      const res = await requestBackendAiClassification(item.file, aiConfig);
      if (!res.supported) {
        onNotify(res.message);
        return;
      }
      updateStagedItem(item.tempId, {
        section: res.suggestedSection || item.section,
        category: res.suggestedCategory || item.category,
        projectName: res.detectedProjectName || item.projectName,
        discipline: res.detectedDiscipline || item.discipline,
        documentDate: res.detectedDocumentDate || item.documentDate,
        tagsInput: res.extractedTags?.length
          ? Array.from(
              new Set([
                ...item.tagsInput
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
                ...res.extractedTags,
              ])
            ).join(", ")
          : item.tagsInput,
        notes: res.summary ? `${item.notes ? item.notes + " — " : ""}${res.summary}` : item.notes,
        suggestion: {
          ...item.suggestion,
          analysisMethod: "ai-backend",
          analysisNote: res.message,
          confidenceScore: res.confidence ?? item.suggestion.confidenceScore,
        },
      });
      onNotify("تم تحديث التصنيف المقترح عبر خدمة الذكاء الاصطناعي الخلفية");
    } finally {
      setAiRequestingId("");
    }
  }

  async function handleApproveStagedItems() {
    if (!stagedItems.length) return;
    setStagingBusy(true);
    try {
      for (const item of stagedItems) {
        // Ensure original extension stays intact if user edited display name
        const origExt = item.file.name.includes(".")
          ? "." + item.file.name.split(".").pop()!
          : "";
        let finalName = item.customName.trim() || item.file.name;
        if (origExt && !finalName.toLowerCase().endsWith(origExt.toLowerCase())) {
          finalName += origExt;
        }

        const newId = crypto.randomUUID();
        const tags = item.tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

        await archiveStorage.saveFile({
          id: newId,
          name: finalName,
          originalName: item.file.name,
          extension: item.suggestion.extension,
          mimeType: item.suggestion.mimeType,
          fileGroup: item.suggestion.fileGroup,
          fileTypeLabel: item.suggestion.fileTypeLabel,
          size: item.file.size,
          addedAt: Date.now(),
          lastModifiedAt: item.file.lastModified || Date.now(),
          documentDate: item.documentDate,
          section: item.section,
          category: item.category.trim() || item.suggestion.suggestedCategory,
          folderId: item.folderId,
          projectId: item.projectId,
          projectName: item.projectName.trim(),
          discipline: item.discipline,
          drawingCode: item.drawingCode.trim() || undefined,
          revision: item.revision.trim() || undefined,
          tags,
          notes: item.notes.trim(),
          relatedFileIds: item.relatedFileIds,
          storageDriver: "indexeddb",
          aiStatus:
            item.suggestion.analysisMethod === "ai-backend"
              ? "analyzed"
              : "not-configured",
          isOriginalPreserved: true,
          blob: item.file, // Stored unmodified in IndexedDB
        });

        for (const relId of item.relatedFileIds) {
          await archiveStorage.linkFilesBidirectional(newId, relId);
        }
      }

      const count = stagedItems.length;
      setStagedItems([]);
      await refreshArchive();
      onNotify(
        `تم اعتماد وحفظ ${count === 1 ? "ملف واحد" : `${count} ملفات`} بنسختها الأصلية في IndexedDB`
      );
    } catch {
      onNotify("تعذر حفظ الملفات في IndexedDB. تحقق من المساحة المتاحة في المتصفح.");
    } finally {
      setStagingBusy(false);
    }
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    const targetSection =
      newFolderSection === "__custom__"
        ? customSectionInput.trim()
        : newFolderSection;
    if (!newFolderName.trim() || !targetSection) return;

    const folder: ArchiveFolder = {
      id: "fld-" + crypto.randomUUID().slice(0, 8),
      name: newFolderName.trim(),
      section: targetSection,
      createdAt: Date.now(),
      isSystem: false,
    };
    await archiveStorage.saveFolder(folder);
    setNewFolderName("");
    setCustomSectionInput("");
    setShowFolderModal(false);
    await refreshArchive();
    setActiveFolderId(folder.id);
    onNotify(`تم إنشاء المجلد "${folder.name}"`);
  }

  async function handleDeleteFolder(folder: ArchiveFolder) {
    if (folder.isSystem) return;
    await archiveStorage.deleteFolder(folder.id);
    if (activeFolderId === folder.id) setActiveFolderId("all");
    await refreshArchive();
    onNotify(`تم حذف المجلد "${folder.name}" مع الاحتفاظ بملفاته في الأرشيف العام`);
  }

  async function handleDownloadOriginal(meta: ArchiveFileMetadata) {
    try {
      const blob = await archiveStorage.getFileBlob(meta.id);
      if (!blob) {
        onNotify("لم يتم العثور على محتوى الملف في التخزين المحلي");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = meta.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      onNotify("تعذر استخراج الملف للتنزيل");
    }
  }

  async function handleOpenPreview(meta: ArchiveFileMetadata) {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
    setDxfPreview(null);
    setIfcInspection(null);
    setPreviewZoom(1);
    setPreviewFile(meta);
    setPreviewLoading(true);

    try {
      const blob = await archiveStorage.getFileBlob(meta.id);
      if (!blob) {
        onNotify("محتوى الملف غير متوفر في المتصفح الحالي");
        setPreviewLoading(false);
        return;
      }

      const ext = meta.extension.toUpperCase();
      if (
        ext === "PDF" ||
        ext === "JPG" ||
        ext === "PNG" ||
        ext === "SVG" ||
        ext === "TIFF"
      ) {
        const mimeMap: Record<string, string> = {
          PDF: "application/pdf",
          JPG: "image/jpeg",
          PNG: "image/png",
          SVG: "image/svg+xml",
          TIFF: "image/tiff",
        };
        const typedBlob =
          blob.type && blob.type !== "application/octet-stream"
            ? blob
            : new Blob([blob], { type: mimeMap[ext] || blob.type });
        setPreviewUrl(URL.createObjectURL(typedBlob));
      } else if (ext === "DXF") {
        const parsed = await parseAsciiDxfPreview(blob);
        setDxfPreview(parsed);
      } else if (ext === "IFC") {
        const info = await inspectIfcStepMetadata(blob);
        setIfcInspection(info);
      }
    } catch {
      onNotify("تعذر تجهيز معاينة الملف");
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setPreviewFile(null);
    setDxfPreview(null);
    setIfcInspection(null);
  }

  function openFileDetails(meta: ArchiveFileMetadata) {
    setSelectedFile(meta);
    setEditMode("none");
    setRenameValue(meta.name);
    setMoveFolderId(meta.folderId);
    setMoveSection(meta.section);
    setEditCategory(meta.category);
    setEditProjectId(meta.projectId);
    setEditProjectName(meta.projectName);
    setEditDiscipline(meta.discipline);
    setEditDocDate(meta.documentDate);
    setEditNotes(meta.notes);
    setLinkTargetId("");
  }

  async function handleSaveRename() {
    if (!selectedFile || !renameValue.trim()) return;
    const origExt = "." + selectedFile.extension.toLowerCase();
    let cleanName = renameValue.trim();
    if (!cleanName.toLowerCase().endsWith(origExt)) {
      cleanName += origExt;
    }
    const updated = await archiveStorage.updateMetadata(selectedFile.id, {
      name: cleanName,
    });
    if (updated) {
      setSelectedFile(updated);
      setEditMode("none");
      await refreshArchive();
      onNotify("تمت إعادة تسمية الملف مع الحفاظ على صيغته الأصلية");
    }
  }

  async function handleSaveMove() {
    if (!selectedFile) return;
    const targetFolder = folders.find((f) => f.id === moveFolderId);
    const updated = await archiveStorage.updateMetadata(selectedFile.id, {
      folderId: moveFolderId,
      section: targetFolder ? targetFolder.section : moveSection,
    });
    if (updated) {
      setSelectedFile(updated);
      setEditMode("none");
      await refreshArchive();
      onNotify("تم نقل الملف بنجاح");
    }
  }

  async function handleSaveClassificationEdit() {
    if (!selectedFile) return;
    const matchedProj = projects.find((p) => p.id === editProjectId);
    const updated = await archiveStorage.updateMetadata(selectedFile.id, {
      category: editCategory.trim() || selectedFile.category,
      projectId: editProjectId,
      projectName: matchedProj ? matchedProj.name : editProjectName.trim(),
      discipline: editDiscipline,
      documentDate: editDocDate || selectedFile.documentDate,
      notes: editNotes.trim(),
    });
    if (updated) {
      setSelectedFile(updated);
      setEditMode("none");
      await refreshArchive();
      onNotify("تم تحديث بيانات وتصنيف الملف");
    }
  }

  async function handleLinkRelatedFile() {
    if (!selectedFile || !linkTargetId) return;
    await archiveStorage.linkFilesBidirectional(selectedFile.id, linkTargetId);
    const refreshed = await archiveStorage.listMetadata();
    setFiles(refreshed);
    const current = refreshed.find((f) => f.id === selectedFile.id) || null;
    setSelectedFile(current);
    setLinkTargetId("");
    onNotify("تم ربط الملفين بعلاقة تبادلية");
  }

  async function handleUnlinkRelatedFile(otherId: string) {
    if (!selectedFile) return;
    await archiveStorage.unlinkFilesBidirectional(selectedFile.id, otherId);
    const refreshed = await archiveStorage.listMetadata();
    setFiles(refreshed);
    const current = refreshed.find((f) => f.id === selectedFile.id) || null;
    setSelectedFile(current);
    onNotify("تم فك ارتباط الملف");
  }

  async function handleDeleteArchiveFile(meta: ArchiveFileMetadata) {
    await archiveStorage.deleteFile(meta.id);
    if (selectedFile?.id === meta.id) setSelectedFile(null);
    if (previewFile?.id === meta.id) closePreview();
    await refreshArchive();
    onNotify(`تم حذف "${meta.name}" من الأرشيف المحلي`);
  }

  function handleSaveIntegrations(e: React.FormEvent) {
    e.preventDefault();
    saveAiBackendConfig(aiConfig);
    saveExternalViewerConfig(viewerConfig);
    setAiConfig(loadAiBackendConfig());
    setViewerConfig(loadExternalViewerConfig());
    setShowIntegrationModal(false);
    onNotify("تم حفظ إعدادات الربط المستقبلية بنجاح");
  }

  // Filtered files computation
  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return files.filter((f) => {
      if (activeSection !== "all" && f.section !== activeSection) return false;
      if (activeFolderId !== "all" && f.folderId !== activeFolderId) return false;
      if (groupFilter !== "all" && f.fileGroup !== groupFilter) return false;
      if (disciplineFilter !== "all" && f.discipline !== disciplineFilter)
        return false;

      if (datePreset === "today" && f.addedAt < startOfToday.getTime())
        return false;
      if (datePreset === "7days" && f.addedAt < now - 7 * 86400000)
        return false;
      if (datePreset === "30days" && f.addedAt < now - 30 * 86400000)
        return false;
      if (datePreset === "custom") {
        if (dateFrom) {
          const fromMs = new Date(dateFrom + "T00:00:00").getTime();
          if (f.addedAt < fromMs) return false;
        }
        if (dateTo) {
          const toMs = new Date(dateTo + "T23:59:59").getTime();
          if (f.addedAt > toMs) return false;
        }
      }

      if (q) {
        const projTitle =
          projects.find((p) => p.id === f.projectId)?.name || f.projectName || "";
        const haystack = [
          f.name,
          f.originalName,
          projTitle,
          f.discipline,
          f.category,
          f.section,
          f.extension,
          f.drawingCode || "",
          f.revision || "",
          ...f.tags,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [
    files,
    activeSection,
    activeFolderId,
    groupFilter,
    disciplineFilter,
    datePreset,
    dateFrom,
    dateTo,
    searchQuery,
    projects,
  ]);

  function renderGroupIcon(group: ArchiveFileGroup) {
    switch (group) {
      case "cad":
        return <Compass size={18} />;
      case "bim":
        return <Box size={18} />;
      case "navisworks":
        return <Layers size={18} />;
      case "image":
        return <ImageIcon size={18} />;
      case "office":
        return <FileSpreadsheet size={18} />;
      default:
        return <FileText size={18} />;
    }
  }

  const cadBimCount = files.filter(
    (f) => f.fileGroup === "cad" || f.fileGroup === "bim" || f.fileGroup === "navisworks"
  ).length;
  const docsMediaCount = files.filter(
    (f) => f.fileGroup === "office" || f.fileGroup === "image"
  ).length;
  const linkedCount = files.filter((f) => f.relatedFileIds.length > 0).length;

  return (
    <div className="sa-wrap">
      {/* Top Hero / Header Banner matching existing dashboard aesthetic */}
      <div className="heading" style={{ marginTop: 4 }}>
        <div>
          <small className="eyebrow">SMART ENGINEERING ARCHIVE</small>
          <h2>الأرشيف الذكي وإدارة الوثائق الهندسية</h2>
        </div>
        <div className="sa-top-actions">
          <button
            type="button"
            className="sa-btn-subtle"
            onClick={() => setShowIntegrationModal(true)}
          >
            <Settings2 size={15} />
            <span>
              {aiConfig.enabled
                ? "الذكاء الاصطناعي: متصل بخادم"
                : "إعدادات AI والعارض السحابي"}
            </span>
          </button>
          <button
            type="button"
            className="sa-btn-subtle"
            onClick={() => setShowFolderModal(true)}
          >
            <FolderPlus size={15} />
            <span>مجلد / قسم جديد</span>
          </button>
          <button
            type="button"
            className="cream sa-upload-cta"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} />
            <span>رفع وتصنيف ملفات</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT_FILE_EXTENSIONS}
            style={{ display: "none" }}
            onChange={(e) => e.target.files && handleStageFiles(e.target.files)}
          />
        </div>
      </div>

      {/* Explicit Storage & AI Transparency Banner */}
      <div className="sa-notice-bar">
        <div className="sa-notice-main">
          <HardDrive size={18} className="sa-copper-icon" />
          <div>
            <strong>التخزين المحلي عبر IndexedDB (حفظ النسخ الهندسية الأصلية دون تعديل)</strong>
            <small>
              تُحفظ محتويات الملفات محليًا داخل متصفحك الحالي فقط (وليس في localStorage).{" "}
              <u style={{ textDecorationColor: "var(--copper)" }}>
                التخزين المحلي لا يعني مزامنة الملفات تلقائيًا بين أجهزتك المختلفة
              </u>{" "}
              إلا بعد ربط مزود تخزين سحابي عبر خادم خلفي.
            </small>
          </div>
        </div>
        <div className="sa-notice-badges">
          <span className="sa-pill">
            <ShieldCheck size={13} />
            {stats ? `${formatFileSize(stats.totalBytes)} مستخدمة` : "IndexedDB جاهز"}
          </span>
          <span className="sa-pill">
            <Sparkles size={13} />
            {aiConfig.enabled
              ? "خدمة AI الخلفية مفعّلة"
              : "التصنيف الحالي: قواعد هندسية محلية (بدون AI خارجي)"}
          </span>
        </div>
      </div>

      {/* Summary Stats matching .stats cards */}
      <div className="stats" style={{ marginTop: 14 }}>
        <button
          type="button"
          onClick={() => {
            setGroupFilter("all");
            setActiveFolderId("all");
            setActiveSection("all");
          }}
        >
          <i className="c1">
            <HardDrive />
          </i>
          <div>
            <strong>{String(files.length).padStart(2, "0")}</strong>
            <small>إجمالي ملفات الأرشيف الذكي</small>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setGroupFilter(groupFilter === "cad" ? "bim" : "cad")}
        >
          <i className="c0">
            <Compass />
          </i>
          <div>
            <strong>{String(cadBimCount).padStart(2, "0")}</strong>
            <small>ملفات CAD و BIM و Navisworks</small>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setGroupFilter("office")}
        >
          <i className="c2">
            <FileText />
          </i>
          <div>
            <strong>{String(docsMediaCount).padStart(2, "0")}</strong>
            <small>المستندات والجداول والصور</small>
          </div>
        </button>
        <button type="button" onClick={() => setShowFolderModal(true)}>
          <i className="c3">
            <Link2 />
          </i>
          <div>
            <strong>{String(linkedCount).padStart(2, "0")}</strong>
            <small>ملفات مترابطة بعلاقات هندسية</small>
          </div>
        </button>
      </div>

      {/* Drag & Drop Upload Zone */}
      <section
        className={`sa-dropzone ${dragActive ? "active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files?.length) {
            handleStageFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="sa-dropzone-icon">
          <Upload size={22} />
        </div>
        <div className="sa-dropzone-text">
          <b>اسحب وأفلت الملفات الهندسية والمكتبية هنا، أو انقر للاختيار</b>
          <small>
            الصيغ المدعومة: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX · DWG, DXF, DWT, DWS · RVT, RFA,
            RTE, IFC · NWC, NWD, DWF, DWFx · JPG, PNG, TIFF, SVG
          </small>
        </div>
        <span className="sa-pill">تصنيف ذكي + مراجعة يدوية قبل الحفظ</span>
      </section>

      {/* Staged Smart Classification Queue (Review & Edit before committing) */}
      {stagedItems.length > 0 && (
        <section className="sa-staging-panel">
          <div className="sa-staging-header">
            <div>
              <small className="eyebrow">SMART CLASSIFICATION REVIEW</small>
              <h3>
                مراجعة التصنيف الذكي قبل الاعتماد ({stagedItems.length}{" "}
                {stagedItems.length === 1 ? "ملف" : "ملفات"})
              </h3>
              <small>
                تحقق من القسم والمشروع والتخصص والتاريخ المستخرج وعدّل أي حقل يدويًا قبل الحفظ في
                الأرشيف.
              </small>
            </div>
            <div className="sa-staging-btns">
              <button
                type="button"
                className="sa-btn-subtle"
                disabled={stagingBusy}
                onClick={() => setStagedItems([])}
              >
                <X size={15} /> إلغاء الكل
              </button>
              <button
                type="button"
                className="primary"
                style={{ marginTop: 0 }}
                disabled={stagingBusy}
                onClick={handleApproveStagedItems}
              >
                <Check size={16} />
                {stagingBusy ? "جارٍ الاعتماد والحفظ…" : "اعتماد وحفظ جميع الملفات"}
              </button>
            </div>
          </div>

          <div className="sa-staging-list">
            {stagedItems.map((item) => (
              <div key={item.tempId} className="sa-staged-card">
                <div className="sa-staged-top">
                  <div className="sa-staged-title">
                    <span className="fileicon">
                      {renderGroupIcon(item.suggestion.fileGroup)}
                    </span>
                    <div>
                      <b>{item.file.name}</b>
                      <small>
                        {item.suggestion.fileTypeLabel} · {formatFileSize(item.file.size)} · دقة
                        الاقتراح القاعدي {item.suggestion.confidenceScore}%
                      </small>
                    </div>
                  </div>
                  <div className="sa-staged-top-actions">
                    <span className="sa-ext-badge">{item.suggestion.extension}</span>
                    {aiConfig.enabled && (
                      <button
                        type="button"
                        className="sa-btn-subtle"
                        disabled={aiRequestingId === item.tempId}
                        onClick={() => handleTriggerBackendAiForStaged(item)}
                      >
                        <Sparkles size={14} />
                        {aiRequestingId === item.tempId ? "جارٍ التحليل…" : "طلب تحليل AI"}
                      </button>
                    )}
                    <button
                      type="button"
                      title="استبعاد هذا الملف"
                      onClick={() =>
                        setStagedItems((prev) =>
                          prev.filter((x) => x.tempId !== item.tempId)
                        )
                      }
                    >
                      <X size={17} />
                    </button>
                  </div>
                </div>

                {/* Honest CAD/Revit Binary Notice */}
                <div
                  className={`sa-analysis-note ${
                    item.suggestion.isBinaryCadOrBim ? "warn" : ""
                  }`}
                >
                  {item.suggestion.isBinaryCadOrBim ? (
                    <AlertTriangle size={14} />
                  ) : (
                    <Info size={14} />
                  )}
                  <span>{item.suggestion.analysisNote}</span>
                </div>

                <div className="sa-staged-grid">
                  <label>
                    اسم الحفظ في الأرشيف
                    <input
                      value={item.customName}
                      onChange={(e) =>
                        updateStagedItem(item.tempId, { customName: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    القسم المقترح
                    <select
                      value={item.section}
                      onChange={(e) => {
                        const nextSec = e.target.value;
                        const matchingFolder = folders.find((f) => f.section === nextSec);
                        updateStagedItem(item.tempId, {
                          section: nextSec,
                          folderId: matchingFolder ? matchingFolder.id : item.folderId,
                        });
                      }}
                    >
                      {allSections.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    المجلد
                    <select
                      value={item.folderId}
                      onChange={(e) => {
                        const fld = folders.find((f) => f.id === e.target.value);
                        updateStagedItem(item.tempId, {
                          folderId: e.target.value,
                          section: fld ? fld.section : item.section,
                        });
                      }}
                    >
                      <option value="">بدون مجلد فرعي</option>
                      {folders.map((fld) => (
                        <option key={fld.id} value={fld.id}>
                          {fld.name} ({fld.section})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    التصنيف الفرعي
                    <input
                      value={item.category}
                      onChange={(e) =>
                        updateStagedItem(item.tempId, { category: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    ربط بمشروع قائم
                    <select
                      value={item.projectId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        const found = projects.find((p) => p.id === pid);
                        updateStagedItem(item.tempId, {
                          projectId: pid,
                          projectName: found ? found.name : item.projectName,
                        });
                      }}
                    >
                      <option value="">مشروع خارجي / كتابة يدوية</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    اسم المشروع (المستخرج أو اليدوي)
                    <input
                      placeholder="مثال: مجمع النخيل السكني"
                      value={item.projectName}
                      onChange={(e) =>
                        updateStagedItem(item.tempId, { projectName: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    التخصص الهندسي
                    <select
                      value={item.discipline}
                      onChange={(e) =>
                        updateStagedItem(item.tempId, {
                          discipline: e.target.value as EngineeringDiscipline,
                        })
                      }
                    >
                      {ALL_DISCIPLINES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    تاريخ الوثيقة / المخطط
                    <input
                      type="date"
                      value={item.documentDate}
                      onChange={(e) =>
                        updateStagedItem(item.tempId, { documentDate: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    كود المخطط / رقم الإصدار (اختياري)
                    <div className="sa-inline-inputs">
                      <input
                        placeholder="كود: A-101"
                        value={item.drawingCode}
                        onChange={(e) =>
                          updateStagedItem(item.tempId, { drawingCode: e.target.value })
                        }
                      />
                      <input
                        placeholder="الإصدار: R01"
                        value={item.revision}
                        onChange={(e) =>
                          updateStagedItem(item.tempId, { revision: e.target.value })
                        }
                      />
                    </div>
                  </label>

                  <label>
                    الوسوم (مفصولة بفاصلة)
                    <input
                      value={item.tagsInput}
                      onChange={(e) =>
                        updateStagedItem(item.tempId, { tagsInput: e.target.value })
                      }
                    />
                  </label>

                  {files.length > 0 && (
                    <label>
                      ربط بملف ذي علاقة في الأرشيف
                      <select
                        value={item.relatedFileIds[0] || ""}
                        onChange={(e) =>
                          updateStagedItem(item.tempId, {
                            relatedFileIds: e.target.value ? [e.target.value] : [],
                          })
                        }
                      >
                        <option value="">بدون ربط مبدئي</option>
                        {files.map((existing) => (
                          <option key={existing.id} value={existing.id}>
                            {existing.name} ({existing.extension})
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="sa-span-full">
                    ملاحظات فنية (اختياري)
                    <input
                      placeholder="أي ملاحظات حول الاعتماد أو حالة المخطط…"
                      value={item.notes}
                      onChange={(e) =>
                        updateStagedItem(item.tempId, { notes: e.target.value })
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Two-Column Explorer: Custom Folders/Sections Sidebar + Search/Filter/File List */}
      <div className="sa-explorer">
        {/* Folders & Sections Panel */}
        <div className="sa-folders-panel">
          <div className="sa-panel-head">
            <b>الأقسام والمجلدات</b>
            <button
              type="button"
              title="إضافة مجلد مخصص"
              onClick={() => setShowFolderModal(true)}
            >
              <FolderPlus size={16} />
            </button>
          </div>

          <button
            type="button"
            className={`sa-folder-item ${
              activeSection === "all" && activeFolderId === "all" ? "active" : ""
            }`}
            onClick={() => {
              setActiveSection("all");
              setActiveFolderId("all");
            }}
          >
            <FolderOpen size={16} />
            <span>كل ملفات الأرشيف</span>
            <em>{files.length}</em>
          </button>

          {allSections.map((sec) => {
            const secFolders = folders.filter((f) => f.section === sec);
            const secCount = files.filter((f) => f.section === sec).length;
            const secActive = activeSection === sec && activeFolderId === "all";
            return (
              <div key={sec} className="sa-section-group">
                <button
                  type="button"
                  className={`sa-section-btn ${secActive ? "active" : ""}`}
                  onClick={() => {
                    setActiveSection(sec);
                    setActiveFolderId("all");
                  }}
                >
                  <span>{sec}</span>
                  <em>{secCount}</em>
                </button>
                {secFolders.map((fld) => {
                  const fldCount = files.filter((f) => f.folderId === fld.id).length;
                  const isActive = activeFolderId === fld.id;
                  return (
                    <div
                      key={fld.id}
                      className={`sa-subfolder-row ${isActive ? "active" : ""}`}
                    >
                      <button
                        type="button"
                        className="sa-subfolder-btn"
                        onClick={() => {
                          setActiveSection("all");
                          setActiveFolderId(fld.id);
                        }}
                      >
                        <Folder size={14} />
                        <span>{fld.name}</span>
                        <em>{fldCount}</em>
                      </button>
                      {!fld.isSystem && (
                        <button
                          type="button"
                          className="sa-del-folder"
                          title="حذف المجلد المخصص"
                          onClick={() => handleDeleteFolder(fld)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Files & Filters Main Content */}
        <div className="sa-files-panel">
          {/* Search & Multi-filter bar */}
          <div className="sa-filters-box">
            <div className="search" style={{ marginBottom: 10 }}>
              <Search size={17} />
              <input
                placeholder="ابحث باسم الملف، اسم المشروع، التخصص، كود المخطط، أو الوسوم…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")}>
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="sa-filter-controls">
              <div className="sa-filter-field">
                <small>
                  <Filter size={12} /> نوع الملفات
                </small>
                <select
                  value={groupFilter}
                  onChange={(e) =>
                    setGroupFilter(e.target.value as ArchiveFileGroup | "all")
                  }
                >
                  {(Object.keys(GROUP_LABELS) as Array<ArchiveFileGroup | "all">).map(
                    (g) => (
                      <option key={g} value={g}>
                        {GROUP_LABELS[g]}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="sa-filter-field">
                <small>
                  <Layers size={12} /> التخصص الهندسي
                </small>
                <select
                  value={disciplineFilter}
                  onChange={(e) => setDisciplineFilter(e.target.value)}
                >
                  <option value="all">كل التخصصات</option>
                  {ALL_DISCIPLINES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sa-filter-field">
                <small>
                  <Calendar size={12} /> تاريخ الإضافة
                </small>
                <select
                  value={datePreset}
                  onChange={(e) =>
                    setDatePreset(e.target.value as DateFilterPreset)
                  }
                >
                  <option value="all">كل الأوقات</option>
                  <option value="today">المضافة اليوم</option>
                  <option value="7days">آخر 7 أيام</option>
                  <option value="30days">آخر 30 يومًا</option>
                  <option value="custom">نطاق تاريخ مخصص</option>
                </select>
              </div>

              {(groupFilter !== "all" ||
                disciplineFilter !== "all" ||
                datePreset !== "all" ||
                activeSection !== "all" ||
                activeFolderId !== "all" ||
                searchQuery) && (
                <button
                  type="button"
                  className="sa-reset-btn"
                  onClick={() => {
                    setGroupFilter("all");
                    setDisciplineFilter("all");
                    setDatePreset("all");
                    setDateFrom("");
                    setDateTo("");
                    setActiveSection("all");
                    setActiveFolderId("all");
                    setSearchQuery("");
                  }}
                >
                  <RefreshCw size={13} /> إعادة ضبط الفلاتر
                </button>
              )}
            </div>

            {datePreset === "custom" && (
              <div className="sa-custom-dates">
                <label>
                  من تاريخ:
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </label>
                <label>
                  إلى تاريخ:
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Archive File Rows */}
          <div className="list">
            {loading ? (
              <p className="empty">جارٍ تحميل الأرشيف الذكي…</p>
            ) : filteredFiles.length === 0 ? (
              <div className="sa-empty-state">
                <p className="empty" style={{ padding: 0 }}>
                  {files.length === 0
                    ? "لا توجد ملفات في الأرشيف الذكي بعد. اسحب ملفاتك الهندسية أو المكتبية للأعلى لبدء التصنيف الذكي."
                    : "لا توجد ملفات تطابق معايير البحث أو الفلترة الحالية."}
                </p>
              </div>
            ) : (
              filteredFiles.map((file) => {
                const resolvedProject =
                  projects.find((p) => p.id === file.projectId)?.name ||
                  file.projectName ||
                  "بدون مشروع محدد";
                const folderName =
                  folders.find((fl) => fl.id === file.folderId)?.name || file.section;

                return (
                  <div className="row sa-file-row" key={file.id}>
                    <span className="fileicon">
                      {renderGroupIcon(file.fileGroup)}
                    </span>
                    <div
                      className="sa-file-main"
                      onClick={() => openFileDetails(file)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && openFileDetails(file)}
                    >
                      <div className="sa-file-title-line">
                        <b>{file.name}</b>
                        {file.revision && (
                          <span className="sa-mini-tag">{file.revision}</span>
                        )}
                        {file.relatedFileIds.length > 0 && (
                          <span
                            className="sa-mini-tag linked"
                            title="مرتبط بملفات أخرى"
                          >
                            <Link2 size={11} /> {file.relatedFileIds.length}
                          </span>
                        )}
                      </div>
                      <small>
                        {resolvedProject} · {file.discipline} · {folderName} ·{" "}
                        {formatFileSize(file.size)} · أضيف{" "}
                        {new Date(file.addedAt).toLocaleDateString("ar-EG")}
                      </small>
                    </div>

                    <label>{file.extension}</label>

                    <div className="sa-row-actions">
                      <button
                        type="button"
                        title="معاينة الملف"
                        onClick={() => handleOpenPreview(file)}
                      >
                        <Eye size={17} />
                      </button>
                      <button
                        type="button"
                        title="تفاصيل وإدارة الملف (تسمية / نقل / ربط)"
                        onClick={() => openFileDetails(file)}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        type="button"
                        title="تنزيل النسخة الأصلية"
                        onClick={() => handleDownloadOriginal(file)}
                      >
                        <Download size={17} />
                      </button>
                      <button
                        type="button"
                        title="حذف الملف"
                        onClick={() => handleDeleteArchiveFile(file)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* File Details, Rename, Move, Edit & Related Files Modal */}
      {selectedFile && (
        <div className="overlay" onClick={() => setSelectedFile(null)}>
          <section
            className="dialog sa-wide-dialog"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close" onClick={() => setSelectedFile(null)}>
              <X />
            </button>
            <small className="eyebrow">FILE METADATA & RELATIONS</small>
            <h2>{selectedFile.name}</h2>
            <small style={{ marginBottom: 12 }}>
              الاسم الأصلي عند الرفع: {selectedFile.originalName} ·{" "}
              {selectedFile.fileTypeLabel}
            </small>

            <div className="sa-detail-badges">
              <span className="sa-pill">
                <ShieldCheck size={13} /> النسخة الهندسية الأصلية محفوظة دون تعديل
              </span>
              <span className="sa-pill">الحجم: {formatFileSize(selectedFile.size)}</span>
              <span className="sa-pill">تاريخ الوثيقة: {selectedFile.documentDate}</span>
            </div>

            {/* Action Toolbar inside Details */}
            <div className="sa-detail-toolbar">
              <button
                type="button"
                className="sa-btn-subtle"
                onClick={() => handleOpenPreview(selectedFile)}
              >
                <Eye size={15} /> معاينة
              </button>
              <button
                type="button"
                className="sa-btn-subtle"
                onClick={() => handleDownloadOriginal(selectedFile)}
              >
                <Download size={15} /> تنزيل الأصلي
              </button>
              <button
                type="button"
                className={`sa-btn-subtle ${editMode === "rename" ? "active" : ""}`}
                onClick={() =>
                  setEditMode(editMode === "rename" ? "none" : "rename")
                }
              >
                <Edit3 size={15} /> إعادة تسمية
              </button>
              <button
                type="button"
                className={`sa-btn-subtle ${editMode === "move" ? "active" : ""}`}
                onClick={() => setEditMode(editMode === "move" ? "none" : "move")}
              >
                <FolderInput size={15} /> نقل لمجلد
              </button>
              <button
                type="button"
                className={`sa-btn-subtle ${editMode === "edit" ? "active" : ""}`}
                onClick={() => setEditMode(editMode === "edit" ? "none" : "edit")}
              >
                <Layers size={15} /> تعديل التصنيف
              </button>
              <button
                type="button"
                className={`sa-btn-subtle ${editMode === "link" ? "active" : ""}`}
                onClick={() => setEditMode(editMode === "link" ? "none" : "link")}
              >
                <Link2 size={15} /> ربط ملف ذي علاقة
              </button>
            </div>

            {/* Sub-panels for Rename / Move / Edit / Link */}
            {editMode === "rename" && (
              <div className="sa-subform">
                <label>
                  الاسم الجديد للملف (سيتم الحفاظ على الامتداد .{selectedFile.extension})
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="primary"
                  onClick={handleSaveRename}
                >
                  حفظ الاسم الجديد
                </button>
              </div>
            )}

            {editMode === "move" && (
              <div className="sa-subform">
                <label>
                  نقل إلى المجلد
                  <select
                    value={moveFolderId}
                    onChange={(e) => {
                      setMoveFolderId(e.target.value);
                      const fld = folders.find((x) => x.id === e.target.value);
                      if (fld) setMoveSection(fld.section);
                    }}
                  >
                    <option value="">بدون مجلد فرعي (القسم العام)</option>
                    {folders.map((fld) => (
                      <option key={fld.id} value={fld.id}>
                        {fld.name} — ({fld.section})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  القسم
                  <select
                    value={moveSection}
                    onChange={(e) => setMoveSection(e.target.value)}
                  >
                    {allSections.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className="primary" onClick={handleSaveMove}>
                  تأكيد النقل
                </button>
              </div>
            )}

            {editMode === "edit" && (
              <div className="sa-subform">
                <label>
                  التصنيف الفرعي
                  <input
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  />
                </label>
                <label>
                  المشروع المرتبط
                  <select
                    value={editProjectId}
                    onChange={(e) => {
                      setEditProjectId(e.target.value);
                      const found = projects.find((p) => p.id === e.target.value);
                      if (found) setEditProjectName(found.name);
                    }}
                  >
                    <option value="">مشروع مخصص / خارج القائمة</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  اسم المشروع
                  <input
                    value={editProjectName}
                    onChange={(e) => setEditProjectName(e.target.value)}
                  />
                </label>
                <label>
                  التخصص الهندسي
                  <select
                    value={editDiscipline}
                    onChange={(e) =>
                      setEditDiscipline(e.target.value as EngineeringDiscipline)
                    }
                  >
                    {ALL_DISCIPLINES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  تاريخ الوثيقة
                  <input
                    type="date"
                    value={editDocDate}
                    onChange={(e) => setEditDocDate(e.target.value)}
                  />
                </label>
                <label>
                  ملاحظات
                  <input
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="primary"
                  onClick={handleSaveClassificationEdit}
                >
                  حفظ التعديلات
                </button>
              </div>
            )}

            {editMode === "link" && (
              <div className="sa-subform">
                <label>
                  اختر ملفًا ذا علاقة لربطه بهذا الملف (مثل ربط مخطط DWG بنسخة PDF أو جدول BOQ)
                  <select
                    value={linkTargetId}
                    onChange={(e) => setLinkTargetId(e.target.value)}
                  >
                    <option value="">— اختر ملفًا من الأرشيف —</option>
                    {files
                      .filter(
                        (f) =>
                          f.id !== selectedFile.id &&
                          !selectedFile.relatedFileIds.includes(f.id)
                      )
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.extension} · {f.discipline})
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="primary"
                  disabled={!linkTargetId}
                  onClick={handleLinkRelatedFile}
                >
                  <Link2 size={15} /> ربط الملفين
                </button>
              </div>
            )}

            {/* Metadata Grid */}
            <div className="sa-meta-grid">
              <div>
                <small>القسم</small>
                <b>{selectedFile.section}</b>
              </div>
              <div>
                <small>المجلد</small>
                <b>
                  {folders.find((f) => f.id === selectedFile.folderId)?.name ||
                    "العام"}
                </b>
              </div>
              <div>
                <small>التصنيف</small>
                <b>{selectedFile.category}</b>
              </div>
              <div>
                <small>المشروع</small>
                <b>
                  {projects.find((p) => p.id === selectedFile.projectId)?.name ||
                    selectedFile.projectName ||
                    "غير محدد"}
                </b>
              </div>
              <div>
                <small>التخصص الهندسي</small>
                <b>{selectedFile.discipline}</b>
              </div>
              <div>
                <small>تاريخ الإضافة للأرشيف</small>
                <b>{new Date(selectedFile.addedAt).toLocaleString("ar-EG")}</b>
              </div>
              {selectedFile.drawingCode && (
                <div>
                  <small>كود المخطط</small>
                  <b>{selectedFile.drawingCode}</b>
                </div>
              )}
              {selectedFile.revision && (
                <div>
                  <small>الإصدار / المراجعة</small>
                  <b>{selectedFile.revision}</b>
                </div>
              )}
            </div>

            {selectedFile.notes && (
              <div className="sa-notes-box">
                <small>ملاحظات فنية</small>
                <p>{selectedFile.notes}</p>
              </div>
            )}

            {/* Related / Linked Files Section */}
            <div className="sa-related-section">
              <h3>الملفات ذات العلاقة ({selectedFile.relatedFileIds.length})</h3>
              {selectedFile.relatedFileIds.length === 0 ? (
                <small>
                  لا توجد ملفات مرتبطة بعد. استخدم زر «ربط ملف ذي علاقة» لربط المخططات
                  بالمستندات والنماذج الرديفة.
                </small>
              ) : (
                <div className="list" style={{ marginTop: 8 }}>
                  {selectedFile.relatedFileIds.map((rid) => {
                    const rel = files.find((f) => f.id === rid);
                    if (!rel) return null;
                    return (
                      <div key={rid} className="row">
                        <span className="fileicon">
                          {renderGroupIcon(rel.fileGroup)}
                        </span>
                        <div
                          style={{ cursor: "pointer" }}
                          onClick={() => openFileDetails(rel)}
                        >
                          <b>{rel.name}</b>
                          <small>{rel.discipline}</small>
                        </div>
                        <label>{rel.extension}</label>
                        <button
                          type="button"
                          title="معاينة الملف المرتبط"
                          onClick={() => handleOpenPreview(rel)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          title="إلغاء الربط"
                          onClick={() => handleUnlinkRelatedFile(rid)}
                        >
                          <Unlink size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="sa-danger-footer">
              <button
                type="button"
                className="sa-delete-btn"
                onClick={() => handleDeleteArchiveFile(selectedFile)}
              >
                <Trash2 size={15} /> حذف الملف نهائيًا من الأرشيف المحلي
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Universal File & CAD/BIM Preview Modal */}
      {previewFile && (
        <div className="overlay" onClick={closePreview}>
          <section
            className="dialog sa-preview-dialog"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sa-preview-header">
              <div>
                <small className="eyebrow">
                  {previewFile.extension} PREVIEW · READ-ONLY ORIGINAL
                </small>
                <h2>{previewFile.name}</h2>
              </div>
              <div className="sa-preview-controls">
                {(previewFile.fileGroup === "image" || dxfPreview?.bounds) && (
                  <>
                    <button
                      type="button"
                      className="sa-btn-subtle"
                      onClick={() =>
                        setPreviewZoom((z) => Math.max(0.4, +(z - 0.25).toFixed(2)))
                      }
                    >
                      <ZoomOut size={15} />
                    </button>
                    <span className="sa-pill">{Math.round(previewZoom * 100)}%</span>
                    <button
                      type="button"
                      className="sa-btn-subtle"
                      onClick={() =>
                        setPreviewZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))
                      }
                    >
                      <ZoomIn size={15} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="sa-btn-subtle"
                  onClick={() => handleDownloadOriginal(previewFile)}
                >
                  <Download size={15} /> تنزيل الأصلي
                </button>
                <button type="button" onClick={closePreview}>
                  <X />
                </button>
              </div>
            </div>

            <div className="sa-preview-stage">
              {previewLoading ? (
                <p className="empty">جارٍ تحضير المعاينة الآمنة دون تعديل الملف الأصلي…</p>
              ) : previewFile.extension === "PDF" && previewUrl ? (
                <iframe
                  src={previewUrl}
                  title={previewFile.name}
                  className="sa-pdf-frame"
                />
              ) : ["JPG", "PNG", "SVG"].includes(previewFile.extension) &&
                previewUrl ? (
                <div className="sa-image-canvas">
                  <img
                    src={previewUrl}
                    alt={previewFile.name}
                    style={{ transform: `scale(${previewZoom})` }}
                  />
                </div>
              ) : previewFile.extension === "TIFF" && previewUrl ? (
                <div className="sa-cad-fallback">
                  <img
                    src={previewUrl}
                    alt={previewFile.name}
                    style={{
                      maxWidth: "100%",
                      maxHeight: 360,
                      transform: `scale(${previewZoom})`,
                    }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <small>
                    ملاحظة: بعض المتصفحات تعرض صور TIFF مباشرة بينما تتطلب متصفحات أخرى
                    تنزيل الملف لفتحه بعارض الصور المكتبي. النسخة الأصلية محفوظة بالكامل.
                  </small>
                </div>
              ) : previewFile.extension === "DXF" && dxfPreview ? (
                dxfPreview.bounds &&
                (dxfPreview.lines.length > 0 || dxfPreview.circles.length > 0) ? (
                  <div className="sa-dxf-viewer">
                    <div className="sa-dxf-bar">
                      <span>
                        معاينة خطوط DXF ثنائية الأبعاد (للقراءة فقط) · العناصر:{" "}
                        {dxfPreview.lines.length + dxfPreview.circles.length} · الطبقات (
                        {dxfPreview.layers.length}): {dxfPreview.layers.slice(0, 6).join("، ")}
                      </span>
                    </div>
                    <div className="sa-dxf-canvas">
                      {(() => {
                        const b = dxfPreview.bounds!;
                        const w = Math.max(b.maxX - b.minX, 1);
                        const h = Math.max(b.maxY - b.minY, 1);
                        const pad = Math.max(w, h) * 0.06;
                        const vbX = b.minX - pad;
                        const vbY = -(b.maxY + pad);
                        const vbW = w + pad * 2;
                        const vbH = h + pad * 2;
                        const strokeW = Math.max(vbW, vbH) * 0.0022;

                        return (
                          <svg
                            viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
                            style={{
                              width: `${100 * previewZoom}%`,
                              height: `${100 * previewZoom}%`,
                            }}
                          >
                            {dxfPreview.lines.map((ln, idx) => (
                              <line
                                key={idx}
                                x1={ln.x1}
                                y1={-ln.y1}
                                x2={ln.x2}
                                y2={-ln.y2}
                                stroke="#f5a16b"
                                strokeWidth={strokeW}
                                strokeLinecap="round"
                              />
                            ))}
                            {dxfPreview.circles.map((c, idx) => (
                              <circle
                                key={`c-${idx}`}
                                cx={c.cx}
                                cy={-c.cy}
                                r={c.r}
                                fill="none"
                                stroke="#8fd3e8"
                                strokeWidth={strokeW}
                              />
                            ))}
                          </svg>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="sa-cad-fallback">
                    <Compass size={38} className="sa-copper-icon" />
                    <h3>ملف مخطط DXF</h3>
                    <p>{dxfPreview.note || "يتطلب هذا المخطط عارض CAD متخصصًا."}</p>
                    {viewerConfig.enabled && viewerConfig.viewerUrlTemplate && (
                      <a
                        href={viewerConfig.viewerUrlTemplate.replace(
                          "{fileName}",
                          encodeURIComponent(previewFile.name)
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="primary"
                      >
                        <ExternalLink size={15} /> فتح في {viewerConfig.viewerName}
                      </a>
                    )}
                  </div>
                )
              ) : previewFile.extension === "IFC" && ifcInspection ? (
                <div className="sa-cad-fallback">
                  <Box size={38} className="sa-copper-icon" />
                  <h3>نموذج OpenBIM قياسي ({ifcInspection.schema})</h3>
                  <p>
                    تم فحص ترويسة ملف STEP النصية دون المساس بالملف الأصلي
                    {ifcInspection.authoringApp
                      ? ` · برنامج الإنشاء: ${ifcInspection.authoringApp}`
                      : ""}
                    .
                  </p>
                  {ifcInspection.elementCounts.length > 0 && (
                    <div className="sa-ifc-counts">
                      {ifcInspection.elementCounts.map((el) => (
                        <div key={el.label} className="sa-ifc-chip">
                          <strong>{el.count}</strong>
                          <small>{el.label}</small>
                        </div>
                      ))}
                    </div>
                  )}
                  <small style={{ maxWidth: 560 }}>
                    للعرض ثلاثي الأبعاد الكامل لنماذج IFC و RVT، يمكنك ربط عارض BIM ويب
                    خارجي (مثل IFC.js / Speckle / Autodesk Viewer) من إعدادات العارض، أو
                    تنزيل النموذج الأصلي المحفوظ بالكامل.
                  </small>
                  <div className="sa-fallback-actions">
                    {viewerConfig.enabled && viewerConfig.viewerUrlTemplate ? (
                      <a
                        href={viewerConfig.viewerUrlTemplate.replace(
                          "{fileName}",
                          encodeURIComponent(previewFile.name)
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="primary"
                      >
                        <ExternalLink size={15} /> فتح في {viewerConfig.viewerName}
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="sa-btn-subtle"
                        onClick={() => {
                          closePreview();
                          setShowIntegrationModal(true);
                        }}
                      >
                        <Settings2 size={15} /> إعداد عارض BIM/CAD خارجي
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="sa-cad-fallback">
                  {renderGroupIcon(previewFile.fileGroup)}
                  <h3>
                    {previewFile.name} ({previewFile.extension})
                  </h3>
                  <p>
                    {["DWG", "DWT", "DWS", "RVT", "RFA", "RTE", "NWC", "NWD", "DWF", "DWFX"].includes(
                      previewFile.extension.toUpperCase()
                    )
                      ? "الملف الهندسي الأصلي محفوظ في الأرشيف بتطابق تام دون أي تعديل. تتطلب المعاينة التفاعلية المباشرة لملفات DWG و Revit و Navisworks ربط محرك عرض هندسي متخصص (مثل Autodesk Platform Services Viewer أو خادم تحويل سحابي)."
                      : "المستندات المكتبية (Word / Excel / PowerPoint) محفوظة بنسختها الأصلية في IndexedDB؛ يمكنك تنزيلها مباشرة لفتحها بتطبيقات Office أو ربط خدمة معاينة مستندات خلفية."}
                  </p>
                  <div className="sa-fallback-actions">
                    <button
                      type="button"
                      className="primary"
                      style={{ marginTop: 0 }}
                      onClick={() => handleDownloadOriginal(previewFile)}
                    >
                      <Download size={15} /> تنزيل الملف الأصلي ({formatFileSize(previewFile.size)})
                    </button>
                    {viewerConfig.enabled && viewerConfig.viewerUrlTemplate ? (
                      <a
                        href={viewerConfig.viewerUrlTemplate.replace(
                          "{fileName}",
                          encodeURIComponent(previewFile.name)
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="sa-btn-subtle"
                      >
                        <ExternalLink size={15} /> فتح عبر {viewerConfig.viewerName}
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="sa-btn-subtle"
                        onClick={() => {
                          closePreview();
                          setShowIntegrationModal(true);
                        }}
                      >
                        <Settings2 size={15} /> ربط عارض خارجي عند توفره
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Custom Folder & Section Creation Modal */}
      {showFolderModal && (
        <div className="overlay" onClick={() => setShowFolderModal(false)}>
          <section
            className="dialog"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close" onClick={() => setShowFolderModal(false)}>
              <X />
            </button>
            <h2>إضافة مجلد أو قسم مخصص</h2>
            <form onSubmit={handleCreateFolder}>
              <label>
                القسم الرئيسي
                <select
                  value={newFolderSection}
                  onChange={(e) => setNewFolderSection(e.target.value)}
                >
                  {allSections.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                  <option value="__custom__">+ إنشاء قسم هندسي جديد…</option>
                </select>
              </label>
              {newFolderSection === "__custom__" && (
                <label>
                  اسم القسم الجديد
                  <input
                    required
                    placeholder="مثال: الاعتمادات البلدية والدفاع المدني"
                    value={customSectionInput}
                    onChange={(e) => setCustomSectionInput(e.target.value)}
                  />
                </label>
              )}
              <label>
                اسم المجلد الفرعي
                <input
                  required
                  placeholder="مثال: مخططات التكييف المعتمدة - الدور الأول"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
              </label>
              <button className="primary">إنشاء المجلد</button>
            </form>
          </section>
        </div>
      )}

      {/* AI Backend & External CAD Viewer Readiness Modal */}
      {showIntegrationModal && (
        <div className="overlay" onClick={() => setShowIntegrationModal(false)}>
          <section
            className="dialog sa-wide-dialog"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              onClick={() => setShowIntegrationModal(false)}
            >
              <X />
            </button>
            <small className="eyebrow">CLOUD, AI & CAD VIEWER ARCHITECTURE</small>
            <h2>تهيئة الربط الخلفي (AI والعارض الهندسي والتخزين السحابي)</h2>

            <div className="sa-analysis-note warn" style={{ marginTop: 10 }}>
              <ShieldCheck size={16} />
              <span>
                حماية أمنية: لا يتم وضع أو تخزين أي مفاتيح سرية (API Keys) داخل الواجهة
                الأمامية. يتم الاتصال بخدمات الذكاء الاصطناعي أو تحويل ملفات DWG/RVT حصريًا
                عبر نقطة نهاية خادم خلفي (Backend Proxy) خاص بك عند توفره.
              </span>
            </div>

            <form onSubmit={handleSaveIntegrations}>
              <h3 style={{ marginTop: 16, marginBottom: 6, fontSize: 16 }}>
                1. خدمة الذكاء الاصطناعي لقراءة وتصنيف الملفات (Backend AI Proxy)
              </h3>
              <small>
                الحالة الحالية:{" "}
                <strong style={{ color: "var(--copper)" }}>
                  {aiConfig.enabled
                    ? "مهيأة للاتصال بنقطة النهاية الخلفية"
                    : "غير مفعّلة — يعمل النظام بالتصنيف القاعدي المحلي فقط"}
                </strong>
              </small>

              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  style={{ width: "auto", margin: 0 }}
                  checked={aiConfig.enabled}
                  onChange={(e) =>
                    setAiConfig({ ...aiConfig, enabled: e.target.checked })
                  }
                />
                تفعيل الاتصال بخدمة تحليل الذكاء الاصطناعي الخلفية عند توفرها
              </label>

              <label>
                عنوان نقطة نهاية الخادم الخلفي (POST Endpoint URL)
                <input
                  type="url"
                  placeholder="https://api.your-domain.com/v1/archive/analyze"
                  value={aiConfig.endpointUrl}
                  onChange={(e) =>
                    setAiConfig({ ...aiConfig, endpointUrl: e.target.value })
                  }
                />
              </label>

              <h3 style={{ marginTop: 18, marginBottom: 6, fontSize: 16 }}>
                2. عارض ملفات الهندسة الخارجي (DWG / RVT / IFC Viewer)
              </h3>
              <small>
                تُعرض ملفات PDF والصور وملفات DXF النصية وترويسات IFC محليًا في المتصفح.
                ولعرض نماذج DWG و RVT ثلاثية الأبعاد، اربط عنوان عارض ويب مخصص (مثل
                Autodesk APS Viewer أو Speckle).
              </small>

              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  style={{ width: "auto", margin: 0 }}
                  checked={viewerConfig.enabled}
                  onChange={(e) =>
                    setViewerConfig({
                      ...viewerConfig,
                      enabled: e.target.checked,
                    })
                  }
                />
                تفعيل زر الفتح في العارض الهندسي الخارجي
              </label>

              <label>
                اسم العارض الهندسي
                <input
                  placeholder="Autodesk Viewer / BIM Server"
                  value={viewerConfig.viewerName}
                  onChange={(e) =>
                    setViewerConfig({
                      ...viewerConfig,
                      viewerName: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                قالب رابط العارض (يدعم المتغير {"{fileName}"})
                <input
                  type="url"
                  placeholder="https://viewer.your-domain.com/open?file={fileName}"
                  value={viewerConfig.viewerUrlTemplate}
                  onChange={(e) =>
                    setViewerConfig({
                      ...viewerConfig,
                      viewerUrlTemplate: e.target.value,
                    })
                  }
                />
              </label>

              <button className="primary">حفظ إعدادات التكامل</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
