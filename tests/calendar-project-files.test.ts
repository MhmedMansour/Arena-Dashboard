import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { dateKey, getMakkahTime, getMonthCells, getShiftStatus, shiftMonth } from "../src/services/workCalendar";
import { addCvProjectFiles, deleteCvProjectFile, getCvProjectFileBlob, listCvProjectFiles } from "../src/services/cvProjectFiles";

test("calendar uses Gregorian dates and Makkah time regardless of device timezone", () => {
  assert.deepEqual(getMakkahTime(new Date("2026-11-27T06:00:00Z")), { year: 2026, month: 10, day: 27, minutes: 540 });
  assert.deepEqual(getMakkahTime(new Date("2026-12-31T22:30:00Z")), { year: 2027, month: 0, day: 1, minutes: 90 });
  assert.equal(dateKey({ year: 2027, month: 0, day: 1 }), "2027-01-01");
});

test("month grid has complete weeks, Saturday first and correct leap-year lengths", () => {
  const january = getMonthCells(2026, 0); // Thursday
  assert.deepEqual(january.slice(0, 6), [null, null, null, null, null, 1]);
  assert.equal(january.filter((day) => day !== null).length, 31);
  assert.equal(january.length % 7, 0);
  assert.equal(getMonthCells(2024, 1).filter(Boolean).length, 29);
  assert.equal(getMonthCells(2026, 1).filter(Boolean).length, 28);
  assert.equal(getMonthCells(2026, 7)[0], 1); // Saturday
  assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
});

test("Haram shift is exactly 9am–5pm with accurate before/during/after boundaries", () => {
  assert.deepEqual(getShiftStatus(8 * 60 + 59), { phase: "before", remaining: 1, progress: 0 });
  assert.deepEqual(getShiftStatus(9 * 60), { phase: "during", remaining: 480, progress: 0 });
  assert.deepEqual(getShiftStatus(13 * 60), { phase: "during", remaining: 240, progress: 50 });
  assert.equal(getShiftStatus(16 * 60 + 59).remaining, 1);
  assert.deepEqual(getShiftStatus(17 * 60), { phase: "after", remaining: 0, progress: 100 });
});

test("project attachments preserve original bytes, support batches and remain isolated by CV project id", async () => {
  const a = await addCvProjectFiles("cv-a", [new File(["drawing A"], "plan.dwg"), new File(["photo bytes"], "site.png")]);
  const b = await addCvProjectFiles("cv-b", [new File(["drawing B"], "plan.dwg")]);
  assert.equal(a.length, 2);
  assert.equal((await listCvProjectFiles("cv-a")).length, 2);
  assert.equal((await listCvProjectFiles("cv-b")).length, 1);
  assert.equal((await listCvProjectFiles("missing")).length, 0);
  assert.equal("blob" in a[0], false);
  assert.equal(await (await getCvProjectFileBlob("cv-a", a[0].id))?.text(), "drawing A");
  assert.equal(await (await getCvProjectFileBlob("cv-b", b[0].id))?.text(), "drawing B");
  assert.equal(await getCvProjectFileBlob("cv-a", b[0].id), null);
  await deleteCvProjectFile("cv-a", b[0].id); // cannot remove another project's file
  assert.equal((await listCvProjectFiles("cv-b")).length, 1);
  await deleteCvProjectFile("cv-a", a[0].id);
  assert.equal((await listCvProjectFiles("cv-a")).length, 1);
  assert.equal(await getCvProjectFileBlob("cv-a", a[0].id), null);
  assert.equal((await listCvProjectFiles("cv-b")).length, 1);
});

test("empty uploads are harmless and uploads without project ownership fail", async () => {
  assert.deepEqual(await addCvProjectFiles("cv-empty", []), []);
  await assert.rejects(addCvProjectFiles("", [new File(["bytes"], "x.txt")]));
  assert.deepEqual(await listCvProjectFiles("cv-empty"), []);
});
