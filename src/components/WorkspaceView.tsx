import React, { useRef, useState } from "react";
import {
  Check,
  Download,
  ExternalLink,
  Link2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { QuickLink, WorkspaceTask } from "../types/dashboard";
import { formatDateArabic } from "../utils/date";
import { Badge, Button, EmptyState, SectionLabel, Stepper, Tabs, Toggle, TooltipBubble } from "./UI";

interface WorkspaceViewProps {
  tasks: WorkspaceTask[];
  links: QuickLink[];
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onAddTask: (task: Omit<WorkspaceTask, "id" | "createdAt" | "done">) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onAddLink: (link: Omit<QuickLink, "id">) => void;
  onDeleteLink: (id: string) => void;
  onImportData: (data: { tasks: WorkspaceTask[]; links: QuickLink[] }) => void;
  onNotify: (msg: string) => void;
}

const CATEGORY_LABELS: Record<WorkspaceTask["category"], string> = {
  deploy: "نشر",
  feature: "ميزة",
  bug: "إصلاح",
  docs: "توثيق",
};

const PRIORITY_LABELS: Record<WorkspaceTask["priority"], string> = {
  high: "عالية",
  medium: "متوسطة",
  low: "عادية",
};

const PRIORITY_COLORS: Record<WorkspaceTask["priority"], string> = {
  high: "var(--pink)",
  medium: "var(--salmon)",
  low: "var(--faint)",
};

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  tasks,
  links,
  darkMode,
  onToggleDarkMode,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onAddLink,
  onDeleteLink,
  onImportData,
  onNotify,
}) => {
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");
  const [showDone, setShowDone] = useState(true);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<WorkspaceTask["category"]>("feature");
  const [priority, setPriority] = useState<WorkspaceTask["priority"]>("medium");
  const [dueDate, setDueDate] = useState("");

  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkNote, setLinkNote] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  const completed = tasks.filter((t) => t.done).length;
  const visibleTasks = tasks.filter((t) => {
    if (!showDone && t.done) return false;
    if (filter === "active") return !t.done;
    if (filter === "done") return t.done;
    return true;
  });

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask({ title: title.trim(), category, priority, dueDate: dueDate || undefined });
    setTitle("");
    setDueDate("");
    onNotify("تمت إضافة المهمة بنجاح");
  };

  const addLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkLabel.trim() || !linkUrl.trim()) return;
    const normalized = linkUrl.trim().startsWith("http") ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    onAddLink({ label: linkLabel.trim(), url: normalized, note: linkNote.trim() || "رابط سريع" });
    setLinkLabel("");
    setLinkUrl("");
    setLinkNote("");
    onNotify("تم حفظ الرابط السريع");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ tasks, links, exportedAt: new Date().toISOString() }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gitdash-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify("تم تنزيل النسخة الاحتياطية JSON");
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed.tasks) && Array.isArray(parsed.links)) {
          onImportData({ tasks: parsed.tasks, links: parsed.links });
          onNotify("تم استيراد البيانات بنجاح");
        } else onNotify("صيغة الملف غير صالحة");
      } catch {
        onNotify("تعذر قراءة ملف JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow mb-1">Workspace · local storage</div>
          <h1 className="font-display text-xl font-bold text-[var(--ink)] sm:text-2xl">مساحة العمل</h1>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            مهامك وروابطك محفوظة في متصفحك — جاهزة للعمل على GitHub Pages بدون قاعدة بيانات.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="ghost" onClick={exportData} className="!py-1.5 !text-[10px]" icon={<Download className="h-3.5 w-3.5" />}>
            تصدير JSON
          </Button>
          <Button variant="primary" onClick={() => fileRef.current?.click()} className="!py-1.5 !text-[10px]" icon={<Upload className="h-3.5 w-3.5" />}>
            استيراد
          </Button>
          <input ref={fileRef} type="file" accept="application/json" onChange={importData} className="hidden" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7 xl:col-span-8">
          <div className="panel p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <SectionLabel>Task manager · inputs</SectionLabel>
                <h2 className="text-sm font-bold text-[var(--ink)]">قائمة المهام</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="chip chip-salmon !text-[10px]">
                  {completed}/{tasks.length} مكتمل
                </span>
                <Toggle checked={showDone} onChange={setShowDone} label="المكتملة" size="sm" />
              </div>
            </div>

            <div className="mb-3">
              <Tabs
                active={filter}
                onChange={(id) => setFilter(id as "all" | "active" | "done")}
                items={[
                  { id: "all", label: "الكل", count: tasks.length },
                  { id: "active", label: "قيد التنفيذ", count: tasks.length - completed },
                  { id: "done", label: "المكتملة", count: completed },
                ]}
              />
            </div>

            <form onSubmit={addTask} className="panel-inset mb-4 rounded-xl p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="أضف مهمة جديدة..."
                  className="field sm:col-span-6"
                />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="field font-mono sm:col-span-2"
                  aria-label="تاريخ الاستحقاق"
                />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as WorkspaceTask["category"])}
                  className="field sm:col-span-2"
                >
                  <option value="feature">ميزة</option>
                  <option value="deploy">نشر</option>
                  <option value="bug">إصلاح</option>
                  <option value="docs">توثيق</option>
                </select>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as WorkspaceTask["priority"])}
                  className="field sm:col-span-1"
                >
                  <option value="high">عالية</option>
                  <option value="medium">متوسطة</option>
                  <option value="low">عادية</option>
                </select>
                <Button type="submit" variant="primary" className="sm:col-span-1 !px-2" aria-label="إضافة">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              {visibleTasks.length === 0 ? (
                <EmptyState title="لا توجد مهام في هذا العرض" text="جرّب تغيير التصفية أو أضف مهمة جديدة من النموذج بالأعلى." />
              ) : (
                visibleTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`panel-inset flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition ${
                      task.done ? "opacity-60" : "hover:border-[rgba(255,91,158,.26)]"
                    }`}
                  >
                    <button type="button" onClick={() => onToggleTask(task.id)} aria-label="تبديل حالة المهمة">
                      {task.done ? (
                        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-[linear-gradient(180deg,#f5b2a3,#e99a87)] text-[var(--salmon-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,.5)]">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="block h-[18px] w-[18px] rounded-[5px] border border-[var(--line-strong)] bg-[var(--inset)] shadow-[inset_0_1px_2px_var(--shadow-dark)]" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-[11px] ${task.done ? "line-through" : "font-medium text-[var(--ink)]"}`}>
                        {task.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[9px] text-[var(--faint)]">
                        <span className="chip !py-0 !text-[8px]">{CATEGORY_LABELS[task.category]}</span>
                        {task.dueDate && <span className="font-mono">{formatDateArabic(task.dueDate)}</span>}
                      </div>
                    </div>

                    <span
                      className="hidden items-center gap-1 text-[9px] font-medium sm:inline-flex"
                      style={{ color: PRIORITY_COLORS[task.priority] }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY_COLORS[task.priority] }} />
                      {PRIORITY_LABELS[task.priority]}
                    </span>

                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      className="rounded-md p-1 text-[var(--faint)] transition hover:bg-[rgba(239,143,143,.12)] hover:text-[var(--danger)]"
                      aria-label="حذف المهمة"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel p-4 sm:p-5">
            <SectionLabel action={<TooltipBubble>Small info bubble</TooltipBubble>}>Progress · stepper</SectionLabel>
            <h3 className="mb-3 text-sm font-bold text-[var(--ink)]">تقدم المشروع</h3>
            <Stepper
              steps={["تخطيط", "قيد العمل", "مراجعة", "نشر"]}
              current={tasks.length === 0 ? 0 : completed === tasks.length ? 3 : 2}
            />
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["المهام الكلية", tasks.length],
                ["المكتملة", completed],
                ["المتبقية", tasks.length - completed],
              ].map(([label, val]) => (
                <div key={String(label)} className="panel-inset rounded-lg px-2 py-1.5 text-center">
                  <div className="font-display text-base font-bold text-[var(--ink)] tabular">{val}</div>
                  <div className="text-[9px] text-[var(--faint)]">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-4 lg:col-span-5 xl:col-span-4">
          <div className="panel p-4">
            <SectionLabel action={<span className="chip !text-[9px]">{links.length} saved</span>}>Quick links</SectionLabel>
            <h3 className="text-sm font-bold text-[var(--ink)]">روابط سريعة</h3>

            <form onSubmit={addLink} className="mt-2.5 space-y-2">
              <input
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                placeholder="اسم الرابط"
                className="field"
              />
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://github.com/..."
                dir="ltr"
                className="field font-mono"
              />
              <div className="flex gap-2">
                <input
                  value={linkNote}
                  onChange={(e) => setLinkNote(e.target.value)}
                  placeholder="ملاحظة قصيرة"
                  className="field"
                />
                <Button type="submit" variant="primary" className="shrink-0 !px-3" aria-label="حفظ الرابط">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </form>

            <div className="mt-3 space-y-2">
              {links.map((link) => (
                <div key={link.id} className="panel-inset flex items-center gap-2 rounded-xl p-2">
                  <a href={link.url} target="_blank" rel="noreferrer" className="group flex min-w-0 flex-1 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--pink-soft)] text-[var(--pink)]">
                      <Link2 className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 truncate text-[11px] font-semibold text-[var(--ink)] group-hover:text-[var(--salmon)]">
                        {link.label}
                        <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-50" />
                      </span>
                      <span className="block truncate text-[9px] text-[var(--faint)]">{link.note}</span>
                    </span>
                  </a>
                  <button
                    type="button"
                    onClick={() => onDeleteLink(link.id)}
                    className="rounded-md p-1 text-[var(--faint)] transition hover:text-[var(--danger)]"
                    aria-label="حذف الرابط"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-4">
            <SectionLabel>Settings · toggles</SectionLabel>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold text-[var(--ink)]">الوضع الزيتوني الداكن</div>
                  <div className="text-[9px] text-[var(--faint)]">تبديل لوحة الألوان الكاملة</div>
                </div>
                <Toggle checked={darkMode} onChange={onToggleDarkMode} />
              </div>
              <div className="divider-soft" />
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold text-[var(--ink)]">إظهار المكتملة</div>
                  <div className="text-[9px] text-[var(--faint)]">عرض المهام المنجزة في القائمة</div>
                </div>
                <Toggle checked={showDone} onChange={setShowDone} />
              </div>
            </div>

            <div className="divider-soft my-3" />
            <div className="flex items-center justify-between gap-1">
              <Badge tone="success" count={<Check className="h-3 w-3" />} label="Saved" />
              <Badge tone="info" count={1} label="Local" />
              <Badge tone="warning" count="!" label="Notice" />
              <Badge tone="pink" count={3} label="Glow" />
            </div>

            <div className="mt-3 rounded-lg border border-[rgba(240,164,147,.25)] bg-[rgba(240,164,147,.08)] px-2.5 py-2 text-[10px] leading-relaxed text-[var(--muted)]">
              نصيحة: استخدم تصدير JSON قبل تغيير المتصفح أو جهازك حتى لا تفقد مهامك.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
