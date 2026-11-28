export const pad2 = (n: number) => String(n).padStart(2, "0");

export const toDateKey = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const toMonthKey = (year: number, monthIndex0: number): string =>
  `${year}-${pad2(monthIndex0 + 1)}`;

export const parseMonthKey = (monthKey: string): { year: number; month: number } => {
  const parts = (monthKey || "").split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const now = new Date();
  const validYear = Number.isFinite(y) && y >= 1970 && y <= 2100 ? y : now.getFullYear();
  const validMonth = Number.isFinite(m) && m >= 1 && m <= 12 ? m - 1 : now.getMonth();
  return { year: validYear, month: validMonth };
};

export const parseDateKey = (key: string): Date => {
  const [y, m, d] = (key || "").split("-").map(Number);
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
};

export const todayKey = (): string => toDateKey(new Date());

export const todayMonthKey = (): string => todayKey().slice(0, 7);

export const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export const WEEKDAYS_AR = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export const WEEKDAYS_SHORT_AR = [
  "أحد",
  "إثنين",
  "ثلاثاء",
  "أربعاء",
  "خميس",
  "جمعة",
  "سبت",
];

export const formatDateArabic = (key: string): string => {
  const d = parseDateKey(key);
  return `${WEEKDAYS_AR[d.getDay()]}، ${d.getDate()} ${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}`;
};

export const formatMonthArabic = (monthKey: string): string => {
  const { year, month } = parseMonthKey(monthKey);
  return `${MONTHS_AR[month]} ${year}`;
};

export const shiftMonthKey = (monthKey: string, deltaMonths: number): string => {
  const { year, month } = parseMonthKey(monthKey);
  const next = new Date(year, month + deltaMonths, 1);
  return toMonthKey(next.getFullYear(), next.getMonth());
};

/**
 * Ensures a YYYY-MM-DD date belongs to the given YYYY-MM month.
 * If the date is already inside monthKey, returns it unchanged;
 * otherwise picks today (if monthKey === today's month) or day 01 of monthKey.
 */
export const clampDateToMonth = (dateKey: string, monthKey: string): string => {
  if (dateKey && dateKey.startsWith(monthKey + "-")) {
    return dateKey;
  }
  const t = todayKey();
  if (t.startsWith(monthKey + "-")) {
    return t;
  }
  const { year, month } = parseMonthKey(monthKey);
  const prevDay = parseDateKey(dateKey).getDate();
  const maxDays = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(Math.max(1, prevDay || 1), maxDays);
  return `${monthKey}-${pad2(safeDay)}`;
};

export const defaultDateInMonth = (
  monthKey: string,
  preferredDay = 15
): string => {
  const { year, month } = parseMonthKey(monthKey);
  const maxDays = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(Math.max(1, preferredDay), maxDays);
  return `${monthKey}-${pad2(safeDay)}`;
};

export const buildMonthGrid = (year: number, month: number): Date[] => {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  );
};
