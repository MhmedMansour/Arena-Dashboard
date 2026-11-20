import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarPlus, Sparkles } from "lucide-react";
import { WorkspaceTask } from "../types/dashboard";
import {
  MONTHS_AR,
  MONTHS_EN,
  buildMonthGrid,
  formatDateArabic,
  parseDateKey,
  toDateKey,
  todayKey,
} from "../utils/date";

interface CalendarCardProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  tasks?: WorkspaceTask[];
  size?: "mini" | "large";
  onAddTask?: () => void;
  className?: string;
}

const WEEK_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const CalendarCard: React.FC<CalendarCardProps> = ({
  selectedDate,
  onSelectDate,
  tasks = [],
  size = "mini",
  onAddTask,
  className = "",
}) => {
  const selected = parseDateKey(selectedDate);
  const [view, setView] = useState({ year: selected.getFullYear(), month: selected.getMonth() });
  const [hovered, setHovered] = useState<string | null>(null);
  const today = todayKey();

  const cells = useMemo(() => buildMonthGrid(view.year, view.month), [view]);
  const dueDays = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.dueDate) set.add(t.dueDate);
    });
    return set;
  }, [tasks]);

  const shiftMonth = (delta: number) => {
    const next = new Date(view.year, view.month + delta, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  };

  const isLarge = size === "large";

  return (
    <div className={`panel ${isLarge ? "p-4 sm:p-5" : "p-4"} ${className}`}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="panel-inset flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] transition hover:text-[var(--ink)]"
          aria-label="الشهر السابق"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        <div className="text-center">
          <div className={`font-display font-semibold tracking-wide text-[var(--ink)] ${isLarge ? "text-lg" : "text-sm"}`}>
            {MONTHS_EN[view.month]} {view.year}
          </div>
          <div className="text-[10px] text-[var(--faint)]">
            {MONTHS_AR[view.month]} {view.year}
          </div>
        </div>

        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="panel-inset flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] transition hover:text-[var(--ink)]"
          aria-label="الشهر التالي"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="panel-inset rounded-xl p-2">
        {/* Weekday labels */}
        <div className="mb-1 grid grid-cols-7 gap-0.5">
          {WEEK_LABELS.map((d) => (
            <span
              key={d}
              className="py-1 text-center font-mono text-[9px] font-medium tracking-wider text-[var(--faint)]"
            >
              {d}
            </span>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((date) => {
            const key = toDateKey(date);
            const inMonth = date.getMonth() === view.month;
            const isSelected = key === selectedDate;
            const isToday = key === today;
            const hasTasks = dueDays.has(key);
            const isHovered = hovered === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onSelectDate(key);
                  if (!inMonth) setView({ year: date.getFullYear(), month: date.getMonth() });
                }}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                className={`cal-day ${isLarge ? "text-xs sm:min-h-10" : ""} ${
                  isSelected ? "cal-selected" : isToday ? "cal-today" : ""
                } ${!inMonth ? "cal-muted" : ""}`}
              >
                <span className="tabular">{date.getDate()}</span>
                {hasTasks && (
                  <span
                    className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                    style={{
                      background: isSelected ? "#3a211b" : "var(--pink)",
                      boxShadow: isSelected ? "none" : "0 0 6px var(--pink-glow)",
                    }}
                  />
                )}
                {isHovered && !isSelected && (
                  <span className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#294742] px-1.5 py-0.5 text-[9px] text-[var(--teal-ink)]">
                    {date.getDate()}/{date.getMonth() + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
        <div className="min-w-0">
          <div className="eyebrow mb-0.5">Selected date</div>
          <div className="flex items-center gap-1.5 truncate text-[11px] font-semibold text-[var(--ink)]">
            <Sparkles className="h-3 w-3 shrink-0 text-[var(--pink)]" />
            <span className="truncate">{formatDateArabic(selectedDate)}</span>
          </div>
        </div>
        {onAddTask && (
          <button
            type="button"
            onClick={onAddTask}
            className="btn btn-primary shrink-0 !px-2.5 !py-1.5 !text-[10px]"
          >
            <CalendarPlus className="h-3 w-3" />
            مهمة
          </button>
        )}
      </div>
    </div>
  );
};
