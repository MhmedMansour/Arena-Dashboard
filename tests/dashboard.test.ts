import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import {
  buildNavTabs,
  DEFAULT_TAB_ORDER,
} from "../src/components/navIcons";
import {
  buildMonthGrid,
  clampDateToMonth,
  defaultDateInMonth,
  formatMonthArabic,
  parseMonthKey,
  shiftMonthKey,
  toDateKey,
  toMonthKey,
} from "../src/utils/date";
import {
  inspectBinaryEngineeringOrGenericFile,
  inspectFileForPreview,
  parseDelimitedRows,
  parseDocxBuffer,
  parsePptxBuffer,
  parseXlsxBuffer,
} from "../src/services/filePreviewService";

test("navigation builder includes calendar, applies custom labels/order, and preserves all tabs", () => {
  assert.ok(DEFAULT_TAB_ORDER.includes("calendar"));
  const tabs = buildNavTabs({
    order: ["cv", "calendar", "overview"],
    iconOverrides: { cv: "star", calendar: "unknown-icon" },
    labels: { calendar: "جدول الشهر", cv: "ملفي المهني" },
  });

  assert.equal(tabs[0]?.id, "cv");
  assert.equal(tabs[0]?.iconName, "star");
  assert.equal(tabs[0]?.label, "ملفي المهني");
  assert.equal(tabs[1]?.id, "calendar");
  assert.equal(tabs[1]?.label, "جدول الشهر");
  assert.equal(tabs[2]?.id, "overview");
  assert.equal(tabs.length, DEFAULT_TAB_ORDER.length);
  assert.ok(tabs.some((t) => t.id === "settings"));
});

test("month-linked calendar utilities shift, clamp, and build 42-cell month grids", () => {
  assert.equal(toMonthKey(2026, 10), "2026-11");
  assert.deepEqual(parseMonthKey("2026-11"), { year: 2026, month: 10 });
  assert.equal(shiftMonthKey("2026-01", -1), "2025-12");
  assert.equal(shiftMonthKey("2026-12", 1), "2027-01");
  assert.equal(clampDateToMonth("2026-01-31", "2026-02"), "2026-02-28");
  assert.equal(defaultDateInMonth("2026-02", 31), "2026-02-28");
  assert.ok(formatMonthArabic("2026-11").includes("نوفمبر"));

  const grid = buildMonthGrid(2026, 10);
  assert.equal(grid.length, 42);
  const novDays = grid.filter((d) => d.getMonth() === 10);
  assert.equal(novDays.length, 30);
  assert.equal(toDateKey(novDays[0]!), "2026-11-01");
  assert.equal(toDateKey(novDays[29]!), "2026-11-30");
});

test("CSV/TSV parser extracts headers and rows cleanly", () => {
  const csv = `Code,System,Quantity\n"WO-101","HVAC, Chiller",4\nWO-102,Electrical,12`;
  const rows = parseDelimitedRows(csv, ",");
  assert.deepEqual(rows[0], ["Code", "System", "Quantity"]);
  assert.equal(rows.length, 3);
  assert.equal(rows[1]?.[1], "HVAC, Chiller");
});

test("OOXML Word (.docx), Excel (.xlsx), and PowerPoint (.pptx) buffers render structured previews", () => {
  // 1. Minimal DOCX archive
  const docxArchive = zipSync({
    "word/document.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/wml">
        <w:body>
          <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>تقرير فحص التكييف</w:t></w:r></w:p>
          <w:p><w:r><w:t>تم فحص الشيلرات بنجاح.</w:t></w:r></w:p>
          <w:tbl>
            <w:tr><w:tc><w:p><w:r><w:t>المعدة</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>الحالة</w:t></w:r></w:p></w:tc></w:tr>
            <w:tr><w:tc><w:p><w:r><w:t>Chiller-01</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>سليم</w:t></w:r></w:p></w:tc></w:tr>
          </w:tbl>
        </w:body>
      </w:document>`
    ),
  });
  const docBlocks = parseDocxBuffer(docxArchive, []);
  assert.equal(docBlocks.length, 3);
  assert.equal(docBlocks[0]?.type, "heading");
  assert.equal(docBlocks[1]?.type, "paragraph");
  assert.equal(docBlocks[2]?.type, "table");
  assert.equal(docBlocks[2]?.rows?.[1]?.[0], "Chiller-01");

  // 2. Minimal XLSX archive
  const xlsxArchive = zipSync({
    "xl/workbook.xml": strToU8(
      `<workbook><sheets><sheet name="MEP_BOQ" sheetId="1"/></sheets></workbook>`
    ),
    "xl/sharedStrings.xml": strToU8(
      `<sst><si><t>البند</t></si><si><t>الكمية</t></si><si><t>كابل نحاس</t></si></sst>`
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      `<worksheet><sheetData>
        <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
        <row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>250</v></c></row>
      </sheetData></worksheet>`
    ),
  });
  const sheets = parseXlsxBuffer(xlsxArchive);
  assert.equal(sheets.length, 1);
  assert.equal(sheets[0]?.name, "MEP_BOQ");
  assert.deepEqual(sheets[0]?.rows[0], ["البند", "الكمية"]);
  assert.deepEqual(sheets[0]?.rows[1], ["كابل نحاس", "250"]);

  // 3. Minimal PPTX archive
  const pptxArchive = zipSync({
    "ppt/slides/slide1.xml": strToU8(
      `<p:sld><p:cSld><p:spTree>
        <p:sp><p:txBody><a:p><a:r><a:t>عرض مشروع المستشفى</a:t></a:r></a:p></p:txBody></p:sp>
        <p:sp><p:txBody><a:p><a:r><a:t>نسبة الإنجاز 92%</a:t></a:r></a:p></p:txBody></p:sp>
      </p:spTree></p:cSld></p:sld>`
    ),
  });
  const slides = parsePptxBuffer(pptxArchive, []);
  assert.equal(slides.length, 1);
  assert.equal(slides[0]?.title, "عرض مشروع المستشفى");
  assert.deepEqual(slides[0]?.bullets, ["نسبة الإنجاز 92%"]);
});

test("universal file preview inspects DXF, IFC MEP elements, and binary DWG headers", async () => {
  // DXF wireframe
  const dxfText = [
    "0",
    "SECTION",
    "2",
    "ENTITIES",
    "0",
    "LINE",
    "8",
    "HVAC-DUCT",
    "10",
    "0",
    "20",
    "0",
    "11",
    "120",
    "21",
    "80",
    "0",
    "ENDSEC",
    "0",
    "EOF",
  ].join("\n");
  const dxfRes = await inspectFileForPreview({
    name: "Floor1_HVAC.dxf",
    blob: new Blob([dxfText], { type: "text/plain" }),
  });
  assert.equal(dxfRes.kind, "dxf");
  assert.equal(dxfRes.dxf.lines.length, 1);

  // IFC MEP metadata
  const ifcText = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('MEP.ifc','2026-11-28',(''),(''),'','Autodesk Revit 2025','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#10=IFCDUCTSEGMENT('1',#2,$,$,$,#3,#4,$);
#11=IFCPIPESEGMENT('2',#2,$,$,$,#5,#6,$);
ENDSEC;`;
  const ifcRes = await inspectFileForPreview({
    name: "Hospital_MEP.ifc",
    blob: new Blob([ifcText], { type: "text/plain" }),
  });
  assert.equal(ifcRes.kind, "ifc");
  assert.equal(ifcRes.ifc.schema, "IFC4");
  assert.ok(
    ifcRes.ifc.elementCounts.some(
      (c) => c.label.includes("مجاري تكييف") && c.count === 1
    )
  );

  // Binary DWG header inspection
  const dwgBytes = new Uint8Array(64);
  const sig = strToU8("AC1032");
  dwgBytes.set(sig, 0);
  const binInfo = inspectBinaryEngineeringOrGenericFile(dwgBytes, "dwg", []);
  assert.ok(binInfo.formatFamily.includes("AutoCAD DWG"));
  assert.ok(binInfo.versionHint?.includes("2018"));
});
