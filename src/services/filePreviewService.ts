import { unzipSync, strFromU8 } from "fflate";
import {
  DxfPreviewData,
  IfcHeaderInspection,
  inspectIfcStepMetadata,
  parseAsciiDxfPreview,
} from "../utils/dxfPreview";

export interface PreviewTarget {
  id?: string;
  name: string;
  size?: number;
  mimeType?: string;
  blob?: Blob | File | null;
  /** Static URL for built-in assets such as ./cv/Mohamed_Mansour_CV.pdf or ./art/1.svg */
  url?: string;
  projectName?: string;
  category?: string;
  notes?: string;
  addedAt?: number;
}

export interface DocxBlock {
  type: "heading" | "paragraph" | "table" | "image";
  level?: 1 | 2 | 3;
  text?: string;
  bold?: boolean;
  rows?: string[][];
  imageUrl?: string;
}

export interface SpreadsheetSheet {
  name: string;
  rows: string[][];
}

export interface PptxSlide {
  index: number;
  title: string;
  bullets: string[];
  imageUrls: string[];
}

export interface ZipEntryInfo {
  name: string;
  size: number;
  isDir: boolean;
}

export interface BinaryInspectionInfo {
  formatFamily: string;
  versionHint?: string;
  details: string[];
  embeddedImageUrls: string[];
  extractedStringsSample?: string;
  hexHeader: string;
}

export type ResolvedPreviewResult =
  | { kind: "pdf"; ext: string; bytes: Uint8Array; objectUrl: string; revokeUrls: string[] }
  | { kind: "image"; ext: string; srcUrl: string; revokeUrls: string[] }
  | { kind: "video"; ext: string; srcUrl: string; mimeType: string; revokeUrls: string[] }
  | { kind: "audio"; ext: string; srcUrl: string; mimeType: string; revokeUrls: string[] }
  | { kind: "docx"; ext: string; blocks: DocxBlock[]; revokeUrls: string[] }
  | { kind: "spreadsheet"; ext: string; sheets: SpreadsheetSheet[]; revokeUrls: string[] }
  | { kind: "pptx"; ext: string; slides: PptxSlide[]; revokeUrls: string[] }
  | { kind: "dxf"; ext: string; dxf: DxfPreviewData; revokeUrls: string[] }
  | { kind: "ifc"; ext: string; ifc: IfcHeaderInspection; headerSample: string; revokeUrls: string[] }
  | { kind: "zip"; ext: string; entries: ZipEntryInfo[]; totalEntries: number; revokeUrls: string[] }
  | { kind: "text"; ext: string; content: string; languageHint: string; truncated: boolean; revokeUrls: string[] }
  | { kind: "binary-inspector"; ext: string; info: BinaryInspectionInfo; revokeUrls: string[] };

const IMAGE_EXTS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
  "avif",
  "tiff",
  "tif",
]);

const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "m4v", "ogv"]);
const AUDIO_EXTS = new Set(["mp3", "wav", "ogg", "m4a", "aac", "flac", "opus"]);

const TEXT_EXTS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "jsonl",
  "xml",
  "html",
  "htm",
  "xhtml",
  "yml",
  "yaml",
  "toml",
  "ini",
  "cfg",
  "conf",
  "log",
  "sql",
  "js",
  "jsx",
  "ts",
  "tsx",
  "css",
  "scss",
  "py",
  "java",
  "c",
  "cpp",
  "h",
  "cs",
  "go",
  "rb",
  "php",
  "sh",
  "bat",
  "ps1",
  "step",
  "stp",
  "igs",
  "iges",
  "asc",
  "plt",
  "dat",
  "rtf",
  "env",
]);

const DWG_VERSIONS: Record<string, string> = {
  AC1009: "AutoCAD R11 / R12",
  AC1012: "AutoCAD R13",
  AC1014: "AutoCAD R14",
  AC1015: "AutoCAD 2000 / 2002",
  AC1018: "AutoCAD 2004 / 2006",
  AC1021: "AutoCAD 2007 / 2009",
  AC1024: "AutoCAD 2010 / 2012",
  AC1027: "AutoCAD 2013 / 2017",
  AC1032: "AutoCAD 2018 – 2026",
};

function getExt(name: string): string {
  const parts = name.trim().split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n: string) => {
      const code = n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : " ";
    })
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function guessImageMime(path: string): string {
  const ext = getExt(path);
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "svg") return "image/svg+xml";
  if (ext === "bmp") return "image/bmp";
  return "application/octet-stream";
}

/**
 * Parses CSV or TSV text into 2D rows handling quoted fields and escaped quotes.
 */
export function parseDelimitedRows(text: string, forcedSep?: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] || "";
  const sep =
    forcedSep ||
    (firstLine.includes("\t")
      ? "\t"
      : firstLine.split(";").length > firstLine.split(",").length
        ? ";"
        : ",");

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === sep) {
      row.push(field.trim());
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(field.trim());
      field = "";
      if (row.some((c) => c !== "") || rows.length > 0) {
        rows.push(row);
      }
      row = [];
      if (rows.length >= 400) break;
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((c) => c !== "")) rows.push(row);
  }
  return rows;
}

function colLettersToIndex(colLetters: string): number {
  let idx = 0;
  for (let i = 0; i < colLetters.length; i++) {
    const code = colLetters.toUpperCase().charCodeAt(i) - 64;
    if (code >= 1 && code <= 26) {
      idx = idx * 26 + code;
    }
  }
  return Math.max(0, idx - 1);
}

/**
 * Extracts structured blocks (headings, paragraphs, tables, embedded images) from a .docx buffer.
 */
export function parseDocxBuffer(bytes: Uint8Array, revokeUrls: string[]): DocxBlock[] {
  const entries = unzipSync(bytes, {
    filter: (e) =>
      e.originalSize <= 6_000_000 &&
      (e.name === "word/document.xml" ||
        e.name === "word/_rels/document.xml.rels" ||
        /^word\/media\/.+\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(e.name)),
  });

  const docXmlBytes = entries["word/document.xml"];
  if (!docXmlBytes) return [];

  // Map relationship IDs (rIdX) -> object URLs for embedded images
  const relMap = new Map<string, string>();
  const relsBytes = entries["word/_rels/document.xml.rels"];
  if (relsBytes) {
    const relsXml = strFromU8(relsBytes);
    for (const m of relsXml.matchAll(/<Relationship\b[^>]*>/gi)) {
      const tag = m[0];
      const id = tag.match(/\bId="([^"]+)"/i)?.[1];
      const target = tag.match(/\bTarget="([^"]+)"/i)?.[1];
      if (id && target) {
        const cleanPath = "word/" + target.replace(/^(\.\/|\/)+/, "");
        const mediaBytes = entries[cleanPath];
        if (mediaBytes) {
          const url = URL.createObjectURL(
            new Blob([mediaBytes], { type: guessImageMime(cleanPath) })
          );
          revokeUrls.push(url);
          relMap.set(id, url);
        }
      }
    }
  }

  const xml = strFromU8(docXmlBytes);
  const blocks: DocxBlock[] = [];

  // Walk top-level tables and paragraphs in document order
  const tokenRegex = /<w:tbl\b[\s\S]*?<\/w:tbl>|<w:p\b[\s\S]*?<\/w:p>/g;
  for (const match of xml.matchAll(tokenRegex)) {
    const chunk = match[0];
    if (chunk.startsWith("<w:tbl")) {
      const rows: string[][] = [];
      for (const trMatch of chunk.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)) {
        const cells: string[] = [];
        for (const tcMatch of trMatch[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)) {
          const cellParas: string[] = [];
          for (const pMatch of tcMatch[0].matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)) {
            const pText = Array.from(pMatch[0].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g))
              .map((t) => decodeXmlEntities(t[1]))
              .join("");
            if (pText.trim()) cellParas.push(pText.trim());
          }
          cells.push(cellParas.join(" / "));
        }
        if (cells.length > 0) rows.push(cells);
      }
      if (rows.length > 0) {
        blocks.push({ type: "table", rows });
      }
    } else {
      // Check for embedded blip image inside paragraph
      const embedId = chunk.match(/r:embed="([^"]+)"/)?.[1];
      if (embedId && relMap.has(embedId)) {
        blocks.push({ type: "image", imageUrl: relMap.get(embedId) });
      }

      const textParts: string[] = [];
      for (const part of chunk.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g)) {
        if (part[0] === "<w:tab/>") textParts.push("   ");
        else if (part[0] === "<w:br/>") textParts.push("\n");
        else if (part[1] !== undefined) textParts.push(decodeXmlEntities(part[1]));
      }
      const text = textParts.join("").trim();
      if (!text) continue;

      const styleVal = chunk.match(/<w:pStyle\s+w:val="([^"]+)"/i)?.[1] || "";
      const isHeading = /heading\s*([123])|title|subtitle/i.test(styleVal);
      const isList = /<w:numPr\b/.test(chunk);
      const isBold = /<w:b(?:\s|\/|>)/.test(chunk);

      if (isHeading) {
        const lvlNum = Number(styleVal.match(/([123])/)?.[1] || 2) as 1 | 2 | 3;
        blocks.push({ type: "heading", level: lvlNum, text });
      } else {
        blocks.push({
          type: "paragraph",
          text: isList ? `• ${text}` : text,
          bold: isBold,
        });
      }
    }
    if (blocks.length >= 600) break;
  }

  return blocks;
}

/**
 * Extracts sheets and cell matrices from an .xlsx buffer.
 */
export function parseXlsxBuffer(bytes: Uint8Array): SpreadsheetSheet[] {
  const entries = unzipSync(bytes, {
    filter: (e) =>
      e.originalSize <= 8_000_000 &&
      (e.name === "xl/workbook.xml" ||
        e.name === "xl/sharedStrings.xml" ||
        /^xl\/worksheets\/sheet\d+\.xml$/i.test(e.name)),
  });

  // 1. Shared strings table
  const sharedStrings: string[] = [];
  if (entries["xl/sharedStrings.xml"]) {
    const sstXml = strFromU8(entries["xl/sharedStrings.xml"]);
    for (const si of sstXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
      const val = Array.from(si[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g))
        .map((t) => decodeXmlEntities(t[1]))
        .join("");
      sharedStrings.push(val);
    }
  }

  // 2. Sheet names from workbook.xml
  const sheetNames: string[] = [];
  if (entries["xl/workbook.xml"]) {
    const wbXml = strFromU8(entries["xl/workbook.xml"]);
    for (const sh of wbXml.matchAll(/<sheet\b[^>]*\bname="([^"]+)"[^>]*>/g)) {
      sheetNames.push(decodeXmlEntities(sh[1]));
    }
  }

  // 3. Parse each worksheet
  const sheetFiles = Object.keys(entries)
    .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(k))
    .sort((a, b) => {
      const na = Number(a.match(/sheet(\d+)/i)?.[1] || 0);
      const nb = Number(b.match(/sheet(\d+)/i)?.[1] || 0);
      return na - nb;
    });

  const sheets: SpreadsheetSheet[] = [];
  sheetFiles.forEach((fileKey, idx) => {
    const wsXml = strFromU8(entries[fileKey]);
    const rows: string[][] = [];
    let maxCols = 0;

    for (const rowMatch of wsXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const rowCells: string[] = [];
      let nextFallbackCol = 0;

      for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cellMatch[1] || "";
        const inner = cellMatch[2] || "";
        const ref = attrs.match(/\br="([A-Z]+)\d+"/i)?.[1];
        const colIdx = ref ? colLettersToIndex(ref) : nextFallbackCol;
        nextFallbackCol = colIdx + 1;

        const cellType = attrs.match(/\bt="([^"]+)"/)?.[1] || "";
        let textVal = "";

        if (cellType === "inlineStr") {
          textVal = Array.from(inner.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g))
            .map((t) => decodeXmlEntities(t[1]))
            .join("");
        } else {
          const rawV = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
          if (cellType === "s") {
            const sIdx = Number(rawV);
            textVal = sharedStrings[sIdx] ?? rawV;
          } else if (cellType === "b") {
            textVal = rawV === "1" ? "TRUE" : "FALSE";
          } else {
            textVal = decodeXmlEntities(rawV);
          }
        }

        while (rowCells.length <= colIdx && rowCells.length < 60) {
          rowCells.push("");
        }
        if (colIdx < 60) {
          rowCells[colIdx] = textVal;
        }
      }

      if (rowCells.some((c) => c !== "")) {
        maxCols = Math.max(maxCols, rowCells.length);
        rows.push(rowCells);
      }
      if (rows.length >= 350) break;
    }

    // Normalize column count across rows
    const normalized = rows.map((r) => {
      const copy = [...r];
      while (copy.length < maxCols) copy.push("");
      return copy;
    });

    sheets.push({
      name: sheetNames[idx] || `ورقة ${idx + 1}`,
      rows: normalized,
    });
  });

  return sheets;
}

/**
 * Extracts slides and embedded slide images from a .pptx buffer.
 */
export function parsePptxBuffer(bytes: Uint8Array, revokeUrls: string[]): PptxSlide[] {
  const entries = unzipSync(bytes, {
    filter: (e) =>
      e.originalSize <= 6_000_000 &&
      (/^ppt\/slides\/slide\d+\.xml$/i.test(e.name) ||
        /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/i.test(e.name) ||
        /^ppt\/media\/.+\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(e.name)),
  });

  const slideKeys = Object.keys(entries)
    .filter((k) => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/i)?.[1] || 0);
      const nb = Number(b.match(/slide(\d+)/i)?.[1] || 0);
      return na - nb;
    });

  const mediaUrlCache = new Map<string, string>();
  const getMediaUrl = (mediaPath: string): string | null => {
    if (mediaUrlCache.has(mediaPath)) return mediaUrlCache.get(mediaPath)!;
    const data = entries[mediaPath];
    if (!data) return null;
    const url = URL.createObjectURL(new Blob([data], { type: guessImageMime(mediaPath) }));
    revokeUrls.push(url);
    mediaUrlCache.set(mediaPath, url);
    return url;
  };

  return slideKeys.map((key, idx) => {
    const slideNum = Number(key.match(/slide(\d+)/i)?.[1] || idx + 1);
    const xml = strFromU8(entries[key]);
    const paragraphs: string[] = [];

    for (const pMatch of xml.matchAll(/<a:p\b[\s\S]*?<\/a:p>/g)) {
      const line = Array.from(pMatch[0].matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g))
        .map((t) => decodeXmlEntities(t[1]))
        .join("")
        .trim();
      if (line) paragraphs.push(line);
    }

    const imageUrls: string[] = [];
    const relKey = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
    if (entries[relKey]) {
      const relXml = strFromU8(entries[relKey]);
      for (const m of relXml.matchAll(/\bTarget="\.\.\/media\/([^"]+)"/gi)) {
        const u = getMediaUrl(`ppt/media/${m[1]}`);
        if (u && !imageUrls.includes(u)) imageUrls.push(u);
      }
    }

    return {
      index: slideNum,
      title: paragraphs[0] || `شريحة ${slideNum}`,
      bullets: paragraphs.slice(1),
      imageUrls,
    };
  });
}

/**
 * Scans binary files (such as AutoCAD .dwg or Revit .rvt/.rfa) for embedded PNG preview thumbnails
 * and extracts CAD/BIM header version info without modifying the file.
 */
export function inspectBinaryEngineeringOrGenericFile(
  bytes: Uint8Array,
  ext: string,
  revokeUrls: string[]
): BinaryInspectionInfo {
  const headLen = Math.min(bytes.length, 64);
  const hexHeader = Array.from(bytes.slice(0, Math.min(bytes.length, 24)))
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");

  const asciiHead = new TextDecoder("ascii", { fatal: false }).decode(
    bytes.slice(0, headLen)
  );

  let formatFamily = ext ? `ملف ${ext.toUpperCase()}` : "ملف ثنائي";
  let versionHint: string | undefined;
  const details: string[] = [];
  const embeddedImageUrls: string[] = [];

  // 1. Detect DWG version
  const dwgCode = asciiHead.slice(0, 6);
  if (dwgCode in DWG_VERSIONS) {
    formatFamily = "مخطط أوتوكاد ثنائي الأصلي (AutoCAD DWG)";
    versionHint = `${DWG_VERSIONS[dwgCode]} (${dwgCode})`;
    details.push(`إصدار تنسيق DWG: ${versionHint}`);
  } else if (
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0
  ) {
    if (["rvt", "rfa", "rte"].includes(ext)) {
      formatFamily =
        ext === "rfa"
          ? "عائلة ريفيت هندسية (Autodesk Revit Family)"
          : "نموذج معلومات البناء ريفيت (Autodesk Revit BIM)";
    } else if (["doc", "xls", "ppt"].includes(ext)) {
      formatFamily = `مستند Microsoft Office كلاسيكي (.${ext.toUpperCase()})`;
    } else {
      formatFamily = "ملف مركّب قياسي (OLE2 Compound Document)";
    }
  } else if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    if (ext === "dwfx") {
      formatFamily = "حزمة مخططات هندسية Autodesk DWFx";
    } else {
      formatFamily = `حزمة مضغوطة / مستند معياري (.${ext.toUpperCase()})`;
    }
  } else if (asciiHead.startsWith("Rar!")) {
    formatFamily = "أرشيف مضغوط WinRAR (.RAR)";
  } else if (bytes[0] === 0x37 && bytes[1] === 0x7a) {
    formatFamily = "أرشيف مضغوط 7-Zip (.7Z)";
  } else if (asciiHead.startsWith("SQLite format 3")) {
    formatFamily = "قاعدة بيانات SQLite";
  }

  // 2. If DWFx (ZIP-based OPC), extract embedded page preview images
  if (ext === "dwfx" && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes.length <= 25_000_000) {
    try {
      const dwfxEntries = unzipSync(bytes, {
        filter: (e) =>
          e.originalSize <= 5_000_000 &&
          /\.(png|jpe?g)$/i.test(e.name),
      });
      for (const [entryName, imgData] of Object.entries(dwfxEntries).slice(0, 6)) {
        const u = URL.createObjectURL(
          new Blob([imgData], { type: guessImageMime(entryName) })
        );
        revokeUrls.push(u);
        embeddedImageUrls.push(u);
      }
      if (embeddedImageUrls.length > 0) {
        details.push(`تم استخراج ${embeddedImageUrls.length} صورة معاينة مضمّنة من حزمة DWFx`);
      }
    } catch {
      // ignore malformed zip
    }
  }

  // 3. Scan for embedded PNG preview image (used in AutoCAD 2013+ DWG & Autodesk Revit RVT/RFA!)
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A ... IEND: 49 45 4E 44 AE 42 60 82
  const scanLimit = Math.min(bytes.length, 16 * 1024 * 1024);
  for (let i = 0; i + 24 < scanLimit && embeddedImageUrls.length < 2; i++) {
    if (
      bytes[i] === 0x89 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x4e &&
      bytes[i + 3] === 0x47 &&
      bytes[i + 4] === 0x0d &&
      bytes[i + 5] === 0x0a &&
      bytes[i + 6] === 0x1a &&
      bytes[i + 7] === 0x0a
    ) {
      // Find matching IEND within 4 MB
      const maxEnd = Math.min(scanLimit, i + 4 * 1024 * 1024);
      for (let j = i + 32; j + 8 <= maxEnd; j++) {
        if (
          bytes[j] === 0x49 &&
          bytes[j + 1] === 0x45 &&
          bytes[j + 2] === 0x4e &&
          bytes[j + 3] === 0x44 &&
          bytes[j + 4] === 0xae &&
          bytes[j + 5] === 0x42 &&
          bytes[j + 6] === 0x60 &&
          bytes[j + 7] === 0x82
        ) {
          const pngSlice = bytes.slice(i, j + 8);
          const u = URL.createObjectURL(new Blob([pngSlice], { type: "image/png" }));
          revokeUrls.push(u);
          embeddedImageUrls.push(u);
          details.push("تم العثور على صورة مصغّرة مضمّنة (Embedded Preview Thumbnail) داخل الملف الهندسي");
          i = j + 7;
          break;
        }
      }
    }
  }

  // 4. Scan UTF-16LE BasicFileInfo strings (common in Revit .rvt/.rfa & MS Office OLE2)
  let extractedStringsSample: string | undefined;
  const textSlice = bytes.slice(0, Math.min(bytes.length, 512 * 1024));
  const utf16Text = new TextDecoder("utf-16le", { fatal: false }).decode(textSlice);
  const revitMatch = utf16Text.match(/Autodesk Revit\s+20\d{2}|Format:\s*20\d{2}/i);
  if (revitMatch) {
    versionHint = revitMatch[0];
    details.push(`بيانات برنامج الإنشاء: ${revitMatch[0]}`);
  }
  const readableLines = Array.from(
    utf16Text.matchAll(/[\u0600-\u06FFa-zA-Z0-9_.,:/\\()\- ]{10,120}/g)
  )
    .map((m) => m[0].trim())
    .filter((s) => /[a-zA-Z\u0600-\u06FF]{4,}/.test(s))
    .slice(0, 18);

  if (readableLines.length > 0) {
    extractedStringsSample = Array.from(new Set(readableLines)).join("\n");
  } else {
    const asciiText = new TextDecoder("utf-8", { fatal: false }).decode(
      bytes.slice(0, Math.min(bytes.length, 128 * 1024))
    );
    const asciiReadable = Array.from(
      asciiText.matchAll(/[\u0600-\u06FFa-zA-Z0-9_.,:/\\()\- ]{12,120}/g)
    )
      .map((m) => m[0].trim())
      .filter((s) => /[a-zA-Z\u0600-\u06FF]{4,}/.test(s))
      .slice(0, 15);
    if (asciiReadable.length > 0) {
      extractedStringsSample = Array.from(new Set(asciiReadable)).join("\n");
    }
  }

  return {
    formatFamily,
    versionHint,
    details,
    embeddedImageUrls,
    extractedStringsSample,
    hexHeader,
  };
}

async function resolveBlobFromTarget(target: PreviewTarget): Promise<Blob> {
  if (target.blob) return target.blob;
  if (target.url) {
    const res = await fetch(target.url);
    if (!res.ok) throw new Error(`تعذر قراءة الملف (${res.status})`);
    return await res.blob();
  }
  throw new Error("محتوى الملف غير متوفر للمعاينة");
}

/**
 * Universal non-destructive file inspector & preview builder for ANY file uploaded to the dashboard.
 */
export async function inspectFileForPreview(
  target: PreviewTarget
): Promise<ResolvedPreviewResult> {
  const revokeUrls: string[] = [];
  const ext = getExt(target.name);
  const mime = (target.mimeType || target.blob?.type || "").toLowerCase();

  try {
    // Fast-path for built-in or Blob images
    if (IMAGE_EXTS.has(ext) || mime.startsWith("image/")) {
      if (target.url && !target.blob) {
        return { kind: "image", ext: ext || "img", srcUrl: target.url, revokeUrls };
      }
      const blob = await resolveBlobFromTarget(target);
      const mimeMap: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        svg: "image/svg+xml",
        bmp: "image/bmp",
        ico: "image/x-icon",
        avif: "image/avif",
        tiff: "image/tiff",
        tif: "image/tiff",
      };
      const typed =
        blob.type && blob.type !== "application/octet-stream"
          ? blob
          : new Blob([blob], { type: mimeMap[ext] || "image/png" });
      const srcUrl = URL.createObjectURL(typed);
      revokeUrls.push(srcUrl);
      return { kind: "image", ext: ext || "img", srcUrl, revokeUrls };
    }

    // Video
    if (VIDEO_EXTS.has(ext) || mime.startsWith("video/")) {
      const blob = await resolveBlobFromTarget(target);
      const srcUrl = URL.createObjectURL(blob);
      revokeUrls.push(srcUrl);
      return {
        kind: "video",
        ext: ext || "video",
        srcUrl,
        mimeType: mime || `video/${ext === "mov" ? "mp4" : ext}`,
        revokeUrls,
      };
    }

    // Audio
    if (AUDIO_EXTS.has(ext) || mime.startsWith("audio/")) {
      const blob = await resolveBlobFromTarget(target);
      const srcUrl = URL.createObjectURL(blob);
      revokeUrls.push(srcUrl);
      return {
        kind: "audio",
        ext: ext || "audio",
        srcUrl,
        mimeType: mime || `audio/${ext}`,
        revokeUrls,
      };
    }

    const blob = await resolveBlobFromTarget(target);

    // PDF
    if (ext === "pdf" || mime === "application/pdf") {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const pdfBlob =
        blob.type === "application/pdf"
          ? blob
          : new Blob([bytes], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(pdfBlob);
      revokeUrls.push(objectUrl);
      return { kind: "pdf", ext: "pdf", bytes, objectUrl, revokeUrls };
    }

    // DXF
    if (ext === "dxf") {
      const dxf = await parseAsciiDxfPreview(blob);
      return { kind: "dxf", ext: "dxf", dxf, revokeUrls };
    }

    // IFC
    if (ext === "ifc") {
      const ifc = await inspectIfcStepMetadata(blob);
      const headerSample = await blob.slice(0, Math.min(blob.size, 3500)).text();
      if (ifc) {
        return { kind: "ifc", ext: "ifc", ifc, headerSample, revokeUrls };
      }
    }

    // CSV / TSV
    if (ext === "csv" || ext === "tsv") {
      const slice = await blob.slice(0, Math.min(blob.size, 2 * 1024 * 1024)).arrayBuffer();
      const rawBytes = new Uint8Array(slice);
      const encoding =
        rawBytes[0] === 0xff && rawBytes[1] === 0xfe
          ? "utf-16le"
          : rawBytes[0] === 0xfe && rawBytes[1] === 0xff
            ? "utf-16be"
            : "utf-8";
      const text = new TextDecoder(encoding).decode(rawBytes);
      const rows = parseDelimitedRows(text, ext === "tsv" ? "\t" : undefined);
      return {
        kind: "spreadsheet",
        ext,
        sheets: [{ name: target.name, rows }],
        revokeUrls,
      };
    }

    // DOCX / XLSX / PPTX / ZIP (up to 30 MB for in-memory archive inspection)
    if (["docx", "xlsx", "pptx", "zip"].includes(ext) && blob.size <= 30 * 1024 * 1024) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      try {
        if (ext === "docx") {
          const blocks = parseDocxBuffer(bytes, revokeUrls);
          if (blocks.length > 0) {
            return { kind: "docx", ext: "docx", blocks, revokeUrls };
          }
        } else if (ext === "xlsx") {
          const sheets = parseXlsxBuffer(bytes);
          if (sheets.length > 0) {
            return { kind: "spreadsheet", ext: "xlsx", sheets, revokeUrls };
          }
        } else if (ext === "pptx") {
          const slides = parsePptxBuffer(bytes, revokeUrls);
          if (slides.length > 0) {
            return { kind: "pptx", ext: "pptx", slides, revokeUrls };
          }
        } else if (ext === "zip") {
          const entries: ZipEntryInfo[] = [];
          let totalEntries = 0;
          unzipSync(bytes, {
            filter: (e) => {
              totalEntries++;
              if (entries.length < 250) {
                entries.push({
                  name: e.name,
                  size: e.originalSize,
                  isDir: e.name.endsWith("/"),
                });
              }
              return false; // metadata only, zero decompression overhead!
            },
          });
          return { kind: "zip", ext: "zip", entries, totalEntries, revokeUrls };
        }
      } catch {
        // Fall through to binary inspector if corrupted or encrypted OOXML
      }
    }

    // Text / Code / JSON / XML / Markdown
    if (TEXT_EXTS.has(ext) || mime.startsWith("text/") || mime === "application/json") {
      const maxRead = 512 * 1024;
      const truncated = blob.size > maxRead;
      const rawBytes = new Uint8Array(await blob.slice(0, maxRead).arrayBuffer());
      const encoding =
        rawBytes[0] === 0xff && rawBytes[1] === 0xfe
          ? "utf-16le"
          : rawBytes[0] === 0xfe && rawBytes[1] === 0xff
            ? "utf-16be"
            : "utf-8";
      let content = new TextDecoder(encoding, { fatal: false }).decode(rawBytes);
      if (ext === "json") {
        try {
          content = JSON.stringify(JSON.parse(content), null, 2);
        } catch {
          // keep raw text if partial/invalid JSON
        }
      }
      return {
        kind: "text",
        ext: ext || "txt",
        content,
        languageHint: ext.toUpperCase() || "TEXT",
        truncated,
        revokeUrls,
      };
    }

    // Check if an unknown-extension small file is actually plain UTF-8 text
    if (blob.size > 0 && blob.size <= 512 * 1024 && !["dwg", "rvt", "rfa", "nwc", "nwd", "doc", "xls", "ppt"].includes(ext)) {
      const sampleBytes = new Uint8Array(await blob.slice(0, Math.min(blob.size, 8192)).arrayBuffer());
      let zeroCount = 0;
      for (let i = 0; i < sampleBytes.length; i++) {
        if (sampleBytes[i] === 0) zeroCount++;
      }
      if (zeroCount / sampleBytes.length < 0.01) {
        const text = new TextDecoder("utf-8", { fatal: false }).decode(
          new Uint8Array(await blob.arrayBuffer())
        );
        if (text.trim().length > 0) {
          return {
            kind: "text",
            ext: ext || "txt",
            content: text,
            languageHint: (ext || "TEXT").toUpperCase(),
            truncated: false,
            revokeUrls,
          };
        }
      }
    }

    // Universal Binary & CAD/BIM Inspector (DWG, RVT, RFA, DWFx, DOC, XLS, RAR, etc.)
    const maxBinaryInspect = Math.min(blob.size, 18 * 1024 * 1024);
    const binBytes = new Uint8Array(await blob.slice(0, maxBinaryInspect).arrayBuffer());
    const info = inspectBinaryEngineeringOrGenericFile(binBytes, ext, revokeUrls);
    return {
      kind: "binary-inspector",
      ext: ext || "bin",
      info,
      revokeUrls,
    };
  } catch (err) {
    for (const u of revokeUrls) URL.revokeObjectURL(u);
    throw err;
  }
}
