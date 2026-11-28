import { useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Edit3,
  Eye,
  FolderKanban,
  FileText,
  Plus,
  Trash2,
  Wrench,
  X,
  RotateCcw,
} from "lucide-react";
import {
  CalendarEventCategory,
  CalendarEventItem,
  LibraryFileItem,
  OmPriority,
  OmStatus,
  OmWorkOrder,
  ProjectItem,
} from "../types/mhmed";
import {
  MONTHS_AR,
  MONTHS_EN,
  WEEKDAYS_SHORT_AR,
  buildMonthGrid,
  clampDateToMonth,
  formatDateArabic,
  formatMonthArabic,
  pad2,
  parseMonthKey,
  shiftMonthKey,
  toDateKey,
  toMonthKey,
  todayKey,
  todayMonthKey,
} from "../utils/date";

const EVENT_CATEGORIES: CalendarEventCategory[] = [
  "تسليم مخططات CAD/BIM",
  "تشغيل وصيانة دورية",
  "معاينة واستلام موقع",
  "اجتماع وتنسيق فني",
  "مهمة عامة",
];

const PRIORITIES: OmPriority[] = ["عاجل", "مرتفع", "متوسط", "منخفض"];
const OM_STATUSES: OmStatus[] = [
  "جاري التنفيذ",
  "مجدول",
  "بانتظار الاعتماد",
  "مكتمل",
];

export interface MonthlyCalendarViewProps {
  activeMonth: string; // YYYY-MM
  onChangeMonth: (monthKey: string) => void;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateKey: string) => void;
  events: CalendarEventItem[];
  onChangeEvents: (next: CalendarEventItem[]) => void;
  workOrders: OmWorkOrder[];
  onChangeWorkOrders: (next: OmWorkOrder[]) => void;
  projects: ProjectItem[];
  files: LibraryFileItem[];
  onOpenProject: (projectId: string) => void;
  onPreviewFile: (file: LibraryFileItem) => void;
  onOpenOmTab: () => void;
  onNotify: (msg: string) => void;
}

function getFileDateKey(f: LibraryFileItem): string {
  if (f.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(f.dueDate)) return f.dueDate;
  return toDateKey(new Date(f.date || Date.now()));
}

export function OverviewMonthCalendarCard({
  activeMonth,
  onChangeMonth,
  selectedDate,
  onSelectDate,
  events,
  workOrders,
  projects,
  onOpenCalendar,
}: {
  activeMonth: string;
  onChangeMonth: (monthKey: string) => void;
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  events: CalendarEventItem[];
  workOrders: OmWorkOrder[];
  projects: ProjectItem[];
  onOpenCalendar: () => void;
}) {
  const { year, month } = parseMonthKey(activeMonth);
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const today = todayKey();

  const busyMap = useMemo(() => {
    const map = new Map<string, number>();
    const bump = (d?: string) => {
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        map.set(d, (map.get(d) || 0) + 1);
      }
    };
    events.forEach((e) => bump(e.date));
    workOrders.forEach((w) => bump(w.dueDate));
    projects.forEach((p) => bump(p.targetDate));
    return map;
  }, [events, workOrders, projects]);

  const monthEventCount = events.filter((e) => e.date.startsWith(activeMonth)).length;
  const monthWoCount = workOrders.filter((w) => w.dueDate.startsWith(activeMonth)).length;
  const monthProjCount = projects.filter((p) =>
    (p.targetDate || "").startsWith(activeMonth)
  ).length;

  return (
    <section className="mh-panel mh-quick-card">
      <div className="mh-panel-title" style={{ marginBottom: 10 }}>
        <div>
          <small className="eyebrow">MONTHLY CALENDAR · التقويم المرتبط بالشهر</small>
          <h3>جدول شهر {formatMonthArabic(activeMonth)}</h3>
        </div>
        <div className="mh-btn-row">
          <button
            type="button"
            className="sa-btn-subtle"
            title="الشهر السابق"
            onClick={() => onChangeMonth(shiftMonthKey(activeMonth, -1))}
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            className="sa-btn-subtle"
            title="الشهر التالي"
            onClick={() => onChangeMonth(shiftMonthKey(activeMonth, 1))}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            className="sa-btn-subtle active"
            onClick={onOpenCalendar}
          >
            التقويم الكامل <ChevronLeft size={14} />
          </button>
        </div>
      </div>

      <div className="mh-cal-mini-grid">
        {WEEKDAYS_SHORT_AR.map((w) => (
          <span key={w} className="mh-cal-wd">
            {w}
          </span>
        ))}
        {cells.map((d) => {
          const key = toDateKey(d);
          const inMonth = d.getMonth() === month;
          const isSelected = key === selectedDate;
          const isToday = key === today;
          const count = busyMap.get(key) || 0;
          return (
            <button
              key={key}
              type="button"
              className={`mh-cal-cell mini ${!inMonth ? "outside" : ""} ${
                isSelected ? "selected" : isToday ? "today" : ""
              }`}
              onClick={() => {
                if (!inMonth) {
                  onChangeMonth(toMonthKey(d.getFullYear(), d.getMonth()));
                }
                onSelectDate(key);
              }}
            >
              <span>{d.getDate()}</span>
              {count > 0 && <i className="mh-cal-dot" />}
            </button>
          );
        })}
      </div>

      <div className="mh-badges-row" style={{ marginTop: 10 }}>
        <span className="mh-pill accent">{monthEventCount} مواعيد ومهام</span>
        <span className="mh-pill">{monthWoCount} أوامر O&M</span>
        <span className="mh-pill ok">{monthProjCount} تسليمات مشاريع</span>
      </div>
    </section>
  );
}

export default function MonthlyCalendarView({
  activeMonth,
  onChangeMonth,
  selectedDate,
  onSelectDate,
  events,
  onChangeEvents,
  workOrders,
  onChangeWorkOrders,
  projects,
  files,
  onOpenProject,
  onPreviewFile,
  onOpenOmTab,
  onNotify,
}: MonthlyCalendarViewProps) {
  const { year, month } = parseMonthKey(activeMonth);
  const today = todayKey();
  const currentMonth = todayMonthKey();

  const [agendaFilter, setAgendaFilter] = useState<
    "all" | "events" | "om" | "projects" | "files"
  >("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventItem | null>(null);

  // Quick-add form state
  const [quickTitle, setQuickTitle] = useState("");
  const [quickCategory, setQuickCategory] = useState<CalendarEventCategory>(
    EVENT_CATEGORIES[0]
  );
  const [quickPriority, setQuickPriority] = useState<OmPriority>("مرتفع");
  const [quickTime, setQuickTime] = useState("");
  const [quickProject, setQuickProject] = useState("");
  const [quickNotes, setQuickNotes] = useState("");

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  // Count items per month across the whole selected year (for the 12-month bar!)
  const yearMonthCounts = useMemo(() => {
    const counts = Array<number>(12).fill(0);
    const prefix = `${year}-`;
    const addIfYear = (dateStr?: string) => {
      if (dateStr && dateStr.startsWith(prefix)) {
        const m = Number(dateStr.slice(5, 7)) - 1;
        if (m >= 0 && m < 12) counts[m]++;
      }
    };
    events.forEach((e) => addIfYear(e.date));
    workOrders.forEach((w) => addIfYear(w.dueDate));
    projects.forEach((p) => addIfYear(p.targetDate));
    return counts;
  }, [year, events, workOrders, projects]);

  // Items per day map
  const dayMarkers = useMemo(() => {
    const map = new Map<
      string,
      { events: number; om: number; projects: number; files: number }
    >();
    const ensure = (k: string) => {
      if (!map.has(k)) {
        map.set(k, { events: 0, om: 0, projects: 0, files: 0 });
      }
      return map.get(k)!;
    };
    events.forEach((e) => {
      if (e.date) ensure(e.date).events++;
    });
    workOrders.forEach((w) => {
      if (w.dueDate) ensure(w.dueDate).om++;
    });
    projects.forEach((p) => {
      if (p.targetDate) ensure(p.targetDate).projects++;
    });
    files.forEach((f) => {
      ensure(getFileDateKey(f)).files++;
    });
    return map;
  }, [events, workOrders, projects, files]);

  // Month-bound slices (100% bound to activeMonth!)
  const monthEvents = useMemo(
    () =>
      events
        .filter((e) => e.date.startsWith(activeMonth))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [events, activeMonth]
  );

  const monthWorkOrders = useMemo(
    () =>
      workOrders
        .filter((w) => w.dueDate.startsWith(activeMonth))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [workOrders, activeMonth]
  );

  const monthProjects = useMemo(
    () =>
      projects.filter((p) => (p.targetDate || "").startsWith(activeMonth)),
    [projects, activeMonth]
  );

  const monthFiles = useMemo(
    () =>
      files.filter((f) => getFileDateKey(f).startsWith(activeMonth)),
    [files, activeMonth]
  );

  // Selected Day slices
  const dayEvents = useMemo(
    () => events.filter((e) => e.date === selectedDate),
    [events, selectedDate]
  );
  const dayWorkOrders = useMemo(
    () => workOrders.filter((w) => w.dueDate === selectedDate),
    [workOrders, selectedDate]
  );
  const dayProjects = useMemo(
    () => projects.filter((p) => p.targetDate === selectedDate),
    [projects, selectedDate]
  );
  const dayFiles = useMemo(
    () => files.filter((f) => getFileDateKey(f) === selectedDate),
    [files, selectedDate]
  );

  // Monthly completion percentage
  const totalActionable = monthEvents.length + monthWorkOrders.length;
  const doneActionable =
    monthEvents.filter((e) => e.done).length +
    monthWorkOrders.filter((w) => w.status === "مكتمل").length;
  const monthCompletionPct = totalActionable
    ? Math.round((doneActionable / totalActionable) * 100)
    : 0;

  function switchMonth(nextMonthKey: string) {
    onChangeMonth(nextMonthKey);
    onSelectDate(clampDateToMonth(selectedDate, nextMonthKey));
  }

  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    const item: CalendarEventItem = {
      id: "cal-" + crypto.randomUUID().slice(0, 8),
      title: quickTitle.trim(),
      date: selectedDate,
      time: quickTime || undefined,
      category: quickCategory,
      priority: quickPriority,
      done: false,
      projectId: quickProject || undefined,
      notes: quickNotes.trim() || undefined,
    };
    onChangeEvents([item, ...events]);
    setQuickTitle("");
    setQuickTime("");
    setQuickNotes("");
    setShowAddModal(false);
    // Ensure activeMonth matches item date
    const itemMonth = item.date.slice(0, 7);
    if (itemMonth !== activeMonth) onChangeMonth(itemMonth);
    onNotify(`تمت إضافة "${item.title}" في ${formatDateArabic(item.date)}`);
  }

  function toggleEventDone(id: string) {
    onChangeEvents(
      events.map((ev) => (ev.id === id ? { ...ev, done: !ev.done } : ev))
    );
  }

  function deleteEvent(id: string) {
    onChangeEvents(events.filter((ev) => ev.id !== id));
    if (editingEvent?.id === id) setEditingEvent(null);
    onNotify("تم حذف الموعد من التقويم");
  }

  function handleSaveEditedEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingEvent) return;
    const fd = new FormData(e.currentTarget);
    const updatedDate = String(fd.get("date") || editingEvent.date);
    const updated: CalendarEventItem = {
      ...editingEvent,
      title: String(fd.get("title") || "").trim() || editingEvent.title,
      date: updatedDate,
      time: String(fd.get("time") || "").trim() || undefined,
      category: String(fd.get("category")) as CalendarEventCategory,
      priority: String(fd.get("priority")) as OmPriority,
      projectId: String(fd.get("projectId") || "") || undefined,
      notes: String(fd.get("notes") || "").trim() || undefined,
    };
    onChangeEvents(
      events.map((ev) => (ev.id === updated.id ? updated : ev))
    );
    setEditingEvent(null);
    const m = updatedDate.slice(0, 7);
    if (m !== activeMonth) onChangeMonth(m);
    onSelectDate(updatedDate);
    onNotify("تم حفظ تعديلات الموعد");
  }

  function cycleOmStatus(wo: OmWorkOrder) {
    const next =
      OM_STATUSES[(OM_STATUSES.indexOf(wo.status) + 1) % OM_STATUSES.length];
    onChangeWorkOrders(
      workOrders.map((w) => (w.id === wo.id ? { ...w, status: next } : w))
    );
    onNotify(`تم تحديث حالة ${wo.code} إلى: ${next}`);
  }

  return (
    <div className="mh-stack">
      {/* Page Heading */}
      <div className="heading" style={{ marginTop: 4 }}>
        <div>
          <small className="eyebrow">
            MONTHLY ENGINEERING CALENDAR · التقويم الشهري المتكامل
          </small>
          <h2>
            التقويم وخطة شهر {formatMonthArabic(activeMonth)} ({MONTHS_EN[month]}{" "}
            {year})
          </h2>
        </div>
        <div className="mh-btn-row">
          {activeMonth !== currentMonth && (
            <button
              type="button"
              className="sa-btn-subtle"
              onClick={() => {
                onChangeMonth(currentMonth);
                onSelectDate(today);
              }}
            >
              <RotateCcw size={14} /> العودة للشهر الحالي
            </button>
          )}
          <input
            type="month"
            aria-label="اختيار الشهر والسنة"
            className="mh-month-input"
            value={activeMonth}
            onChange={(e) => e.target.value && switchMonth(e.target.value)}
          />
          <button
            type="button"
            className="primary mh-btn-nomargin"
            onClick={() => setShowAddModal(true)}
          >
            <CalendarPlus size={16} /> إضافة موعد / مهمة بالشهر
          </button>
        </div>
      </div>

      {/* 12-Month Interactive Strip Bound to Year */}
      <section className="mh-panel" style={{ padding: "12px 14px" }}>
        <div className="mh-flex-between" style={{ marginBottom: 10 }}>
          <div className="mh-badges-row">
            <CalendarDays size={16} className="sa-copper-icon" />
            <b>أشهر سنة {year} — اختر الشهر لعرض جدول أعماله بالكامل:</b>
          </div>
          <div className="mh-btn-row">
            <button
              type="button"
              className="sa-btn-subtle"
              onClick={() => switchMonth(`${year - 1}-${pad2(month + 1)}`)}
            >
              <ChevronRight size={14} /> {year - 1}
            </button>
            <span className="mh-pill accent">{year}</span>
            <button
              type="button"
              className="sa-btn-subtle"
              onClick={() => switchMonth(`${year + 1}-${pad2(month + 1)}`)}
            >
              {year + 1} <ChevronLeft size={14} />
            </button>
          </div>
        </div>

        <div className="mh-months-strip">
          {MONTHS_AR.map((mLabel, mIdx) => {
            const mKey = toMonthKey(year, mIdx);
            const isActive = mKey === activeMonth;
            const count = yearMonthCounts[mIdx];
            return (
              <button
                key={mKey}
                type="button"
                className={`mh-month-pill ${isActive ? "active" : ""}`}
                onClick={() => switchMonth(mKey)}
              >
                <span>{mLabel}</span>
                {count > 0 && <em>{count}</em>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Month KPIs Strip (Strictly reflecting activeMonth) */}
      <div className="stats" style={{ marginTop: 0 }}>
        <button type="button" onClick={() => setAgendaFilter("events")}>
          <i className="c0">
            <CalendarDays />
          </i>
          <div>
            <strong>{String(monthEvents.length).padStart(2, "0")}</strong>
            <small>مواعيد ومهام {MONTHS_AR[month]}</small>
          </div>
        </button>
        <button type="button" onClick={() => setAgendaFilter("om")}>
          <i className="c1">
            <Wrench />
          </i>
          <div>
            <strong>{String(monthWorkOrders.length).padStart(2, "0")}</strong>
            <small>أوامر عمل O&M في {MONTHS_AR[month]}</small>
          </div>
        </button>
        <button type="button" onClick={() => setAgendaFilter("projects")}>
          <i className="c2">
            <FolderKanban />
          </i>
          <div>
            <strong>
              {String(monthProjects.length + monthFiles.length).padStart(2, "0")}
            </strong>
            <small>مشاريع وملفات مرتبطة بالشهر</small>
          </div>
        </button>
        <button type="button" onClick={() => setAgendaFilter("all")}>
          <i className="c3">
            <CheckCircle2 />
          </i>
          <div>
            <strong>{monthCompletionPct}%</strong>
            <small>
              نسبة إنجاز الشهر ({doneActionable}/{totalActionable || 0})
            </small>
          </div>
        </button>
      </div>

      {/* Main Two-Column Calendar Layout */}
      <div className="mh-grid-2-asym">
        {/* Left / Primary Column: Full Month Grid + Month-wide Agenda */}
        <div className="mh-stack">
          <section className="mh-panel">
            <div className="mh-flex-between" style={{ marginBottom: 12 }}>
              <button
                type="button"
                className="sa-btn-subtle"
                onClick={() => switchMonth(shiftMonthKey(activeMonth, -1))}
              >
                <ChevronRight size={16} /> الشهر السابق
              </button>
              <div style={{ textAlign: "center" }}>
                <h3 style={{ margin: 0, fontSize: 19 }}>
                  {MONTHS_AR[month]} {year}
                </h3>
                <small>
                  {MONTHS_EN[month]} {year}
                </small>
              </div>
              <button
                type="button"
                className="sa-btn-subtle"
                onClick={() => switchMonth(shiftMonthKey(activeMonth, 1))}
              >
                الشهر التالي <ChevronLeft size={16} />
              </button>
            </div>

            <div className="mh-cal-full-grid">
              {WEEKDAYS_SHORT_AR.map((w) => (
                <div key={w} className="mh-cal-wd">
                  {w}
                </div>
              ))}
              {cells.map((d) => {
                const key = toDateKey(d);
                const inMonth = d.getMonth() === month;
                const isSelected = key === selectedDate;
                const isToday = key === today;
                const markers = dayMarkers.get(key);

                return (
                  <button
                    key={key}
                    type="button"
                    className={`mh-cal-cell large ${!inMonth ? "outside" : ""} ${
                      isSelected ? "selected" : isToday ? "today" : ""
                    }`}
                    onClick={() => {
                      if (!inMonth) {
                        onChangeMonth(toMonthKey(d.getFullYear(), d.getMonth()));
                      }
                      onSelectDate(key);
                    }}
                  >
                    <div className="mh-cal-day-top">
                      <b>{d.getDate()}</b>
                      {isToday && <small className="mh-today-badge">اليوم</small>}
                    </div>
                    {markers && (
                      <div className="mh-cal-badges">
                        {markers.events > 0 && (
                          <span className="mh-cal-tag ev" title="مواعيد ومهام">
                            {markers.events} مهمة
                          </span>
                        )}
                        {markers.om > 0 && (
                          <span className="mh-cal-tag om" title="أوامر عمل O&M">
                            {markers.om} O&M
                          </span>
                        )}
                        {(markers.projects > 0 || markers.files > 0) && (
                          <span className="mh-cal-tag prj" title="مشاريع وملفات">
                            {markers.projects + markers.files} ملف/مشروع
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Full Month Agenda */}
          <section className="mh-panel">
            <div className="mh-panel-title">
              <div>
                <small className="eyebrow">MONTH AGENDA · أجندة الشهر كاملة</small>
                <h3>جميع البنود المرتبطة بشهر {formatMonthArabic(activeMonth)}</h3>
              </div>
              <div className="mh-badges-row">
                {(
                  [
                    ["all", "الكل"],
                    ["events", `المواعيد (${monthEvents.length})`],
                    ["om", `التشغيل والصيانة (${monthWorkOrders.length})`],
                    ["projects", `المشاريع (${monthProjects.length})`],
                    ["files", `الملفات (${monthFiles.length})`],
                  ] as const
                ).map(([id, lbl]) => (
                  <button
                    key={id}
                    type="button"
                    className={`mh-choice-pill ${
                      agendaFilter === id ? "active" : ""
                    }`}
                    onClick={() => setAgendaFilter(id)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div className="mh-stack-sm">
              {/* Calendar Events in Month */}
              {(agendaFilter === "all" || agendaFilter === "events") &&
                monthEvents.map((ev) => (
                  <div key={ev.id} className="mh-inset-card mh-cal-agenda-row">
                    <button
                      type="button"
                      onClick={() => toggleEventDone(ev.id)}
                      title="تبديل الإنجاز"
                    >
                      {ev.done ? (
                        <CheckCircle2 size={18} style={{ color: "var(--ok)" }} />
                      ) : (
                        <Circle size={18} className="sa-copper-icon" />
                      )}
                    </button>
                    <div
                      style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                      onClick={() => onSelectDate(ev.date)}
                    >
                      <div className="mh-badges-row">
                        <span className="mh-pill accent">{ev.category}</span>
                        <span className="mh-pill" dir="ltr">
                          {ev.date} {ev.time ? `· ${ev.time}` : ""}
                        </span>
                        <span
                          className={`mh-pill ${
                            ev.priority === "عاجل" ? "danger" : ""
                          }`}
                        >
                          {ev.priority}
                        </span>
                      </div>
                      <b
                        style={{
                          display: "block",
                          marginTop: 4,
                          textDecoration: ev.done ? "line-through" : "none",
                          opacity: ev.done ? 0.65 : 1,
                        }}
                      >
                        {ev.title}
                      </b>
                      {ev.notes && <small>{ev.notes}</small>}
                    </div>
                    <div className="sa-row-actions">
                      <button
                        type="button"
                        title="تعديل الموعد"
                        onClick={() => setEditingEvent(ev)}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        title="حذف الموعد"
                        onClick={() => deleteEvent(ev.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}

              {/* O&M Work Orders in Month */}
              {(agendaFilter === "all" || agendaFilter === "om") &&
                monthWorkOrders.map((wo) => (
                  <div key={wo.id} className="mh-inset-card mh-cal-agenda-row">
                    <Wrench size={18} className="sa-copper-icon" />
                    <div
                      style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                      onClick={() => onSelectDate(wo.dueDate)}
                    >
                      <div className="mh-badges-row">
                        <span className="mh-pill accent" dir="ltr">
                          {wo.code}
                        </span>
                        <span className="mh-pill" dir="ltr">
                          {wo.dueDate}
                        </span>
                        <span className="mh-pill">{wo.site}</span>
                      </div>
                      <b style={{ display: "block", marginTop: 4 }}>{wo.title}</b>
                    </div>
                    <button
                      type="button"
                      className={`mh-status-btn ${
                        wo.status === "مكتمل" ? "done" : ""
                      }`}
                      onClick={() => cycleOmStatus(wo)}
                    >
                      {wo.status}
                    </button>
                    <button
                      type="button"
                      className="sa-btn-subtle"
                      onClick={onOpenOmTab}
                      title="فتح في قسم التشغيل والصيانة"
                    >
                      فتح
                    </button>
                  </div>
                ))}

              {/* Projects with targetDate in Month */}
              {(agendaFilter === "all" || agendaFilter === "projects") &&
                monthProjects.map((p) => (
                  <div key={p.id} className="mh-inset-card mh-cal-agenda-row">
                    <FolderKanban size={18} className="sa-copper-icon" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mh-badges-row">
                        <span className="mh-pill accent">{p.type}</span>
                        <span className="mh-pill" dir="ltr">
                          {p.targetDate}
                        </span>
                        <span className="mh-pill ok">إنجاز {p.progress}%</span>
                      </div>
                      <b style={{ display: "block", marginTop: 4 }}>{p.name}</b>
                    </div>
                    <button
                      type="button"
                      className="sa-btn-subtle"
                      onClick={() => onOpenProject(p.id)}
                    >
                      تفاصيل وتعديل
                    </button>
                  </div>
                ))}

              {/* Files in Month */}
              {(agendaFilter === "all" || agendaFilter === "files") &&
                monthFiles.map((f) => (
                  <div key={f.id} className="mh-inset-card mh-cal-agenda-row">
                    <FileText size={18} className="sa-copper-icon" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mh-badges-row">
                        <span className="mh-pill">{f.cat}</span>
                        <span className="mh-pill" dir="ltr">
                          {getFileDateKey(f)}
                        </span>
                      </div>
                      <b style={{ display: "block", marginTop: 4 }}>{f.name}</b>
                    </div>
                    <button
                      type="button"
                      className="sa-btn-subtle"
                      onClick={() => onPreviewFile(f)}
                    >
                      <Eye size={14} /> معاينة
                    </button>
                  </div>
                ))}

              {monthEvents.length === 0 &&
                monthWorkOrders.length === 0 &&
                monthProjects.length === 0 &&
                monthFiles.length === 0 && (
                  <p className="empty">
                    لا توجد مواعيد أو أوامر عمل مسجلة في شهر{" "}
                    {formatMonthArabic(activeMonth)} بعد. أضف موعداً جديداً من
                    الأعلى أو من لوحة اليوم المحدد.
                  </p>
                )}
            </div>
          </section>
        </div>

        {/* Right / Secondary Column: Selected Day Inspector + Quick Add */}
        <div className="mh-stack">
          <section className="mh-panel">
            <small className="eyebrow">SELECTED DAY · اليوم المحدد</small>
            <h3 style={{ margin: "4px 0" }}>{formatDateArabic(selectedDate)}</h3>
            <small dir="ltr" style={{ textAlign: "right", marginBottom: 12 }}>
              {selectedDate} · مرتبط بشهر {formatMonthArabic(activeMonth)}
            </small>

            {/* Quick Add Form for Selected Day */}
            <form
              onSubmit={handleQuickAdd}
              className="mh-inset-card mh-stack-sm"
              style={{ marginBottom: 14 }}
            >
              <b>إضافة مهمة / موعد في هذا اليوم</b>
              <input
                required
                placeholder="عنوان المهمة أو الموعد الهندسي..."
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="mh-select"
              />
              <div className="mh-form-grid">
                <select
                  className="mh-select"
                  value={quickCategory}
                  onChange={(e) =>
                    setQuickCategory(e.target.value as CalendarEventCategory)
                  }
                >
                  {EVENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  className="mh-select"
                  value={quickPriority}
                  onChange={(e) =>
                    setQuickPriority(e.target.value as OmPriority)
                  }
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      أولوية: {p}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  className="mh-select"
                  value={quickTime}
                  onChange={(e) => setQuickTime(e.target.value)}
                  title="الوقت (اختياري)"
                />
                <select
                  className="mh-select"
                  value={quickProject}
                  onChange={(e) => setQuickProject(e.target.value)}
                >
                  <option value="">بدون مشروع محدد</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                className="mh-select"
                placeholder="ملاحظات سريعة (اختياري)..."
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
              />
              <button type="submit" className="primary mh-btn-nomargin">
                <Plus size={15} /> إضافة ليوم {selectedDate}
              </button>
            </form>

            {/* Day Items List */}
            <h4 className="mh-small-head">
              بنود هذا اليوم (
              {dayEvents.length +
                dayWorkOrders.length +
                dayProjects.length +
                dayFiles.length}
              )
            </h4>
            <div className="mh-stack-sm">
              {dayEvents.map((ev) => (
                <div key={ev.id} className="mh-inset-card mh-cal-agenda-row">
                  <button type="button" onClick={() => toggleEventDone(ev.id)}>
                    {ev.done ? (
                      <Check size={16} style={{ color: "var(--ok)" }} />
                    ) : (
                      <Clock size={16} className="sa-copper-icon" />
                    )}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b
                      style={{
                        textDecoration: ev.done ? "line-through" : "none",
                      }}
                    >
                      {ev.title}
                    </b>
                    <small>
                      {ev.category} {ev.time ? `· ${ev.time}` : ""}
                    </small>
                  </div>
                  <button
                    type="button"
                    title="تعديل"
                    onClick={() => setEditingEvent(ev)}
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    title="حذف"
                    onClick={() => deleteEvent(ev.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {dayWorkOrders.map((wo) => (
                <div key={wo.id} className="mh-inset-card mh-cal-agenda-row">
                  <Wrench size={16} className="sa-copper-icon" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{wo.title}</b>
                    <small>
                      {wo.code} · {wo.status}
                    </small>
                  </div>
                </div>
              ))}

              {dayProjects.map((p) => (
                <div key={p.id} className="mh-inset-card mh-cal-agenda-row">
                  <FolderKanban size={16} className="sa-copper-icon" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{p.name}</b>
                    <small>تسليم مشروع · {p.progress}%</small>
                  </div>
                  <button
                    type="button"
                    className="sa-btn-subtle"
                    onClick={() => onOpenProject(p.id)}
                  >
                    فتح
                  </button>
                </div>
              ))}

              {dayFiles.map((f) => (
                <div key={f.id} className="mh-inset-card mh-cal-agenda-row">
                  <FileText size={16} className="sa-copper-icon" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{f.name}</b>
                    <small>{f.cat}</small>
                  </div>
                  <button
                    type="button"
                    className="sa-btn-subtle"
                    onClick={() => onPreviewFile(f)}
                  >
                    <Eye size={14} />
                  </button>
                </div>
              ))}

              {dayEvents.length === 0 &&
                dayWorkOrders.length === 0 &&
                dayProjects.length === 0 &&
                dayFiles.length === 0 && (
                  <small>لا توجد بنود مسجلة في هذا اليوم تحديداً.</small>
                )}
            </div>
          </section>
        </div>
      </div>

      {/* Add Modal (Full Form with custom Date inside Month) */}
      {showAddModal && (
        <div className="overlay" onClick={() => setShowAddModal(false)}>
          <section
            className="dialog sa-wide-dialog"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="close"
              onClick={() => setShowAddModal(false)}
            >
              <X />
            </button>
            <h2>إضافة موعد / مهمة في شهر {formatMonthArabic(activeMonth)}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const chosenDate = String(fd.get("date") || selectedDate);
                const newEv: CalendarEventItem = {
                  id: "cal-" + crypto.randomUUID().slice(0, 8),
                  title: String(fd.get("title") || "").trim(),
                  date: chosenDate,
                  time: String(fd.get("time") || "") || undefined,
                  category: String(fd.get("category")) as CalendarEventCategory,
                  priority: String(fd.get("priority")) as OmPriority,
                  done: false,
                  projectId: String(fd.get("projectId") || "") || undefined,
                  notes: String(fd.get("notes") || "").trim() || undefined,
                };
                onChangeEvents([newEv, ...events]);
                setShowAddModal(false);
                const targetMonth = chosenDate.slice(0, 7);
                if (targetMonth !== activeMonth) onChangeMonth(targetMonth);
                onSelectDate(chosenDate);
                onNotify(`تمت إضافة "${newEv.title}" في التقويم الشهري`);
              }}
            >
              <div className="mh-form-grid">
                <label className="mh-span-2">
                  عنوان الموعد أو المهمة
                  <input
                    name="title"
                    required
                    placeholder="مثال: تسليم مخططات التكييف المعتمدة..."
                  />
                </label>
                <label>
                  التاريخ
                  <input name="date" type="date" defaultValue={selectedDate} required />
                </label>
                <label>
                  الوقت (اختياري)
                  <input name="time" type="time" />
                </label>
                <label>
                  التصنيف
                  <select name="category" defaultValue={EVENT_CATEGORIES[0]}>
                    {EVENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  الأولوية
                  <select name="priority" defaultValue="مرتفع">
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mh-span-2">
                  ربط بمشروع (اختياري)
                  <select name="projectId" defaultValue="">
                    <option value="">بدون مشروع</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mh-span-2">
                  ملاحظات تفصيلية
                  <textarea name="notes" rows={2} />
                </label>
              </div>
              <button className="primary">حفظ في التقويم الشهري</button>
            </form>
          </section>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="overlay" onClick={() => setEditingEvent(null)}>
          <section
            className="dialog sa-wide-dialog"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="close"
              onClick={() => setEditingEvent(null)}
            >
              <X />
            </button>
            <h2>تعديل الموعد / المهمة</h2>
            <form onSubmit={handleSaveEditedEvent}>
              <div className="mh-form-grid">
                <label className="mh-span-2">
                  العنوان
                  <input
                    name="title"
                    required
                    defaultValue={editingEvent.title}
                  />
                </label>
                <label>
                  التاريخ
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={editingEvent.date}
                  />
                </label>
                <label>
                  الوقت
                  <input
                    name="time"
                    type="time"
                    defaultValue={editingEvent.time || ""}
                  />
                </label>
                <label>
                  التصنيف
                  <select name="category" defaultValue={editingEvent.category}>
                    {EVENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  الأولوية
                  <select name="priority" defaultValue={editingEvent.priority}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mh-span-2">
                  المشروع المرتبط
                  <select
                    name="projectId"
                    defaultValue={editingEvent.projectId || ""}
                  >
                    <option value="">بدون مشروع</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mh-span-2">
                  الملاحظات
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={editingEvent.notes || ""}
                  />
                </label>
              </div>
              <div className="mh-flex-between" style={{ marginTop: 14 }}>
                <button type="submit" className="primary mh-btn-nomargin">
                  <Check size={15} /> حفظ التعديلات
                </button>
                <button
                  type="button"
                  className="sa-delete-btn"
                  onClick={() => deleteEvent(editingEvent.id)}
                >
                  <Trash2 size={14} /> حذف الموعد
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
