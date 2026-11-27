import {
  ClassificationSuggestion,
  EngineeringDiscipline,
} from "../types/smartArchive";

/**
 * Content-based file classification.
 *
 * Extracts local text from text files, PDF and Office Open XML and derives
 * the engineering discipline, document type and suggested archive section/category
 * directly from the file's content — not just its name or extension.
 *
 * Binary CAD/BIM blobs and images are returned as `null` (no text to read), so the
 * caller falls back to the metadata heuristic in `smartClassifier.ts`.
 */

import { extractFileText } from "./fileTextExtraction";
export { isTextReadable } from "./fileTextExtraction";

interface ScoreGroup {
  keywords: string[];
}

const DISCIPLINE_GROUPS: Array<{ discipline: EngineeringDiscipline; group: ScoreGroup }> = [
  {
    discipline: "معماري (Architectural)",
    group: {
      keywords: [
        "architect", "معماري", "معمارية", "معمار", "واجهة", "facade", "floor plan", "بلان", "مسقط",
        "منظور", "تشطيب", "elevation", "architectural", "مخطط معماري",
      ],
    },
  },
  {
    discipline: "إنشائي (Structural)",
    group: {
      keywords: [
        "structural", "إنشائي", "اساسات", "أساسات", "قواعد", "خرسان", "خرسانة", "خرسانية", "تسليح",
        "rebar", "foundation", "slab", "beam", "column", "كمرة", "عمود", "هيكل",
        "steel", "حديد تسليح",
      ],
    },
  },
  {
    discipline: "ميكانيكا وتكييف (MEP / HVAC)",
    group: {
      keywords: [
        "hvac", "تكييف", "تهوية", "تبريد", "chiller", "duct", "ميكانيك", "ميكانيكا", "ميكانيكي", "ميكانيكية", " ahu",
        "فان", "مضخة", "pump", "boiler", "مبادل", "cooling", "mechanical", "دكت",
        "فريون", "compress",
      ],
    },
  },
  {
    discipline: "كهرباء (Electrical)",
    group: {
      keywords: [
        "electrical", "كهربا", "كهرباء", "كهربائي", "كهربائية", "إنارة", "إضاءة", "لوحات", "موزع", "كابل", "cable",
        "power", "lighting", "panel", "mdb", "smdb", "قواطع", "transformer", "مولد",
        "generator", "ups", "تيار", "low current", "低压",
      ],
    },
  },
  {
    discipline: "صحي ومكافحة حريق (Plumbing & FF)",
    group: {
      keywords: [
        "plumb", "plumbing", "سباكة", "صرف", "تغذية", "مياه", "fire", "حريق", "رشاش",
        "sprinkler", "firefighting", "صحي", "sanitary", "grpp", "upvc", "tank",
      ],
    },
  },
  {
    discipline: "مدني وبنية تحتية (Civil)",
    group: {
      keywords: [
        "civil", "مدني", "طرق", "شبكات", "بنية تحتية", "infrastructure", "grading",
        "road", "حفريات", "ردم", "asphalt", "manhole", "culvert",
      ],
    },
  },
  {
    discipline: "إدارة مشاريع وعقود (PM & Contracts)",
    group: {
      keywords: [
        "boq", "bill of quantities", "حصر كميات", "مستخلص", "عقد", "مواصفات",
        "tender", "مناقصة", "عطاء", "schedule", "جدول زمني", "contract",
        "specification", "rfi", "mir", "wir", "فاتورة", "invoice", "ميزانية",
        "budget", "بنود",
      ],
    },
  },
  {
    discipline: "تشغيل وصيانة (O&M)",
    group: {
      keywords: [
        "operation", "maintenance", "تشغيل", "صيانة", "maximo", "وقائية",
        "تصحيحية", "preventive", "corrective", "كفاءة", "availability", "موثوقية",
        "reliability", "om ", "o&m",
      ],
    },
  },
  {
    discipline: "مساحة وجيوتقنية (Survey)",
    group: {
      keywords: [
        "survey", "مساحة", "رفع مساحي", "توبوغرافي", "topographic", "contour",
        "جسات", "تربة", "geotech", "leveling", "منسوب",
      ],
    },
  },
];

const DOCTYPE_GROUPS: Array<{
  type: string;
  section: string;
  category: string;
  group: ScoreGroup;
}> = [
  {
    type: "حصر كميات / BOQ",
    section: "الجداول وحساب الكميات (BOQ)",
    category: "حصر كميات ومستخلصات (BOQ)",
    group: { keywords: ["bill of quantities", "boq", "حصر كميات", "جدول كميات", "schedule of rates", "quantities", "بنود"] },
  },
  {
    type: "عقد / اتفاقية",
    section: "المستندات والتقارير الفنية",
    category: "عقود واتفاقيات",
    group: { keywords: ["contract", "عقد", "اتفاقية", "agreement", "شروط عامة", "general conditions"] },
  },
  {
    type: "مواصفات فنية",
    section: "المستندات والتقارير الفنية",
    category: "تقارير ومواصفات فنية",
    group: { keywords: ["specification", "مواصفات", "spec ", "standard specification", "مخطط مواصفات"] },
  },
  {
    type: "مناقصة / Tender",
    section: "المستندات والتقارير الفنية",
    category: "كراسات ووثائق مناقصات",
    group: { keywords: ["tender", "مناقصة", "عطاء", "rfp", "bid ", "bidding"] },
  },
  {
    type: "مخطط تنفيذي (Shop Drawing)",
    section: "المخططات الهندسية (CAD)",
    category: "مخططات تنفيذية (Shop Drawings)",
    group: { keywords: ["shop drawing", "مخطط تنفيذي", "رسمة تنفيذية", "تفصيلي", "workshop drawing"] },
  },
  {
    type: "مطابق للواقع (As-Built)",
    section: "المخططات الهندسية (CAD)",
    category: "مخططات مطابق للواقع (As-Built)",
    group: { keywords: ["as built", "as-built", "مطابق للواقع", "مخطط مطابق"] },
  },
  {
    type: "أمر عمل / تشغيل وصيانة",
    section: "التشغيل والصيانة",
    category: "أوامر التشغيل والصيانة",
    group: { keywords: ["work order", "أمر عمل", "om order", "صيانة وقائية", "أمر صيانة"] },
  },
  {
    type: "تقرير فني",
    section: "المستندات والتقارير الفنية",
    category: "تقارير فنية",
    group: { keywords: ["report", "تقرير", "summary report", "تقرير فني", "تقرير أسبوعي"] },
  },
  {
    type: "شهادة / اعتماد",
    section: "العروض والاعتمادات",
    category: "شهادات واعتمادات",
    group: { keywords: ["certificate", "شهادة", "اعتماد", "تدريب", "training certificate", "iso ", "iso9001"] },
  },
  {
    type: "السيرة الذاتية (CV)",
    section: "العروض والاعتمادات",
    category: "سيرة ذاتية",
    group: { keywords: ["curriculum vitae", "السيرة الذاتية", "resume", "experience in", "خبرة في", "summary of experience"] },
  },
  {
    type: "مراسلات / خطابات",
    section: "المستندات والتقارير الفنية",
    category: "مراسلات ومذكرات",
    group: { keywords: ["letter", "خطاب", "مذكرة", "correspondence", "بريد", "email"] },
  },
  {
    type: "محضر اجتماع",
    section: "المستندات والتقارير الفنية",
    category: "محاضر اجتماعات",
    group: { keywords: ["minutes of meeting", "محضر اجتماع", "محضر", "meeting"] },
  },
  {
    type: "فهرس مخططات",
    section: "المخططات الهندسية (CAD)",
    category: "فهارس وجداول مخططات",
    group: { keywords: ["drawing list", "فهرس مخططات", "drawing index", "جدول مخططات", "list of drawings"] },
  },
  {
    type: "اعتماد مواد (Submittal)",
    section: "المستندات والتقارير الفنية",
    category: "مستندات واعتمادات مواد",
    group: { keywords: ["submittal", "مستند مواد", "material approval", "اعتماد مواد", "material submittal"] },
  },
  {
    type: "فحص واستلام (Inspection)",
    section: "التشغيل والصيانة",
    category: "تقارير فحص واستلام",
    group: { keywords: ["inspection", "فحص", "استلام", "receiving", "test report", "تقرير فحص"] },
  },
];

function normalizeContent(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[\u064B-\u065F\u0670]/g, "").replace(/[أإآ]/g, "ا");
}

function scoreKeywords(text: string, group: ScoreGroup): { hits: number; matched: string[] } {
  const matched: string[] = [];
  let hits = 0;
  for (const kw of group.keywords) {
    const k = normalizeContent(kw.trim());
    if (!k) continue;
    const term = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = /[\u0600-\u06ff]/.test(k) ? `(?:ال)?${term}` : /^[a-z]+$/.test(k) ? `${term}s?` : term;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, "iu");
    if (re.test(text)) {
      hits += 1;
      matched.push(k.length <= 18 ? k : k.slice(0, 18));
    }
  }
  return { hits, matched };
}

export interface ContentAnalysis {
  detectedDiscipline: EngineeringDiscipline;
  detectedDocumentType: string | null;
  suggestedSection: string | null;
  suggestedCategory: string | null;
  contentTags: string[];
  contentSnippet: string;
  confidenceBoost: number;
  method: "content-text";
}

/**
 * Reads and analyzes the readable text of a file to derive its engineering
 * discipline and document type from actual content.
 * Returns `null` when the file has no readable text (binary CAD/BIM, images, etc.).
 */
export async function analyzeFileContent(file: File): Promise<ContentAnalysis | null> {
  const head = await extractFileText(file);
  if (!head || head.trim().length < 12) return null;

  const text = normalizeContent(head);

  // Discipline scoring
  let bestDiscipline: EngineeringDiscipline = "عام / متعدد التخصصات";
  let bestDisciplineHits = 0;
  const disciplineTags: string[] = [];
  for (const d of DISCIPLINE_GROUPS) {
    const { hits, matched } = scoreKeywords(text, d.group);
    if (hits > bestDisciplineHits) {
      bestDisciplineHits = hits;
      bestDiscipline = d.discipline;
    }
    if (hits > 0) disciplineTags.push(...matched.slice(0, 2));
  }

  // Document type scoring
  let bestDoc: (typeof DOCTYPE_GROUPS)[number] | null = null;
  let bestDocHits = 0;
  for (const d of DOCTYPE_GROUPS) {
    const { hits, matched } = scoreKeywords(text, d.group);
    if (hits > bestDocHits) {
      bestDocHits = hits;
      bestDoc = d;
      if (matched[0]) disciplineTags.push(matched[0]);
    }
  }

  const snippet = head.replace(/\s+/g, " ").trim().slice(0, 220);

  // Confidence: content-derived signals weighted
  let boost = 0;
  if (bestDisciplineHits > 0) boost += Math.min(12, bestDisciplineHits * 3);
  if (bestDocHits > 0) boost += Math.min(10, bestDocHits * 4);

  if (!bestDisciplineHits && !bestDocHits) return null;

  return {
    detectedDiscipline: bestDiscipline,
    detectedDocumentType: bestDoc?.type ?? null,
    suggestedSection: bestDoc?.section ?? null,
    suggestedCategory: bestDoc?.category ?? null,
    contentTags: Array.from(new Set(disciplineTags)).slice(0, 6),
    contentSnippet: snippet,
    confidenceBoost: boost,
    method: "content-text",
  };
}

/**
 * Merges content-derived insights into a metadata-based suggestion, preferring
 * content signals when they are strong (non-generic).
 */
export function mergeContentInsight(
  base: ClassificationSuggestion,
  content: ContentAnalysis
): ClassificationSuggestion {
  const discipline =
    content.detectedDiscipline !== "عام / متعدد التخصصات"
      ? content.detectedDiscipline
      : base.detectedDiscipline;

  const section = content.suggestedSection || base.suggestedSection;
  const category = content.suggestedCategory || base.suggestedCategory;

  const tags = Array.from(
    new Set([...base.extractedTags, ...content.contentTags])
  ).slice(0, 14);

  // A rule-based estimate, not a statistically calibrated probability.
  const confidenceScore = Math.min(94, 70 + content.confidenceBoost);

  let analysisNote = "";
  if (content.detectedDocumentType) {
    analysisNote = `تم تحليل محتوى الملف النصي: نوع المستند «${content.detectedDocumentType}» من الكلمات المفتاحية داخل الملف. ${content.detectedDiscipline !== "عام / متعدد التخصصات" ? `التخصص المستنتج من المحتوى: «${discipline}».` : "التخصص لم يتضح من النص؛ احتُفظ باقتراح الاسم والامتداد."}`;
  } else if (content.detectedDiscipline !== "عام / متعدد التخصصات") {
    analysisNote = `تم استنتاج التخصص «${discipline}» من محتوى الملف النصي.`;
  }

  analysisNote += " التحليل محلي وقاعدي من عينة محدودة من النص؛ راجع الاقتراح قبل الاعتماد.";

  return {
    ...base,
    detectedDiscipline: discipline,
    suggestedSection: section,
    suggestedCategory: category,
    extractedTags: tags,
    confidenceScore,
    analysisMethod: "content-heuristic",
    analysisNote,
    isBinaryCadOrBim: base.isBinaryCadOrBim,
  };
}
