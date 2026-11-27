export type MainTabId =
  | "overview"
  | "cv"
  | "projects"
  | "om"
  | "files"
  | "samples"
  | "certificates"
  | "archive"
  | "settings";

export type ThemePresetId =
  | "graphite-copper"
  | "blueprint-navy"
  | "obsidian-gold"
  | "emerald-site"
  | "paper-light"
  | "burgundy-light";

export type AvatarShape = "circle" | "rounded" | "square" | "hexagon" | "shield";
export type AvatarFrame = "copper" | "glow" | "solid" | "none";
export type BrandIconId =
  | "compass"
  | "cpu"
  | "wrench"
  | "zap"
  | "building"
  | "layers"
  | "hardhat"
  | "custom";

export type FontScale = "sm" | "md" | "lg";
export type RadiusStyle = "sharp" | "standard" | "soft" | "pill";
export type SurfaceStyle = "machined" | "flat" | "glass";
export type LayoutDensity = "compact" | "standard" | "comfortable";
export type AvailabilityStatus = "available" | "on-site" | "office" | "busy";

export interface ProfileSettings {
  displayName: string;
  englishName: string;
  roleTitle: string;
  shortInitials: string;
  avatarUrl: string;
  avatarShape: AvatarShape;
  avatarFrame: AvatarFrame;
  availability: AvailabilityStatus;
  availabilityLabel: string;
}

export interface AppearanceSettings {
  theme: ThemePresetId;
  customAccent: string;
  fontSize: FontScale;
  borderRadius: RadiusStyle;
  surfaceStyle: SurfaceStyle;
  density: LayoutDensity;
  sidebarCompact: boolean;
  showBlueprint: boolean;
  showDate: boolean;
  showStats: boolean;
  showQuickCvCard: boolean;
  showQuickOmCard: boolean;
  reduceMotion: boolean;
}

export type NavPosition = "right" | "left" | "top";

export interface WorkspacePreferences {
  defaultTab: MainTabId;
  hiddenTabs: MainTabId[];
  customDisciplines: string[];
  /** Custom order of the main nav tabs (all MainTabId values should be present). */
  navOrder: MainTabId[];
  /** Per-tab icon override (icon name from the nav icon registry). */
  navIcons: Partial<Record<MainTabId, string>>;
  /** Layout position of the navigation rail/bar. */
  navPosition: NavPosition;
}

export interface DashboardSettings {
  dashboardName: string;
  dashboardSubtitle: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  brandIcon: BrandIconId;
  customBrandLogo: string;
  profile: ProfileSettings;
  appearance: AppearanceSettings;
  workspace: WorkspacePreferences;
}

export interface CvExperience {
  id: string;
  company: string;
  companyAr: string;
  role: string;
  location: string;
  period: string;
  current?: boolean;
  highlights: string[];
}

export interface CvSkill {
  id: string;
  name: string;
  category: "CAD / BIM" | "إشراف MEP" | "التشغيل والصيانة" | "برامج مساعدة";
  level: number; // 0 - 100
}

export interface CvProjectEntry {
  id: string;
  nameAr: string;
  nameEn: string;
  client: string;
  location: string;
  discipline: string;
  scope: string;
  subLocations?: string[];
}

export interface CvEducation {
  id: string;
  institutionAr: string;
  institutionEn: string;
  year: string;
  grade: string;
  major: string;
}

export interface CvCertification {
  id: string;
  title: string;
  issuer: string;
  year: string;
  category: string;
}

export interface CvProfileData {
  fullNameAr: string;
  fullNameEn: string;
  jobTitleAr: string;
  jobTitleEn: string;
  objectiveAr: string;
  objectiveEn: string;
  email: string;
  phone: string;
  location: string;
  nationality: string;
  maritalStatus: string;
  yearsExperience: string;
  responsibilities: string[];
  experiences: CvExperience[];
  skills: CvSkill[];
  cvProjects: CvProjectEntry[];
  education: CvEducation[];
  certifications: CvCertification[];
  customPdfName?: string;
  hasCustomPdf?: boolean;
}

export interface ProjectItem {
  id: string;
  name: string;
  nameEn?: string;
  client?: string;
  city: string;
  type: string;
  discipline?: string;
  progress: number;
  art: number;
  notes?: string;
  updatedAt?: number;
}

export interface LibraryFileItem {
  id: string;
  name: string;
  cat: string;
  project: string;
  size: number;
  date: number;
  art?: number;
  isBuiltinCv?: boolean;
}

export type OmSystemType =
  | "كهرباء (Electrical)"
  | "ميكانيكا وتكييف (HVAC / Mechanical)"
  | "سباكة ومكافحة حريق (Plumbing & FF)"
  | "شبكات واتصالات (ELV & Network)";

export type OmWorkType =
  | "تشغيل وصيانة وقائية (PM)"
  | "صيانة تصحيحية (CM)"
  | "إشراف تنفيذ (Execution)"
  | "فحص واستلام (Inspection)";

export type OmPriority = "عاجل" | "مرتفع" | "متوسط" | "منخفض";
export type OmStatus = "جاري التنفيذ" | "مجدول" | "بانتظار الاعتماد" | "مكتمل";

export interface OmWorkOrder {
  id: string;
  code: string;
  title: string;
  system: OmSystemType;
  workType: OmWorkType;
  site: string;
  priority: OmPriority;
  status: OmStatus;
  maximoRef?: string;
  dueDate: string;
  notes: string;
}

export type SyncProvider = "local" | "github-gist" | "supabase";
export type SyncState = "idle" | "syncing" | "synced" | "dirty" | "error";

export interface SyncConfig {
  provider: SyncProvider;
  autoSync: boolean;
  githubToken: string;
  githubGistId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseSyncKey: string;
  lastSyncedAt: number | null;
  lastSyncDirection: "push" | "pull" | "tab" | null;
}

export interface MhmedSyncSnapshot {
  schemaVersion: 2;
  appName: string;
  updatedAt: number;
  deviceId: string;
  settings: DashboardSettings;
  cv: CvProfileData;
  projects: ProjectItem[];
  workOrders: OmWorkOrder[];
}
