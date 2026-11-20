import {
  ArchiveFileGroup,
  ArchiveFolder,
  ClassificationSuggestion,
  EngineeringDiscipline,
} from "../types/smartArchive";

export interface ExistingProjectRef {
  id: string;
  name: string;
  city?: string;
  type?: string;
}

export interface SupportedExtensionSpec {
  ext: string;
  group: ArchiveFileGroup;
  label: string;
  defaultSection: string;
  defaultCategory: string;
  defaultFolderId: string;
  binaryCadOrBim: boolean;
}

export const SUPPORTED_EXTENSIONS: Record<string, SupportedExtensionSpec> = {
  // Office & Documents
  pdf: {
    ext: "PDF",
    group: "office",
    label: "مستند PDF",
    defaultSection: "المستندات والتقارير الفنية",
    defaultCategory: "مستندات واعتمادات PDF",
    defaultFolderId: "fld-specs-contracts",
    binaryCadOrBim: false,
  },
  doc: {
    ext: "DOC",
    group: "office",
    label: "مستند Word (DOC)",
    defaultSection: "المستندات والتقارير الفنية",
    defaultCategory: "تقارير ومواصفات فنية",
    defaultFolderId: "fld-specs-contracts",
    binaryCadOrBim: false,
  },
  docx: {
    ext: "DOCX",
    group: "office",
    label: "مستند Word (DOCX)",
    defaultSection: "المستندات والتقارير الفنية",
    defaultCategory: "تقارير ومواصفات فنية",
    defaultFolderId: "fld-specs-contracts",
    binaryCadOrBim: false,
  },
  xls: {
    ext: "XLS",
    group: "office",
    label: "جدول Excel (XLS)",
    defaultSection: "الجداول وحساب الكميات (BOQ)",
    defaultCategory: "حصر كميات وجداول حسابية",
    defaultFolderId: "fld-boq-schedules",
    binaryCadOrBim: false,
  },
  xlsx: {
    ext: "XLSX",
    group: "office",
    label: "جدول Excel (XLSX)",
    defaultSection: "الجداول وحساب الكميات (BOQ)",
    defaultCategory: "حصر كميات وجداول حسابية",
    defaultFolderId: "fld-boq-schedules",
    binaryCadOrBim: false,
  },
  ppt: {
    ext: "PPT",
    group: "office",
    label: "عرض تقديمي (PPT)",
    defaultSection: "العروض والاعتمادات",
    defaultCategory: "عروض تقديمية واجتماعات",
    defaultFolderId: "fld-specs-contracts",
    binaryCadOrBim: false,
  },
  pptx: {
    ext: "PPTX",
    group: "office",
    label: "عرض تقديمي (PPTX)",
    defaultSection: "العروض والاعتمادات",
    defaultCategory: "عروض تقديمية واجتماعات",
    defaultFolderId: "fld-specs-contracts",
    binaryCadOrBim: false,
  },

  // CAD Formats
  dwg: {
    ext: "DWG",
    group: "cad",
    label: "مخطط AutoCAD (DWG)",
    defaultSection: "المخططات الهندسية (CAD)",
    defaultCategory: "مخططات تنفيذية وتصميمية",
    defaultFolderId: "fld-arch-drawings",
    binaryCadOrBim: true,
  },
  dxf: {
    ext: "DXF",
    group: "cad",
    label: "ملف تبادل الرسم (DXF)",
    defaultSection: "المخططات الهندسية (CAD)",
    defaultCategory: "ملفات تبادل مخططات CAD",
    defaultFolderId: "fld-arch-drawings",
    binaryCadOrBim: false, // ASCII/Binary DXF header/entities can be safely inspected if ASCII
  },
  dwt: {
    ext: "DWT",
    group: "cad",
    label: "قالب AutoCAD قياسي (DWT)",
    defaultSection: "المخططات الهندسية (CAD)",
    defaultCategory: "قوالب ومعايير الرسم",
    defaultFolderId: "fld-arch-drawings",
    binaryCadOrBim: true,
  },
  dws: {
    ext: "DWS",
    group: "cad",
    label: "ملف معايير AutoCAD (DWS)",
    defaultSection: "المخططات الهندسية (CAD)",
    defaultCategory: "قوالب ومعايير الرسم",
    defaultFolderId: "fld-arch-drawings",
    binaryCadOrBim: true,
  },

  // BIM & Revit Formats
  rvt: {
    ext: "RVT",
    group: "bim",
    label: "مشروع Autodesk Revit (RVT)",
    defaultSection: "نماذج معلومات البناء (BIM)",
    defaultCategory: "نماذج BIM المركزية",
    defaultFolderId: "fld-bim-models",
    binaryCadOrBim: true,
  },
  rfa: {
    ext: "RFA",
    group: "bim",
    label: "عائلة Revit (RFA)",
    defaultSection: "نماذج معلومات البناء (BIM)",
    defaultCategory: "مكتبة عائلات وعناصر BIM",
    defaultFolderId: "fld-bim-models",
    binaryCadOrBim: true,
  },
  rte: {
    ext: "RTE",
    group: "bim",
    label: "قالب مشروع Revit (RTE)",
    defaultSection: "نماذج معلومات البناء (BIM)",
    defaultCategory: "قوالب مشاريع BIM",
    defaultFolderId: "fld-bim-models",
    binaryCadOrBim: true,
  },
  ifc: {
    ext: "IFC",
    group: "bim",
    label: "نموذج OpenBIM قياسي (IFC)",
    defaultSection: "نماذج معلومات البناء (BIM)",
    defaultCategory: "نماذج التبادل المفتوح IFC",
    defaultFolderId: "fld-bim-models",
    binaryCadOrBim: false, // STEP physical file text header can be read safely
  },

  // Navisworks & Design Review
  nwc: {
    ext: "NWC",
    group: "navisworks",
    label: "ملف كاش Navisworks (NWC)",
    defaultSection: "التنسيق والفحص (Navisworks & DWF)",
    defaultCategory: "تنسيق النماذج وفحص التعارضات",
    defaultFolderId: "fld-clash-coord",
    binaryCadOrBim: true,
  },
  nwd: {
    ext: "NWD",
    group: "navisworks",
    label: "مستند Navisworks مجمّع (NWD)",
    defaultSection: "التنسيق والفحص (Navisworks & DWF)",
    defaultCategory: "تنسيق النماذج وفحص التعارضات",
    defaultFolderId: "fld-clash-coord",
    binaryCadOrBim: true,
  },
  dwf: {
    ext: "DWF",
    group: "navisworks",
    label: "ملف مراجعة التصميم (DWF)",
    defaultSection: "التنسيق والفحص (Navisworks & DWF)",
    defaultCategory: "مراجعات التصميم والاعتماد",
    defaultFolderId: "fld-clash-coord",
    binaryCadOrBim: true,
  },
  dwfx: {
    ext: "DWFx",
    group: "navisworks",
    label: "ملف مراجعة التصميم (DWFx)",
    defaultSection: "التنسيق والفحص (Navisworks & DWF)",
    defaultCategory: "مراجعات التصميم والاعتماد",
    defaultFolderId: "fld-clash-coord",
    binaryCadOrBim: true,
  },

  // Images & Vector Graphics
  jpg: {
    ext: "JPG",
    group: "image",
    label: "صورة فوتوغرافية (JPG)",
    defaultSection: "الصور والتوثيق الميداني",
    defaultCategory: "صور الموقع والتوثيق البصري",
    defaultFolderId: "fld-site-photos",
    binaryCadOrBim: false,
  },
  jpeg: {
    ext: "JPG",
    group: "image",
    label: "صورة فوتوغرافية (JPEG)",
    defaultSection: "الصور والتوثيق الميداني",
    defaultCategory: "صور الموقع والتوثيق البصري",
    defaultFolderId: "fld-site-photos",
    binaryCadOrBim: false,
  },
  png: {
    ext: "PNG",
    group: "image",
    label: "صورة عالية الدقة (PNG)",
    defaultSection: "الصور والتوثيق الميداني",
    defaultCategory: "لقطات ومناظير معمارية",
    defaultFolderId: "fld-site-photos",
    binaryCadOrBim: false,
  },
  tif: {
    ext: "TIFF",
    group: "image",
    label: "مسح ضوئي / صورة هندسية (TIFF)",
    defaultSection: "الصور والتوثيق الميداني",
    defaultCategory: "مخططات ممسوحة ضوئيًا",
    defaultFolderId: "fld-site-photos",
    binaryCadOrBim: false,
  },
  tiff: {
    ext: "TIFF",
    group: "image",
    label: "مسح ضوئي / صورة هندسية (TIFF)",
    defaultSection: "الصور والتوثيق الميداني",
    defaultCategory: "مخططات ممسوحة ضوئيًا",
    defaultFolderId: "fld-site-photos",
    binaryCadOrBim: false,
  },
  svg: {
    ext: "SVG",
    group: "image",
    label: "رسم متجهي (SVG)",
    defaultSection: "الصور والتوثيق الميداني",
    defaultCategory: "رسوم متجهية وتفاصيل بيانية",
    defaultFolderId: "fld-site-photos",
    binaryCadOrBim: false,
  },
};

export const ACCEPT_FILE_EXTENSIONS = Object.keys(SUPPORTED_EXTENSIONS)
  .map((k) => `.${k}`)
  .join(",");

export const ALL_DISCIPLINES: EngineeringDiscipline[] = [
  "معماري (Architectural)",
  "إنشائي (Structural)",
  "ميكانيكا وتكييف (MEP / HVAC)",
  "كهرباء (Electrical)",
  "صحي ومكافحة حريق (Plumbing & FF)",
  "مدني وبنية تحتية (Civil)",
  "إدارة مشاريع وعقود (PM & Contracts)",
  "تشغيل وصيانة (O&M)",
  "مساحة وجيوتقنية (Survey)",
  "عام / متعدد التخصصات",
];

const DISCIPLINE_PATTERNS: Array<{
  discipline: EngineeringDiscipline;
  regex: RegExp;
}> = [
  {
    discipline: "معماري (Architectural)",
    regex:
      /(?:^|[-_\s.])(arch|ar|a-\d|معمار|معماري|واجهات|واجهة|مسقط|منظور|تشطيبات|elevation|facade|floor[\s_-]?plan)(?:$|[-_\s.\d])/i,
  },
  {
    discipline: "إنشائي (Structural)",
    regex:
      /(?:^|[-_\s.])(str|struct|st|s-\d|انشائ|إنشائ|قواعد|أساسات|اساسات|تسليح|خرسان|أعمدة|اعمدة|كمرات|rebar|foundation|slab|beam)(?:$|[-_\s.\d])/i,
  },
  {
    discipline: "ميكانيكا وتكييف (MEP / HVAC)",
    regex:
      /(?:^|[-_\s.])(mep|hvac|mech|m-\d|ميكانيك|تكييف|تهوية|دكت|تبريد|chiller|duct)(?:$|[-_\s.\d])/i,
  },
  {
    discipline: "كهرباء (Electrical)",
    regex:
      /(?:^|[-_\s.])(elec|el|e-\d|كهربا|إنارة|انارة|جهد|لوحات|تيار|lighting|power|low[\s_-]?current)(?:$|[-_\s.\d])/i,
  },
  {
    discipline: "صحي ومكافحة حريق (Plumbing & FF)",
    regex:
      /(?:^|[-_\s.])(plumb|pl|ff|fire|p-\d|صحي|سباكة|صرف|تغذية|حريق|رشاشات|drainage|sprinkler)(?:$|[-_\s.\d])/i,
  },
  {
    discipline: "مدني وبنية تحتية (Civil)",
    regex:
      /(?:^|[-_\s.])(civ|civil|infra|c-\d|مدني|طرق|بنية|شبكات|مناسيب|grading|road)(?:$|[-_\s.\d])/i,
  },
  {
    discipline: "مساحة وجيوتقنية (Survey)",
    regex:
      /(?:^|[-_\s.])(surv|topo|geo|مساح|رفع[\s_-]?مساحي|تربة|جسات|كنتور)(?:$|[-_\s.\d])/i,
  },
  {
    discipline: "تشغيل وصيانة (O&M)",
    regex:
      /(?:^|[-_\s.])(om|o&m|maint|صيانة|تشغيل|فحص[\s_-]?دوري|أعطال)(?:$|[-_\s.\d])/i,
  },
  {
    discipline: "إدارة مشاريع وعقود (PM & Contracts)",
    regex:
      /(?:^|[-_\s.])(boq|contract|spec|tender|rfi|mir|wir|عقد|عقود|كميات|مواصفات|مستخلص|جدول[\s_-]?زمني|محضر)(?:$|[-_\s.\d])/i,
  },
];

function toIsoDateString(timestamp: number): string {
  const d = new Date(timestamp || Date.now());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function extractDateFromFilename(baseName: string, fallbackMs: number): {
  date: string;
  foundInName: boolean;
} {
  // Match YYYY-MM-DD or YYYY_MM_DD or YYYY.MM.DD
  const ymd = baseName.match(/\b(20\d{2})[-_.](0[1-9]|1[0-2])[-_.](0[1-9]|[12]\d|3[01])\b/);
  if (ymd) {
    return { date: `${ymd[1]}-${ymd[2]}-${ymd[3]}`, foundInName: true };
  }
  // Match DD-MM-YYYY
  const dmy = baseName.match(/\b(0[1-9]|[12]\d|3[01])[-_.](0[1-9]|1[0-2])[-_.](20\d{2})\b/);
  if (dmy) {
    return { date: `${dmy[3]}-${dmy[2]}-${dmy[1]}`, foundInName: true };
  }
  // Match compact YYYYMMDD
  const compact = baseName.match(/\b(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/);
  if (compact) {
    return { date: `${compact[1]}-${compact[2]}-${compact[3]}`, foundInName: true };
  }
  return { date: toIsoDateString(fallbackMs), foundInName: false };
}

function extractDrawingAndRevision(baseName: string): {
  drawingCode?: string;
  revision?: string;
} {
  const revMatch = baseName.match(/(?:^|[-_\s])(rev[-_.\s]?[a-z0-9]+|r\d{1,2}|p\d{1,2}|c\d{1,2})(?:$|[-_\s])/i);
  const codeMatch = baseName.match(/\b([A-Z]{1,4}[-_]\d{2,5}(?:[-_][A-Z0-9]{1,4})?)\b/i);
  return {
    drawingCode: codeMatch ? codeMatch[1].toUpperCase() : undefined,
    revision: revMatch ? revMatch[1].toUpperCase().replace(/\s+/g, "") : undefined,
  };
}

function detectProjectFromFilename(
  baseName: string,
  projects: ExistingProjectRef[]
): { projectId: string; projectName: string } {
  const normalized = baseName.toLowerCase();

  for (const p of projects) {
    const pName = p.name.trim().toLowerCase();
    if (pName && normalized.includes(pName)) {
      return { projectId: p.id, projectName: p.name };
    }
    // Check distinctive multi-character words from project name (excluding generic words)
    const genericWords = new Set(["مشروع", "مجمع", "مبنى", "فيلا", "صيانة", "برج", "شركة"]);
    const tokens = pName
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !genericWords.has(w));
    for (const token of tokens) {
      if (normalized.includes(token)) {
        return { projectId: p.id, projectName: p.name };
      }
    }
  }

  // ISO-19650 style prefix e.g. PRJ01-ARC-001 or NAKHEEL_STR_101
  const prefixMatch = baseName.match(/^([A-Za-z\u0600-\u06FF]{3,20}[-_?\d]{0,4})[-_]/);
  if (prefixMatch) {
    const candidate = prefixMatch[1].replace(/[-_]/g, " ").trim();
    if (candidate.length >= 3 && !/^(rev|dwg|cad|bim|doc|img|pic)/i.test(candidate)) {
      return { projectId: "", projectName: candidate };
    }
  }

  return { projectId: "", projectName: "" };
}

/**
 * Safely reads only the first few KB of open ASCII formats (IFC / ASCII DXF)
 * without mutating the File/Blob, to extract standard header metadata if available.
 */
async function inspectSafeOpenHeader(
  file: File,
  extLower: string
): Promise<{ extraTags: string[]; headerHint?: string; headerDate?: string }> {
  const extraTags: string[] = [];
  try {
    if (extLower === "ifc") {
      const headText = await file.slice(0, 8192).text();
      if (headText.includes("ISO-10303-21")) {
        const schemaMatch = headText.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i);
        if (schemaMatch) {
          extraTags.push(schemaMatch[1]);
        }
        const dateMatch = headText.match(/'(20\d{2}-\d{2}-\d{2})T/);
        return {
          extraTags,
          headerHint: schemaMatch
            ? `تم التحقق من ترويسة OpenBIM القياسية (${schemaMatch[1]}).`
            : "تم التحقق من ترويسة ملف IFC القياسية.",
          headerDate: dateMatch ? dateMatch[1] : undefined,
        };
      }
    } else if (extLower === "dxf") {
      const headText = await file.slice(0, 4096).text();
      if (headText.includes("SECTION") && headText.includes("HEADER")) {
        const verMatch = headText.match(/\$ACADVER[\s\r\n]+1[\s\r\n]+(AC\d+)/);
        if (verMatch) extraTags.push(`DXF-${verMatch[1]}`);
        return {
          extraTags,
          headerHint: "ملف DXF نصي قابل للمعاينة الثنائية الأبعاد في المتصفح.",
        };
      }
    }
  } catch {
    // Ignore slice read issues silently
  }
  return { extraTags };
}

export async function classifyFileSmart(
  file: File,
  projects: ExistingProjectRef[],
  folders: ArchiveFolder[]
): Promise<ClassificationSuggestion> {
  const parts = file.name.split(".");
  const extLower = parts.length > 1 ? parts.pop()!.toLowerCase() : "";
  const baseName = parts.join(".");

  const spec: SupportedExtensionSpec = SUPPORTED_EXTENSIONS[extLower] ?? {
    ext: (extLower || "FILE").toUpperCase(),
    group: "other",
    label: `ملف (${(extLower || "غير معروف").toUpperCase()})`,
    defaultSection: "المستندات والتقارير الفنية",
    defaultCategory: "ملفات عامة",
    defaultFolderId: folders[0]?.id || "",
    binaryCadOrBim: false,
  };

  // Detect discipline from filename keywords/codes
  let detectedDiscipline: EngineeringDiscipline = "عام / متعدد التخصصات";
  for (const item of DISCIPLINE_PATTERNS) {
    if (item.regex.test(baseName)) {
      detectedDiscipline = item.discipline;
      break;
    }
  }

  // Refine default discipline by format if still general
  if (detectedDiscipline === "عام / متعدد التخصصات") {
    if (spec.ext === "XLS" || spec.ext === "XLSX") {
      detectedDiscipline = "إدارة مشاريع وعقود (PM & Contracts)";
    } else if (spec.group === "bim" || spec.group === "cad") {
      detectedDiscipline = "معماري (Architectural)";
    }
  }

  // Refine category & folder based on filename keywords (e.g., As-Built, BOQ, Shop Drawing)
  let suggestedCategory = spec.defaultCategory;
  let suggestedFolderId = spec.defaultFolderId;

  if (/as[-_\s]?built|مطابق/i.test(baseName) && spec.group === "cad") {
    suggestedCategory = "مخططات مطابق للواقع (As-Built)";
    suggestedFolderId = "fld-as-built";
  } else if (/shop[-_\s]?drawing|تنفيذي|تفصيلي/i.test(baseName) && spec.group === "cad") {
    suggestedCategory = "مخططات تنفيذية (Shop Drawings)";
    suggestedFolderId = "fld-arch-drawings";
  } else if (/boq|كميات|حصر|مستخلص/i.test(baseName)) {
    suggestedCategory = "جداول كميات ومستخلصات (BOQ)";
    suggestedFolderId = "fld-boq-schedules";
  } else if (/clash|تعارض|تنسيق/i.test(baseName)) {
    suggestedCategory = "تقارير ونماذج فحص التعارضات";
    suggestedFolderId = "fld-clash-coord";
  }

  // Ensure suggestedFolderId exists in current folders list
  if (!folders.some((f) => f.id === suggestedFolderId)) {
    const matchingSectionFolder = folders.find(
      (f) => f.section === spec.defaultSection
    );
    suggestedFolderId = matchingSectionFolder?.id || folders[0]?.id || "";
  }

  const { date: dateFromName, foundInName } = extractDateFromFilename(
    baseName,
    file.lastModified
  );
  const { drawingCode, revision } = extractDrawingAndRevision(baseName);
  const { projectId, projectName } = detectProjectFromFilename(
    baseName,
    projects
  );

  const { extraTags, headerHint, headerDate } = await inspectSafeOpenHeader(
    file,
    extLower
  );

  const finalDate = foundInName ? dateFromName : headerDate || dateFromName;

  const tags = new Set<string>([spec.ext, ...extraTags]);
  if (drawingCode) tags.add(drawingCode);
  if (revision) tags.add(revision);
  if (/as[-_\s]?built|مطابق/i.test(baseName)) tags.add("As-Built");
  if (/shop|تنفيذي/i.test(baseName)) tags.add("Shop-Drawing");

  let confidenceScore = 65;
  if (SUPPORTED_EXTENSIONS[extLower]) confidenceScore += 12;
  if (projectId) confidenceScore += 10;
  if (foundInName) confidenceScore += 6;
  if (drawingCode || revision) confidenceScore += 5;
  confidenceScore = Math.min(96, confidenceScore);

  let analysisNote = "";
  if (spec.binaryCadOrBim) {
    analysisNote =
      "تم التصنيف استنادًا إلى الامتداد الهندسي وتسمية الملف وتاريخ التعديل فقط — لا يتم تحليل المحتوى الهندسي الداخلي لملفات CAD/Revit الثنائية بدون ربط أداة متخصصة (مثل Autodesk APS / BIM Server).";
  } else if (headerHint) {
    analysisNote = `${headerHint} تم استخراج البيانات المقترحة من التسمية والبيانات الوصفية المتاحة ويمكنك تعديلها قبل الاعتماد.`;
  } else {
    analysisNote =
      "تم استنتاج القسم والتخصص والتاريخ من امتداد الملف ونمط التسمية والبيانات الوصفية المتاحة؛ راجع الحقول وعدّلها يدويًا قبل الاعتماد.";
  }

  return {
    extension: spec.ext,
    mimeType: file.type || "application/octet-stream",
    fileGroup: spec.group,
    fileTypeLabel: spec.label,
    suggestedSection: spec.defaultSection,
    suggestedCategory,
    suggestedFolderId,
    detectedProjectId: projectId,
    detectedProjectName: projectName,
    detectedDiscipline,
    detectedDocumentDate: finalDate,
    detectedDrawingCode: drawingCode,
    detectedRevision: revision,
    extractedTags: Array.from(tags),
    confidenceScore,
    analysisMethod: "heuristic-metadata",
    analysisNote,
    isBinaryCadOrBim: spec.binaryCadOrBim,
  };
}
