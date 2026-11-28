import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OverviewMonthCalendarCard, WorkSchedule } from "../src/components/MonthlyCalendarView";
import CvProjectFiles from "../src/components/CvProjectFiles";
import { loadLibraryFilesMeta, saveLibraryFilesMeta } from "../src/services/syncService";
import { LibraryFileItem } from "../src/types/mhmed";

const noop = () => {};
const file = (id: string, cvProjectId?: string): LibraryFileItem => ({
  id, name: `${id}.pdf`, cvProjectId, project: "", cat: "ملفات مشاريع السيرة الذاتية",
  size: 1024, date: 1700000000000, selectedForDisplay: false,
});

test("compact month widget renders leap-month dates, selection, navigation and work hours", () => {
  const html = renderToStaticMarkup(createElement(OverviewMonthCalendarCard, {
    activeMonth: "2028-02", selectedDate: "2028-02-29", onChangeMonth: noop,
    onSelectDate: noop, onOpenCalendar: noop,
    events: [{ id: "event", title: "تسليم", date: "2028-02-29", category: "مهمة عامة", priority: "متوسط", done: false }],
    workOrders: [], projects: [],
  }));
  assert.match(html, /فبراير 2028/);
  assert.equal((html.match(/aria-pressed=/g) || []).length, 42);
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
  assert.match(html, /29 فبراير 2028، 1 بنود/);
  for (const label of ["الشهر السابق", "الشهر التالي", "فتح التقويم الكامل", "اليوم", "دوام الحرم", "٩ صباحًا — ٥ مساءً"]) {
    assert.ok(html.includes(label), label);
  }
  assert.match(renderToStaticMarkup(createElement(WorkSchedule)), /بتوقيت السعودية/);
});

test("CV project files are isolated by stable project ID, not shared names or workspace IDs", () => {
  const files = [file("first-project-file", "cvp-1"), file("second-project-file", "cvp-2"), file("library-file")];
  const html = renderToStaticMarkup(createElement(CvProjectFiles, {
    projectId: "cvp-1", projectName: "مشروع الحرم", files,
    onUploadProjectFiles: async () => {}, onPreviewProjectFile: noop,
    onDownloadProjectFile: noop, onDeleteProjectFile: async () => {},
  }));
  assert.match(html, /ملفات المشروع \(1\)/);
  assert.match(html, /first-project-file.pdf/);
  assert.doesNotMatch(html, /second-project-file.pdf|library-file.pdf/);
  assert.match(html, /multiple=""/);
  for (const action of ["معاينة", "تنزيل", "حذف"]) assert.ok(html.includes(`${action} first-project-file.pdf`));
  assert.match(html, /المزامنة تنقل بياناتها فقط/);
});

test("project association survives metadata save/load and old unlinked files remain compatible", () => {
  const data = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  } });
  try {
    const files = [file("new", "cvp-1"), file("old")];
    saveLibraryFilesMeta(files);
    assert.deepEqual(loadLibraryFilesMeta(), JSON.parse(JSON.stringify(files)));
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
