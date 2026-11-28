export const WORK_TIME_ZONE = "Asia/Riyadh";
export const SHIFT_START_MINUTES = 9 * 60;
export const SHIFT_END_MINUTES = 17 * 60;

export interface CalendarDay { year: number; month: number; day: number }

/** Gregorian wall time in Makkah, independent of the device's time zone. */
export function getMakkahTime(now = new Date()): CalendarDay & { minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: WORK_TIME_ZONE, calendar: "gregory", numberingSystem: "latn",
    year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month") - 1, day: value("day"), minutes: value("hour") * 60 + value("minute") };
}

export function dateKey(date: CalendarDay): string {
  return `${date.year}-${String(date.month + 1).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function getMonthCells(year: number, month: number): (number | null)[] {
  // Saturday first, matching the Arabic weekday headings.
  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 1) % 7;
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= count; day++) cells.push(day);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

export function getShiftStatus(minutes: number): { phase: "before" | "during" | "after"; remaining: number; progress: number } {
  if (minutes < SHIFT_START_MINUTES) return { phase: "before", remaining: SHIFT_START_MINUTES - minutes, progress: 0 };
  if (minutes >= SHIFT_END_MINUTES) return { phase: "after", remaining: 0, progress: 100 };
  return { phase: "during", remaining: SHIFT_END_MINUTES - minutes, progress: (minutes - SHIFT_START_MINUTES) / (SHIFT_END_MINUTES - SHIFT_START_MINUTES) * 100 };
}
