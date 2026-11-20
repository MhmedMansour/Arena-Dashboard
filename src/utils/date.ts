export const pad2 = (n: number) => String(n).padStart(2, "0");

export const toDateKey = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const parseDateKey = (key: string): Date => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
};

export const todayKey = (): string => toDateKey(new Date());

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

export const WEEKDAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export const formatDateArabic = (key: string): string => {
  const d = parseDateKey(key);
  return `${WEEKDAYS_AR[d.getDay()]}، ${d.getDate()} ${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}`;
};

export const buildMonthGrid = (year: number, month: number): Date[] => {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
};
