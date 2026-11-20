import React, { useMemo, useRef, useState } from "react";
import { CalendarPlus, Check, Circle, Clock, Plus, Sparkles } from "lucide-react";
import { WorkspaceTask } from "../types/dashboard";
import { formatDateArabic, parseDateKey, todayKey, WEEKDAYS_AR } from "../utils/date";
import { CalendarCard } from "./CalendarCard";
import { Button, EmptyState, SectionLabel } from "./UI";

interface CalendarViewProps {
  tasks: WorkspaceTask[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onToggleTask: (id: string) => void;
  onAddTask: (payload: {
    title: string;
    category: WorkspaceTask["category"];
    priority: WorkspaceTask["priority"];
    dueDate: string;
  }) => void;
  onNotify: (msg: string) => void;
}

const PRIORITY_LABEL: Record<WorkspaceTask["priority"], string> = {
  high: "عالية",
  medium: "متوسطة",
  low: "عادية",
};

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  selectedDate,
  onSelectDate,
  onToggleTask,
  onAddTask,
  onNotify,
}) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<WorkspaceTask["category"]>("feature");
  const [priority, setPriority] = useState<WorkspaceTask["priority"]>("medium");
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = parseDateKey(selectedDate);
  const dayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate === selectedDate).sort((a, b) => Number(a.done) - Number(b.done)),
    [tasks, selectedDate]
  );

  const upcoming = useMemo(() => {
    const today = todayKey();
    return tasks
      .filter((t) => t.dueDate && t.dueDate >= today && !t.done)
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
      .slice(0, 5);
  }, [tasks]);

  const monthKey = selectedDate.slice(0, 7);
  const monthTasks = tasks.filter((t) => (t.dueDate || "").startsWith(monthKey));
  const monthDone = monthTasks.filter((t) => t.done).length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask({ title: title.trim(), category, priority, dueDate: selectedDate });
    setTitle("");
    onNotify(`تمت إضافة المهمة يوم ${formatDateArabic(selectedDate)}`);
  };

  const focusForm = () => {
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow mb-1">Date picker · full month</div>
          <h1 className="font-display text-xl font-bold text-[var(--ink)] sm:text-2xl">التقويم والمهام</h1>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            اختر أي يوم لعرض مهامه وإضافة مهام جديدة مرتبطة بتاريخ.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="chip chip-salmon !text-[10px]">
            <CalendarPlus className="h-3 w-3" /> {monthTasks.length} مهمة هذا الشهر
          </span>
          <span className="chip !text-[10px]" style={{ color: "var(--success)" }}>
            {monthDone} مكتملة
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7 xl:col-span-8">
          <CalendarCard
            size="large"
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            tasks={tasks}
            onAddTask={focusForm}
          />

          <div className="panel p-4">
            <SectionLabel action={<span className="chip !text-[9px]">next 5</span>}>Upcoming tasks</SectionLabel>
            <h3 className="mb-3 text-sm font-bold text-[var(--ink)]">المهام القادمة</h3>

            {upcoming.length === 0 ? (
              <EmptyState title="لا توجد مهام قادمة" text="أضف مهمة جديدة من اللوحة الجانبية وحدد تاريخ استحقاقها." />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {upcoming.map((task) => {
                  const d = parseDateKey(task.dueDate || todayKey());
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onSelectDate(task.dueDate || todayKey())}
                      className="panel-inset flex items-center gap-2.5 rounded-xl p-2.5 text-right transition hover:border-[rgba(255,91,158,.3)]"
                    >
                      <div className="panel-inset flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg">
                        <span className="font-mono text-[11px] font-bold text-[var(--salmon)]">{d.getDate()}</span>
                        <span className="text-[8px] text-[var(--faint)]">{WEEKDAYS_AR[d.getDay()].slice(0, 4)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-medium text-[var(--ink)]">{task.title}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[9px] text-[var(--faint)]">
                          <Clock className="h-2.5 w-2.5" />
                          <span className="font-mono">{task.dueDate}</span>
                          <span>·</span>
                          <span>{PRIORITY_LABEL[task.priority]}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected day panel */}
        <div className="space-y-4 lg:col-span-5 xl:col-span-4">
          <div className="panel p-4 sm:p-5">
            <SectionLabel>Selected day</SectionLabel>
            <div className="flex items-center gap-3">
              <div
                className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl text-[var(--salmon-ink)]"
                style={{
                  background: "linear-gradient(180deg,#f7b7a8,#e99a87)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,.55), 0 0 0 1px rgba(255,91,158,.5), 0 0 22px -4px rgba(255,91,158,.5)",
                }}
              >
                <span className="font-display text-xl font-bold leading-none">{selected.getDate()}</span>
                <span className="text-[8px] font-semibold opacity-80">{selected.getFullYear()}</span>
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-[var(--ink)]">{WEEKDAYS_AR[selected.getDay()]}</div>
                <div className="text-[11px] text-[var(--muted)]">{formatDateArabic(selectedDate)}</div>
                <div className="mt-1 flex items-center gap-1">
                  <span className="chip chip-teal !py-0.5 !text-[9px]">{dayTasks.length} مهمة</span>
                  <span className="chip !py-0.5 !text-[9px]">
                    {dayTasks.filter((t) => t.done).length} مكتملة
                  </span>
                </div>
              </div>
            </div>

            <div className="divider-soft my-3" />

            <form onSubmit={submit} className="space-y-2">
              <label className="eyebrow block">Quick add · stepper</label>
              <input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="اكتب اسم المهمة..."
                className="field"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as WorkspaceTask["category"])}
                  className="field"
                >
                  <option value="feature">ميزة جديدة</option>
                  <option value="deploy">نشر وإطلاق</option>
                  <option value="bug">إصلاح خطأ</option>
                  <option value="docs">توثيق</option>
                </select>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as WorkspaceTask["priority"])}
                  className="field"
                >
                  <option value="high">أولوية عالية</option>
                  <option value="medium">أولوية متوسطة</option>
                  <option value="low">أولوية عادية</option>
                </select>
              </div>
              <Button type="submit" variant="primary" className="w-full">
                <Plus className="h-3.5 w-3.5" />
                إضافة لهذا اليوم
              </Button>
            </form>

            <div className="divider-soft my-3" />

            <div className="space-y-2">
              {dayTasks.length === 0 ? (
                <div className="py-3">
                  <EmptyState title="اليوم خالٍ من المهام" text="لا توجد مهام مستحقة في هذا التاريخ، أضف واحدة من الأعلى." />
                </div>
              ) : (
                dayTasks.map((task) => (
                  <div key={task.id} className="panel-inset flex items-center gap-2 rounded-xl px-2.5 py-2">
                    <button type="button" onClick={() => onToggleTask(task.id)} aria-label="تبديل حالة المهمة">
                      {task.done ? (
                        <span className="flex h-4 w-4 items-center justify-center rounded-[5px] bg-[linear-gradient(180deg,#f5b2a3,#e99a87)] text-[var(--salmon-ink)]">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      ) : (
                        <Circle className="h-4 w-4 text-[var(--faint)]" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-[11px] ${task.done ? "text-[var(--faint)] line-through" : "font-medium text-[var(--ink)]"}`}>
                        {task.title}
                      </div>
                      <div className="text-[9px] text-[var(--faint)]">
                        {task.category} · {PRIORITY_LABEL[task.priority]}
                      </div>
                    </div>
                    <Sparkles className="h-3 w-3 shrink-0" style={{ color: "var(--salmon)" }} />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel p-4">
            <SectionLabel action={<span className="chip !text-[9px] font-mono">{monthKey}</span>}>Month summary</SectionLabel>
            <h3 className="mb-2.5 text-sm font-bold text-[var(--ink)]">ملخص الشهر</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["مهام الشهر", monthTasks.length, "var(--salmon)"],
                ["مكتملة", monthDone, "var(--success)"],
                ["متبقية", monthTasks.length - monthDone, "var(--pink)"],
                ["أيام مشغولة", new Set(monthTasks.map((t) => t.dueDate)).size, "#8fc0a9"],
              ].map(([label, value, color]) => (
                <div key={String(label)} className="panel-inset rounded-lg p-2">
                  <div className="font-display text-lg font-bold leading-none tabular" style={{ color: String(color) }}>
                    {value}
                  </div>
                  <div className="mt-1 text-[9px] text-[var(--faint)]">{label}</div>
                </div>
              ))}
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--inset)] shadow-[inset_0_1px_2px_var(--shadow-dark)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${monthTasks.length ? Math.round((monthDone / monthTasks.length) * 100) : 0}%`,
                  background: "linear-gradient(90deg,#f7bcae,#ec9c89)",
                  boxShadow: "0 0 10px rgba(240,164,147,.5)",
                }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-[var(--faint)]">
              <span>نسبة الإنجاز</span>
              <span className="font-mono text-[var(--ink)]">
                {monthTasks.length ? Math.round((monthDone / monthTasks.length) * 100) : 0}%
              </span>
            </div>
            <div className="divider-soft my-2.5" />
            <p className="text-[10px] leading-relaxed text-[var(--muted)]">
              تُحفظ المهام داخل المتصفح، وتظهر نقاطها في شبكة التقويم على الأيام المستحقة.
            </p>
          </div>

          <div className="panel p-4">
            <SectionLabel>Legend · tokens</SectionLabel>
            <div className="space-y-2">
              {[
                ["اليوم المحدد", "linear-gradient(180deg,#f7b7a8,#e99a87)", "Selected date"],
                ["اليوم الحالي", "linear-gradient(180deg,#3b6058,#2b4b44)", "Today"],
                ["مهام مستحقة", "var(--pink)", "Task marker"],
              ].map(([label, bg, en]) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
                    <span className="h-3 w-3 rounded-md" style={{ background: bg }} />
                    {label}
                  </span>
                  <span className="font-mono text-[9px] text-[var(--faint)]">{en}</span>
                </div>
              ))}
            </div>
            <div className="divider-soft my-2.5" />
            <p className="text-[10px] leading-relaxed text-[var(--faint)]">
              التاريخ المحدد يُحفظ محلياً ويظهر أيضاً في بطاقة التقويم المصغّرة داخل النظرة العامة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
