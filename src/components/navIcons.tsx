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
  Compass,
  Cpu,
  Layers,
  Building2,
  HardHat,
  Zap,
  Home,
  Box,
  ClipboardList,
  FileText,
  Calendar,
  BarChart3,
  List,
  Map,
  Bell,
  BookOpen,
  Briefcase,
  Cog,
  Database,
  Folder,
  Grid,
  Search,
  Star,
  Tag,
  Users,
  Activity,
  Rocket,
  Cloud,
  Key,
  Shield,
  Gauge,
  PieChart,
  Send,
  Boxes,
  Archive,
  Sparkles,
  Code2,
  Bot,
  MessageSquare,
  PanelLeft,
  PanelRight,
  PanelTop,
  Image as ImageIcon,
  FileSpreadsheet,
  Network,
  Globe,
  SlidersHorizontal,
  Target,
  Lightbulb,
  HelpCircle,
  ListTodo,
  FolderTree,
  FileBarChart,
  type LucideIcon,
} from "lucide-react";
import { MainTabId } from "../types/mhmed";

export type NavIconName = string;

interface NavIconDef {
  name: NavIconName;
  label: string;
  icon: LucideIcon;
}

export const NAV_ICON_MAP: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  "folder-kanban": FolderKanban,
  files: Files,
  images: Images,
  wrench: Wrench,
  award: Award,
  "folder-archive": FolderArchive,
  "user-check": UserCheck,
  settings: Settings,
  compass: Compass,
  cpu: Cpu,
  layers: Layers,
  "building-2": Building2,
  "hard-hat": HardHat,
  zap: Zap,
  home: Home,
  box: Box,
  "clipboard-list": ClipboardList,
  "file-text": FileText,
  calendar: Calendar,
  "bar-chart-3": BarChart3,
  list: List,
  map: Map,
  bell: Bell,
  "book-open": BookOpen,
  briefcase: Briefcase,
  cog: Cog,
  database: Database,
  folder: Folder,
  grid: Grid,
  search: Search,
  star: Star,
  tag: Tag,
  tool: Wrench,
  users: Users,
  activity: Activity,
  rocket: Rocket,
  cloud: Cloud,
  key: Key,
  shield: Shield,
  gauge: Gauge,
  "pie-chart": PieChart,
  send: Send,
  boxes: Boxes,
  archive: Archive,
  sparkles: Sparkles,
  "code-2": Code2,
  bot: Bot,
  "message-square": MessageSquare,
  "panel-left": PanelLeft,
  "panel-right": PanelRight,
  "panel-top": PanelTop,
  image: ImageIcon,
  "file-spreadsheet": FileSpreadsheet,
  network: Network,
  globe: Globe,
  "sliders-horizontal": SlidersHorizontal,
  target: Target,
  lightbulb: Lightbulb,
  "help-circle": HelpCircle,
  "list-todo": ListTodo,
  "folder-tree": FolderTree,
  "file-bar-chart": FileBarChart,
};

/** Curated selection shown in the icon picker (kept readable, engineering/dev themed). */
export const NAV_ICON_OPTIONS: NavIconDef[] = [
  { name: "layout-dashboard", label: "لوحة تحكم", icon: LayoutDashboard },
  { name: "calendar", label: "تقويم شهري", icon: Calendar },
  { name: "compass", label: "فرجار هندسي", icon: Compass },
  { name: "wrench", label: "صيانة وميكانيكا", icon: Wrench },
  { name: "zap", label: "كهرباء وطاقة", icon: Zap },
  { name: "cpu", label: "أنظمة ذكية", icon: Cpu },
  { name: "layers", label: "طبقات CAD", icon: Layers },
  { name: "building-2", label: "مبانٍ ومشاريع", icon: Building2 },
  { name: "hard-hat", label: "إشراف موقع", icon: HardHat },
  { name: "folder-kanban", label: "مشاريع", icon: FolderKanban },
  { name: "user-check", label: "سيرة ذاتية", icon: UserCheck },
  { name: "files", label: "ملفات", icon: Files },
  { name: "images", label: "عينات", icon: Images },
  { name: "award", label: "شهادات", icon: Award },
  { name: "folder-archive", label: "أرشيف", icon: FolderArchive },
  { name: "archive", label: "أرشيف مضغوط", icon: Archive },
  { name: "boxes", label: "صناديق أصول", icon: Boxes },
  { name: "settings", label: "إعدادات", icon: Settings },
  { name: "cog", label: "ترس", icon: Cog },
  { name: "sliders-horizontal", label: "ضوابط", icon: SlidersHorizontal },
  { name: "grid", label: "شبكة", icon: Grid },
  { name: "folder", label: "مجلد", icon: Folder },
  { name: "folder-tree", label: "شجرة مجلدات", icon: FolderTree },
  { name: "file-text", label: "مستند", icon: FileText },
  { name: "file-spreadsheet", label: "جدول", icon: FileSpreadsheet },
  { name: "file-bar-chart", label: "تقرير", icon: FileBarChart },
  { name: "list-todo", label: "مهام", icon: ListTodo },
  { name: "clipboard-list", label: "أوامر عمل", icon: ClipboardList },
  { name: "bar-chart-3", label: "إحصائيات", icon: BarChart3 },
  { name: "pie-chart", label: "رسوم بيانية", icon: PieChart },
  { name: "activity", label: "نشاط", icon: Activity },
  { name: "gauge", label: "أداء", icon: Gauge },
  { name: "briefcase", label: "أعمال", icon: Briefcase },
  { name: "users", label: "فريق", icon: Users },
  { name: "target", label: "أهداف", icon: Target },
  { name: "bell", label: "تنبيهات", icon: Bell },
  { name: "star", label: "مميز", icon: Star },
  { name: "tag", label: "وسم", icon: Tag },
  { name: "tool", label: "أداة", icon: Wrench },
  { name: "database", label: "قاعدة بيانات", icon: Database },
  { name: "cloud", label: "سحابة", icon: Cloud },
  { name: "key", label: "مفتاح", icon: Key },
  { name: "shield", label: "حماية", icon: Shield },
  { name: "network", label: "شبكات", icon: Network },
  { name: "globe", label: "عالمي", icon: Globe },
  { name: "map", label: "موقع", icon: Map },
  { name: "home", label: "رئيسي", icon: Home },
  { name: "box", label: "صندوق", icon: Box },
  { name: "image", label: "صورة", icon: ImageIcon },
  { name: "book-open", label: "دليل", icon: BookOpen },
  { name: "help-circle", label: "مساعدة", icon: HelpCircle },
  { name: "lightbulb", label: "فكرة", icon: Lightbulb },
  { name: "sparkles", label: "تمييز", icon: Sparkles },
  { name: "code-2", label: "برمجة", icon: Code2 },
  { name: "rocket", label: "إطلاق", icon: Rocket },
  { name: "send", label: "إرسال", icon: Send },
  { name: "panel-left", label: "شريط يسار", icon: PanelLeft },
  { name: "panel-right", label: "شريط يمين", icon: PanelRight },
  { name: "panel-top", label: "شريط علوي", icon: PanelTop },
];

export const DEFAULT_TAB_ORDER: MainTabId[] = [
  "overview",
  "calendar",
  "cv",
  "projects",
  "om",
  "samples",
  "files",
  "certificates",
  "archive",
  "settings",
];

export const DEFAULT_TAB_LABELS: Record<MainTabId, string> = {
  overview: "نظرة عامة",
  calendar: "التقويم الشهري",
  cv: "السيرة الذاتية والخبرات",
  projects: "المشاريع",
  om: "التشغيل والصيانة",
  samples: "عينات الأعمال",
  files: "مكتبة الملفات",
  certificates: "الشهادات",
  archive: "الأرشيف الذكي",
  settings: "الإعدادات والمزامنة",
};

export const DEFAULT_TAB_ICONS: Record<MainTabId, NavIconName> = {
  overview: "layout-dashboard",
  calendar: "calendar",
  cv: "user-check",
  projects: "folder-kanban",
  om: "wrench",
  samples: "images",
  files: "files",
  certificates: "award",
  archive: "folder-archive",
  settings: "settings",
};

export function resolveNavIcon(name?: string): LucideIcon {
  if (name && NAV_ICON_MAP[name]) return NAV_ICON_MAP[name];
  return LayoutDashboard;
}

export interface ResolvedNavTab {
  id: MainTabId;
  label: string;
  icon: LucideIcon;
  iconName: NavIconName;
}

/**
 * Builds the nav tab list honoring custom order, icon overrides and labels.
 */
export function buildNavTabs(opts?: {
  order?: MainTabId[];
  iconOverrides?: Partial<Record<MainTabId, NavIconName>>;
  labels?: Partial<Record<MainTabId, string>>;
}): ResolvedNavTab[] {
  const requestedOrder = Array.isArray(opts?.order) ? opts.order : DEFAULT_TAB_ORDER;
  const iconOverrides = opts?.iconOverrides ?? {};
  const labels = opts?.labels ?? {};
  // Guarantee every default tab is present (append any missing ones at the end)
  const order = [...new Set(requestedOrder.filter((id) => DEFAULT_TAB_ORDER.includes(id)))];
  for (const id of DEFAULT_TAB_ORDER) {
    if (!order.includes(id)) order.push(id);
  }
  return order.map((id) => {
    const iconName = iconOverrides[id] ?? DEFAULT_TAB_ICONS[id];
    const customLabel = labels[id]?.trim();
    return {
      id,
      label: customLabel ? customLabel : DEFAULT_TAB_LABELS[id],
      icon: resolveNavIcon(iconName),
      iconName,
    };
  });
}
