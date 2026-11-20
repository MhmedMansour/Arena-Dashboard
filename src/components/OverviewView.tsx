import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Circle,
  Copy,
  ExternalLink,
  FolderGit2,
  GitCommitHorizontal,
  MapPin,
  Plus,
  Sparkles,
  Star,
  Users,
  GitFork,
  Clock,
} from "lucide-react";
import { LANGUAGE_COLORS } from "../data/fallbackData";
import {
  computeActivitySeries,
  computeLanguageStats,
  formatCompactNumber,
  formatRelativeArabic,
} from "../services/githubApi";
import { DataSourceMode, GitHubEvent, GitHubRepo, GitHubUser, WorkspaceTask } from "../types/dashboard";
import { formatDateArabic } from "../utils/date";
import { CalendarCard } from "./CalendarCard";
import { ActivityAreaChart, LanguageBreakdown, MiniSparkline } from "./Charts";
import { Badge, Button, GitHubMark, Notice, SectionLabel, TooltipBubble } from "./UI";

interface OverviewViewProps {
  user: GitHubUser;
  repos: GitHubRepo[];
  events: GitHubEvent[];
  source: DataSourceMode;
  errorNote?: string;
  tasks: WorkspaceTask[];
  selectedDate: string;
  lastSync: number;
  onSelectDate: (date: string) => void;
  onToggleTask: (id: string) => void;
  onViewAllRepos: () => void;
  onOpenWorkspace: () => void;
  onOpenCalendar: () => void;
  onAddTask: () => void;
  onNotify: (msg: string) => void;
}

const PRIORITY_DOT: Record<WorkspaceTask["priority"], string> = {
  high: "var(--pink)",
  medium: "var(--salmon)",
  low: "var(--faint)",
};

export const OverviewView: React.FC<OverviewViewProps> = ({
  user,
  repos,
  events,
  source,
  errorNote,
  tasks,
  selectedDate,
  lastSync,
  onSelectDate,
  onToggleTask,
  onViewAllRepos,
  onOpenWorkspace,
  onOpenCalendar,
  onAddTask,
  onNotify,
}) => {
  const [dismissedNotice, setDismissedNotice] = useState(false);
  const [sampleToggle, setSampleToggle] = useState(true);
  const [sampleTab, setSampleTab] = useState("active");

  const totalStars = repos.reduce((a, r) => a + r.stargazers_count, 0);
  const totalForks = repos.reduce((a, r) => a + r.forks_count, 0);
  const languages = computeLanguageStats(repos);
  const activity = computeActivitySeries(events, repos, source);
  const topRepos = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 5);
  const pending = useMemo(
    () => [...tasks].sort((a, b) => Number(a.done) - Number(b.done)).slice(0, 4),
    [tasks]
  );
  const doneCount = tasks.filter((t) => t.done).length;
  const progressStep = tasks.length === 0 ? 0 : doneCount === tasks.length ? 2 : doneCount > 0 ? 1 : 0;
  const dueToday = tasks.filter((t) => t.dueDate === selectedDate).length;

  const kpis = [
    {
      label: "إجمالي النجوم",
      en: "Total stars",
      value: formatCompactNumber(totalStars),
      delta: "+12.4%",
      color: "var(--salmon)",
      icon: <Star className="h-4 w-4" />,
      spark: [4, 7, 5, 9, 8, 12, 11, 15],
      positive: true,
    },
    {
      label: "النسخ (Forks)",
      en: "Repository forks",
      value: formatCompactNumber(totalForks),
      delta: "+5.1%",
      color: "var(--pink)",
      icon: <GitFork className="h-4 w-4" />,
      spark: [3, 4, 3, 6, 5, 7, 9, 8],
      positive: true,
    },
    {
      label: "المستودعات العامة",
      en: "Public repos",
      value: String(user.public_repos),
      delta: "gists " + user.public_gists,
      color: "#8fc0a9",
      icon: <FolderGit2 className="h-4 w-4" />,
      spark: [6, 6, 7, 8, 8, 9, 10, 11],
      positive: true,
    },
    {
      label: "المتابعون",
      en: "Followers",
      value: formatCompactNumber(user.followers),
      delta: `+${formatCompactNumber(Math.max(1, Math.round(user.followers * 0.02)))}`,
      color: "#e9c98d",
      icon: <Users className="h-4 w-4" />,
      spark: [5, 6, 8, 7, 9, 10, 9, 12],
      positive: true,
    },
  ];

  const eventLabel = (ev: GitHubEvent) => {
    switch (ev.type) {
      case "PushEvent":
        return "دفع تعديلات";
      case "PullRequestEvent":
        return "طلب دمج";
      case "IssuesEvent":
        return "بلاغ مشكلة";
      case "WatchEvent":
        return "نجمة جديدة";
      case "ForkEvent":
        return "نسخ مستودع";
      case "CreateEvent":
        return "إنشاء فرع";
      case "ReleaseEvent":
        return "إصدار جديد";
      case "MemberEvent":
        return "انضمام عضو";
      case "PublicEvent":
        return "مستودع عام";
      case "DeleteEvent":
        return "حذف فرع/وسم";
      case "IssueCommentEvent":
        return "تعليق على بلاغ";
      case "CommitCommentEvent":
        return "تعليق على تعديل";
      case "GollumEvent":
        return "تحديث التوثيق";
      default:
        return "نشاط عام";
    }
  };

  const copyUsername = async () => {
    try {
      await navigator.clipboard.writeText(user.login);
      onNotify(`تم نسخ @${user.login}`);
    } catch {
      onNotify("تعذر النسخ التلقائي");
    }
  };

  return (
    <div className="space-y-5">
      {errorNote && !dismissedNotice && (
        <Notice
          tone="info"
          title="ملاحظة على مصدر البيانات"
          text={errorNote}
          onClose={() => setDismissedNotice(true)}
        />
      )}

      {/* Page heading */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow mb-1">Overview · system home</div>
          <h1 className="font-display text-xl font-bold leading-tight text-[var(--ink)] sm:text-2xl">
            لوحة التحكم الرئيسية
          </h1>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-[var(--muted)]">
            كل ما تحتاجه لمتابعة حسابك على GitHub، مهامك اليومية، وتقويم الإصدارات في مكان واحد.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip chip-salmon">
            <Sparkles className="h-3 w-3" />
            System OS v2.4
          </span>
          <span className="chip">آخر مزامنة: {formatRelativeArabic(new Date(lastSync).toISOString())}</span>
        </div>
      </div>

      {/* Hero + mini calendar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="panel h-full overflow-hidden p-4 sm:p-5">
            <div
              className="pointer-events-none absolute -left-24 -top-32 h-72 w-72 rounded-full opacity-70 blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(246,178,160,.34), transparent 68%)" }}
            />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="eyebrow">Typography hierarchy</div>
                  <h2 className="mt-1 font-display text-2xl font-bold leading-tight text-[var(--ink)] sm:text-[30px]">
                    H1: System <span className="text-[var(--salmon)]">Dash</span>
                  </h2>
                  <div className="mt-0.5 font-display text-sm text-[var(--muted)] sm:text-base">
                    H2: {user.name || user.login}
                  </div>
                  <p className="text-[11px] text-[var(--faint)]">Body: Default text — حساب GitHub حقيقي وبيانات محدثة</p>
                </div>
                <div className="panel-inset flex items-center gap-2 rounded-xl px-2.5 py-1.5">
                  <GitHubMark className="h-3.5 w-3.5 text-[var(--salmon)]" />
                  <span className="font-mono text-[10px] text-[var(--muted)]">@{user.login}</span>
                  <button
                    type="button"
                    onClick={copyUsername}
                    className="text-[var(--faint)] transition hover:text-[var(--pink)]"
                    aria-label="نسخ اسم المستخدم"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3">
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-[var(--line-strong)] sm:h-14 sm:w-14"
                />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-[var(--muted)]">
                    {user.bio || "لا يوجد وصف على حساب GitHub. أضف نبذة قصيرة لتظهر هنا."}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {user.location && (
                      <span className="chip !py-1 !text-[10px]">
                        <MapPin className="h-3 w-3" /> {user.location}
                      </span>
                    )}
                    <span className="chip !py-1 !text-[10px]">
                      <Users className="h-3 w-3" /> {formatCompactNumber(user.followers)} متابع
                    </span>
                    <span className="chip !py-1 !text-[10px]">
                      <FolderGit2 className="h-3 w-3" /> {user.public_repos} مستودع
                    </span>
                  </div>
                </div>
                <div className="mr-auto hidden shrink-0 sm:flex sm:flex-col sm:gap-1.5">
                  <a
                    href={user.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary !py-2"
                  >
                    <GitHubMark className="h-3.5 w-3.5" />
                    فتح الحساب
                  </a>
                  <button type="button" onClick={onOpenCalendar} className="btn btn-secondary !py-2">
                    <Clock className="h-3.5 w-3.5" />
                    التقويم
                  </button>
                </div>
              </div>

              <div className="mt-3 flex gap-1.5 sm:hidden">
                <a href={user.html_url} target="_blank" rel="noreferrer" className="btn btn-primary flex-1 !py-1.5 !text-[10px]">
                  <GitHubMark className="h-3 w-3" /> فتح الحساب
                </a>
                <button type="button" onClick={onOpenCalendar} className="btn btn-secondary flex-1 !py-1.5 !text-[10px]">
                  التقويم
                </button>
              </div>

              <div className="divider-soft my-3.5" />

              <div className="grid grid-cols-3 gap-2">
                {kpis.slice(0, 3).map((kpi) => (
                  <div key={kpi.label} className="panel-inset rounded-xl px-2.5 py-2">
                    <div className="eyebrow !text-[8px] !tracking-[0.1em]">{kpi.en}</div>
                    <div className="mt-0.5 font-display text-base font-bold text-[var(--ink)] tabular">{kpi.value}</div>
                  </div>
                ))}
              </div>

              <div className="divider-soft my-3.5" />

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="sample-tile">
                  <div className="eyebrow !text-[8px] mb-1.5">Buttons</div>
                  <div className="flex flex-col gap-1.5">
                    <button type="button" onClick={onAddTask} className="btn btn-primary !py-1.5 !text-[10px]">
                      Primary
                    </button>
                    <button type="button" onClick={onOpenWorkspace} className="btn btn-secondary !py-1.5 !text-[10px]">
                      Secondary
                    </button>
                    <button type="button" disabled className="btn btn-ghost !py-1.5 !text-[10px]">
                      Disabled
                    </button>
                  </div>
                </div>

                <div className="sample-tile">
                  <div className="eyebrow !text-[8px] mb-1.5">Toggle + Tabs</div>
                  <div className="panel-inset flex items-center justify-between rounded-lg px-2 py-1.5">
                    <span className="font-mono text-[9px] text-[var(--muted)]">{sampleToggle ? "On" : "Off"}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={sampleToggle}
                      onClick={() => setSampleToggle((v) => !v)}
                      className={`relative h-5 w-9 rounded-full border transition ${
                        sampleToggle ? "border-white/20" : "border-[var(--line)] bg-[var(--inset)]"
                      }`}
                      style={
                        sampleToggle
                          ? {
                              background: "linear-gradient(180deg,#f4ae9e,#e89a87)",
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,.5), 0 0 12px -3px rgba(240,164,147,.7)",
                            }
                          : undefined
                      }
                    >
                      <span
                        className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-all ${
                          sampleToggle ? "right-0.5 bg-[#3d2820]" : "right-[calc(100%-1rem)] bg-[var(--faint)]"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="panel-inset mt-1.5 flex items-center gap-0.5 rounded-lg p-0.5">
                    {[
                      ["active", "Active"],
                      ["inactive", "Inactive"],
                      ["disabled", "Disabled"],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSampleTab(id)}
                        className={`flex-1 rounded-md px-1 py-1 text-[8.5px] font-semibold transition ${
                          sampleTab === id
                            ? "bg-[linear-gradient(180deg,#f6b4a5,#e99a87)] text-[var(--salmon-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,.5)]"
                            : "text-[var(--faint)] hover:text-[var(--ink)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sample-tile">
                  <div className="eyebrow !text-[8px] mb-1.5">Chips + Tooltip</div>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="chip chip-salmon !py-0.5 !text-[9px]">Filter ×</span>
                    <span className="chip chip-teal !py-0.5 !text-[9px]">Action ×</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span className="chip !py-0.5 !text-[9px] text-[var(--faint)]">Action</span>
                    <TooltipBubble>Small info bubble</TooltipBubble>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <Badge tone="success" count={<Check className="h-3 w-3" />} />
                    <Badge tone="pink" count={3} />
                    <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: "var(--success)" }} />
                    <span className="font-mono text-[8px] text-[var(--faint)]">status · ready</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="eyebrow !text-[8px] ml-1">Tokens</span>
                  {[
                    ["bg", "#333c31"],
                    ["panel", "#3b4538"],
                    ["salmon", "#f0a494"],
                    ["pink", "#ff5b9e"],
                    ["teal", "#2f514a"],
                  ].map(([name, color]) => (
                    <span key={name} className="chip !gap-1 !py-0.5 !text-[9px] font-mono">
                      <span className="h-2 w-2 rounded-sm ring-1 ring-white/15" style={{ background: color }} />
                      {name}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onOpenWorkspace}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--salmon)] hover:text-[var(--ink)]"
                >
                  مساحة العمل
                  <ArrowLeft className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="mb-1.5 px-0.5">
            <SectionLabel>Date picker mini</SectionLabel>
          </div>
          <CalendarCard selectedDate={selectedDate} onSelectDate={onSelectDate} tasks={tasks} onAddTask={onOpenCalendar} />
          <p className="mt-1.5 px-1 text-center text-[10px] text-[var(--faint)]">
            {dueToday > 0 ? `${dueToday} مهمة مستحقة في هذا اليوم` : `${formatDateArabic(selectedDate)} · لا مهام`}
          </p>

          <div className="panel mt-2 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="eyebrow !mb-0">Upcoming · next</span>
              <button
                type="button"
                onClick={onOpenCalendar}
                className="text-[9px] font-semibold text-[var(--salmon)] hover:text-[var(--ink)]"
              >
                التقويم
              </button>
            </div>
            <div className="space-y-1.5">
              {pending
                .filter((t) => !t.done)
                .slice(0, 3)
                .map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => {
                      if (task.dueDate) onSelectDate(task.dueDate);
                      onOpenCalendar();
                    }}
                    className="panel-inset flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-right transition hover:border-[rgba(255,91,158,.3)]"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: PRIORITY_DOT[task.priority], boxShadow: `0 0 6px ${PRIORITY_DOT[task.priority]}` }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[10px] text-[var(--ink)]">{task.title}</span>
                    <span className="shrink-0 font-mono text-[8px] text-[var(--faint)]">
                      {task.dueDate ? task.dueDate.slice(5) : "--"}
                    </span>
                  </button>
                ))}
              {pending.filter((t) => !t.done).length === 0 && (
                <p className="py-2 text-center text-[10px] text-[var(--faint)]">كل المهام مكتملة 🎉</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="panel p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="eyebrow !text-[8px]">{kpi.en}</div>
                <div className="mt-0.5 text-[11px] font-medium text-[var(--muted)]">{kpi.label}</div>
              </div>
              <span
                className="panel-inset flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ color: kpi.color }}
              >
                {kpi.icon}
              </span>
            </div>
            <div className="mt-2.5 flex items-end justify-between gap-1">
              <span className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] tabular">{kpi.value}</span>
              <MiniSparkline values={kpi.spark} color={kpi.color} />
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className="rounded-md px-1.5 py-0.5 font-mono text-[9px] font-semibold"
                style={{ background: "var(--success-bg)", color: "var(--success)" }}
              >
                {kpi.delta}
              </span>
              <span className="text-[9px] text-[var(--faint)]">مقارنة بالأسبوع الماضي</span>
            </div>
          </div>
        ))}
      </div>

      {/* Activity + tasks */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ActivityAreaChart data={activity} />
        </div>

        <div className="space-y-4 lg:col-span-5">
          <div className="panel p-4 sm:p-5">
            <SectionLabel
              action={
                <button
                  type="button"
                  onClick={onOpenWorkspace}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--salmon)] hover:text-[var(--ink)]"
                >
                  عرض الكل
                  <ArrowLeft className="h-3 w-3" />
                </button>
              }
            >
              Workspace · tasks
            </SectionLabel>

            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[var(--ink)]">مهام اليوم</h3>
              <span className="chip chip-teal !py-0.5 !text-[9px]">
                {doneCount}/{tasks.length} مكتمل
              </span>
            </div>

            <div className="mb-3.5 flex gap-1.5">
              {["مخطط", "قيد العمل", "مكتمل"].map((step, i) => (
                <div key={step} className="flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--inset)] shadow-[inset_0_1px_2px_var(--shadow-dark)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: i <= progressStep ? "100%" : "0%",
                        background: "linear-gradient(90deg,#f7bcae,#ec9c89)",
                        boxShadow: "0 0 8px rgba(240,164,147,.5)",
                      }}
                    />
                  </div>
                  <div className={`mt-1 text-[9px] ${i <= progressStep ? "font-semibold text-[var(--ink)]" : "text-[var(--faint)]"}`}>
                    {step}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {pending.map((task) => (
                <div
                  key={task.id}
                  className="panel-inset group flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition hover:border-[rgba(255,91,158,.25)]"
                >
                  <button
                    type="button"
                    onClick={() => onToggleTask(task.id)}
                    className="shrink-0 transition"
                    aria-label="تبديل حالة المهمة"
                  >
                    {task.done ? (
                      <span className="flex h-4 w-4 items-center justify-center rounded-[5px] bg-[linear-gradient(180deg,#f5b2a3,#e99a87)] text-[var(--salmon-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,.5)]">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    ) : (
                      <Circle className="h-4 w-4 text-[var(--faint)] transition group-hover:text-[var(--salmon)]" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-[11px] ${task.done ? "text-[var(--faint)] line-through" : "font-medium text-[var(--ink)]"}`}>
                      {task.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[9px] text-[var(--faint)]">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY_DOT[task.priority] }} />
                        {task.category}
                      </span>
                      {task.dueDate && <span className="font-mono">{task.dueDate.slice(5)}</span>}
                    </div>
                  </div>
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: PRIORITY_DOT[task.priority], boxShadow: `0 0 6px ${PRIORITY_DOT[task.priority]}` }}
                  />
                </div>
              ))}
              {pending.length === 0 && (
                <p className="py-6 text-center text-[11px] text-[var(--faint)]">لا توجد مهام حالياً — أضف أول مهمة من مساحة العمل.</p>
              )}
            </div>

            <button
              type="button"
              onClick={onAddTask}
              className="btn btn-primary mt-3 w-full !py-2 !text-[11px]"
            >
              <Plus className="h-3.5 w-3.5" />
              إضافة مهمة جديدة
            </button>
          </div>

          {!dismissedNotice ? (
            <Notice
              title="Toast message"
              text={
                source === "live"
                  ? "تم الاتصال بـ GitHub API وتحديث بيانات الحساب بنجاح."
                  : source === "cached"
                    ? "يتم عرض نسخة مخزنة محلياً من بيانات GitHub."
                    : "يتم عرض بيانات تجريبية — اكتب اسم المستخدم لجلب بياناتك."
              }
              tone={source === "demo" ? "info" : "success"}
              onClose={() => setDismissedNotice(true)}
            />
          ) : (
            <div className="panel flex items-center justify-between gap-2 p-3">
              <span className="eyebrow !mb-0">Notifications dismissed</span>
              <Button variant="ghost" onClick={() => setDismissedNotice(false)} className="!px-2 !py-1 !text-[10px]">
                إظهار
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Repos table + language + status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="panel p-4 sm:p-5 lg:col-span-7">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <SectionLabel>Table row · repositories</SectionLabel>
              <h3 className="text-sm font-bold text-[var(--ink)]">أحدث المستودعات</h3>
            </div>
            <Button variant="ghost" onClick={onViewAllRepos} className="!px-2.5 !py-1.5 !text-[10px]">
              عرض الكل
              <ArrowLeft className="h-3 w-3" />
            </Button>
          </div>

          <div className="panel-inset overflow-hidden rounded-xl">
            <div className="table-head grid grid-cols-12 items-center gap-2 px-3 py-2">
              <span className="col-span-5">Name / المستودع</span>
              <span className="col-span-2 hidden sm:block">Language</span>
              <span className="col-span-2 text-center">Stars</span>
              <span className="col-span-2 whitespace-nowrap">Updated</span>
              <span className="col-span-1 hidden text-left sm:block" />
            </div>

            <div className="divide-y divide-[var(--line)]">
              {topRepos.map((repo) => (
                <div
                  key={repo.id}
                  className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 transition hover:bg-[color-mix(in_srgb,var(--panel-raised)_55%,transparent)]"
                >
                  <div className="col-span-5 min-w-0">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate font-mono text-[11px] font-semibold text-[var(--ink)] hover:text-[var(--salmon)]"
                    >
                      {repo.name}
                    </a>
                    <div className="truncate text-[9px] text-[var(--faint)]">
                      {repo.description || "بدون وصف"}
                    </div>
                  </div>
                  <div className="col-span-2 hidden min-w-0 items-center gap-1.5 text-[10px] text-[var(--muted)] sm:flex">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: LANGUAGE_COLORS[repo.language || "Other"] || LANGUAGE_COLORS.Other }}
                    />
                    <span className="truncate">{repo.language || "—"}</span>
                  </div>
                  <div className="col-span-2 text-center font-mono text-[10px] font-semibold text-[var(--ink)] tabular">
                    {formatCompactNumber(repo.stargazers_count)}
                  </div>
                  <div className="col-span-2 whitespace-nowrap font-mono text-[9px] text-[var(--faint)]">
                    {formatRelativeArabic(repo.pushed_at)}
                  </div>
                  <div className="col-span-1 hidden justify-end sm:flex">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--line)] text-[var(--faint)] transition hover:border-[rgba(255,91,158,.4)] hover:text-[var(--pink)]"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[9px] text-[var(--faint)]">
              <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: "var(--success)" }} />
              يتم عرض {topRepos.length} من {repos.length} مستودع
            </div>
            <div className="panel-inset flex items-center gap-1 rounded-lg px-1.5 py-1 text-[9px] text-[var(--faint)]">
              <span className="font-mono">1</span>
              <span>/</span>
              <span className="font-mono">{Math.max(1, Math.ceil(repos.length / 5))}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-5">
          <LanguageBreakdown stats={languages} totalRepos={repos.length} />

          <div className="panel p-4">
            <SectionLabel action={<TooltipBubble>Small info bubble</TooltipBubble>}>Badges · status</SectionLabel>
            <div className="flex items-center justify-between gap-1 py-1">
              <Badge tone="danger" count="!" label="Type" />
              <Badge tone="warning" count="!" label="Warning" />
              <Badge tone="success" count={<Check className="h-3 w-3" />} label="Success" />
              <Badge tone="info" count={1} label="Info" />
              <Badge tone="danger" count={2} label="Error" />
              <Badge tone="pink" count={3} label="Glow" />
            </div>
            <div className="divider-soft my-2.5" />
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--muted)]">حالة المزامنة</span>
              <span className="inline-flex items-center gap-1.5 font-mono font-semibold" style={{ color: "var(--success)" }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--success)" }} />
                {source === "live" ? "LIVE" : source === "cached" ? "CACHED" : "DEMO"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent events */}
      <div className="panel p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <SectionLabel>Recent activity</SectionLabel>
            <h3 className="text-sm font-bold text-[var(--ink)]">آخر الأنشطة على GitHub</h3>
          </div>
          <span className="chip !text-[9px]">{events.length} حدث</span>
        </div>

        {events.length === 0 ? (
          <div className="panel-inset flex flex-col items-center justify-center gap-1 rounded-xl py-7 text-center">
            <Sparkles className="h-5 w-5 text-[var(--faint)]" />
            <p className="text-[11px] text-[var(--muted)]">لا توجد أحداث عامة حديثة لهذا الحساب.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {events.slice(0, 4).map((ev) => (
              <div key={ev.id} className="panel-inset rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--pink-soft)] text-[var(--pink)]">
                    <GitCommitHorizontal className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[9px] text-[var(--faint)]">{formatRelativeArabic(ev.created_at)}</span>
                </div>
                <div className="mt-2 text-[11px] font-semibold text-[var(--ink)]">{eventLabel(ev)}</div>
                <div className="mt-0.5 truncate font-mono text-[9px] text-[var(--muted)]">{ev.repo.name}</div>
                {ev.payload?.commits?.[0]?.message && (
                  <div className="mt-1.5 truncate rounded-md bg-[color-mix(in_srgb,var(--bg)_40%,transparent)] px-1.5 py-1 font-mono text-[9px] text-[var(--faint)]">
                    {ev.payload.commits[0].message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
