export type ArchiveFileGroup =
  | "office"
  | "cad"
  | "bim"
  | "navisworks"
  | "image"
  | "other";

export type EngineeringDiscipline =
  | "معماري (Architectural)"
  | "إنشائي (Structural)"
  | "ميكانيكا وتكييف (MEP / HVAC)"
  | "كهرباء (Electrical)"
  | "صحي ومكافحة حريق (Plumbing & FF)"
  | "مدني وبنية تحتية (Civil)"
  | "إدارة مشاريع وعقود (PM & Contracts)"
  | "تشغيل وصيانة (O&M)"
  | "مساحة وجيوتقنية (Survey)"
  | "عام / متعدد التخصصات";

export interface ArchiveFolder {
  id: string;
  name: string;
  section: string;
  color?: string;
  createdAt: number;
  isSystem?: boolean;
}

export interface ClassificationSuggestion {
  extension: string;
  mimeType: string;
  fileGroup: ArchiveFileGroup;
  fileTypeLabel: string;
  suggestedSection: string;
  suggestedCategory: string;
  suggestedFolderId: string;
  detectedProjectId: string;
  detectedProjectName: string;
  detectedDiscipline: EngineeringDiscipline;
  detectedDocumentDate: string;
  detectedDrawingCode?: string;
  detectedRevision?: string;
  extractedTags: string[];
  confidenceScore: number; // 0 - 100 (heuristic rule-based)
  analysisMethod: "heuristic-metadata" | "content-heuristic" | "ai-backend";
  analysisNote: string;
  isBinaryCadOrBim: boolean;
}

export interface ArchiveFileMetadata {
  id: string;
  name: string;
  originalName: string;
  extension: string;
  mimeType: string;
  fileGroup: ArchiveFileGroup;
  fileTypeLabel: string;
  size: number;
  addedAt: number;
  lastModifiedAt: number;
  documentDate: string; // YYYY-MM-DD
  section: string;
  category: string;
  folderId: string;
  projectId: string;
  projectName: string;
  discipline: EngineeringDiscipline;
  drawingCode?: string;
  revision?: string;
  tags: string[];
  notes: string;
  relatedFileIds: string[];
  checksumHint?: string;
  storageDriver: "indexeddb" | "cloud-pending";
  aiStatus: "not-configured" | "queued" | "analyzed";
  isOriginalPreserved: boolean;
}

export interface ArchiveFileRecord extends ArchiveFileMetadata {
  blob: Blob;
}

export interface StagedUploadItem {
  tempId: string;
  file: File;
  customName: string;
  suggestion: ClassificationSuggestion;
  section: string;
  category: string;
  folderId: string;
  projectId: string;
  projectName: string;
  discipline: EngineeringDiscipline;
  documentDate: string;
  drawingCode: string;
  revision: string;
  tagsInput: string;
  notes: string;
  relatedFileIds: string[];
}

export interface StorageStats {
  totalFiles: number;
  totalBytes: number;
  quotaBytes?: number;
  usageBytes?: number;
  driverName: string;
  isCloudSynced: boolean;
}

export interface ArchiveStorageAdapter {
  readonly driverId: "indexeddb" | "cloud-adapter";
  readonly isCloudSynced: boolean;
  listMetadata(): Promise<ArchiveFileMetadata[]>;
  getFileBlob(id: string): Promise<Blob | null>;
  saveFile(record: ArchiveFileRecord): Promise<void>;
  updateMetadata(
    id: string,
    patch: Partial<Omit<ArchiveFileMetadata, "id">>
  ): Promise<ArchiveFileMetadata | null>;
  deleteFile(id: string): Promise<void>;
  listFolders(): Promise<ArchiveFolder[]>;
  saveFolder(folder: ArchiveFolder): Promise<void>;
  deleteFolder(folderId: string): Promise<void>;
  getStats(): Promise<StorageStats>;
}

export interface AiBackendConfig {
  enabled: boolean;
  endpointUrl: string; // Backend proxy endpoint ONLY — never store API keys in frontend
  organizationHeader?: string;
  autoSuggestOnStage: boolean;
}

export interface AiAnalysisResponse {
  supported: boolean;
  providerName?: string;
  suggestedSection?: string;
  suggestedCategory?: string;
  detectedProjectName?: string;
  detectedDiscipline?: EngineeringDiscipline;
  detectedDocumentDate?: string;
  summary?: string;
  extractedTags?: string[];
  confidence?: number;
  message: string;
}

export interface ExternalCadViewerConfig {
  enabled: boolean;
  viewerName: string;
  viewerUrlTemplate: string; // e.g. Autodesk Platform Services / Speckle / IFC.js hosted endpoint
}
