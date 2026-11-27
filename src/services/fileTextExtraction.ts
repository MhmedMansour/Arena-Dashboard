import { unzipSync, strFromU8 } from "fflate";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TEXT = 110_000;
const TEXT_EXTENSIONS = new Set('txt csv tsv md markdown json jsonl xml html htm xhtml ifc dxf step stp igs iges asc plt prn dat log ini cfg yaml yml toml rtf tex sql js jsx ts tsx py java c cpp cc h hpp cs go rb php sh bash bat ps1 css scss sass less vba r m pl env gitignore'.split(' '));

export function isTextReadable(ext: string, mime: string, size: number): boolean {
  return size <= 3_000_000 && (mime.toLowerCase().startsWith('text/') || TEXT_EXTENSIONS.has(ext.toLowerCase()));
}

function decodeXmlText(xml: string): string {
  // Only extract text; never render Office XML or file HTML into the page.
  return xml.replace(/<[^>]*>/g, ' ').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n: string) => {
    const value = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
    return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : ' ';
  }).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

/** Local, bounded extraction. Unsupported, encrypted, scanned and oversized files return null. */
export async function extractFileText(file: File): Promise<string | null> {
  if (file.size > MAX_FILE_BYTES) return null;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  try {
    if (ext === 'pdf' || file.type === 'application/pdf') {
      const { extractPdfText } = await import('./pdfTextExtractor');
      return await extractPdfText(file, MAX_TEXT);
    }
    if (['docx', 'xlsx', 'pptx'].includes(ext)) {
      let total = 0;
      let count = 0;
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: (entry) => {
        const wanted = ext === 'docx' ? /^word\/(document|header\d*|footer\d*)\.xml$/.test(entry.name)
          : ext === 'xlsx' ? /^xl\/(sharedStrings|worksheets\/sheet\d+)\.xml$/.test(entry.name)
          : /^ppt\/slides\/slide\d+\.xml$/.test(entry.name);
        if (!wanted || entry.originalSize > 2_000_000 || count >= 40 || total + entry.originalSize > 8_000_000) return false;
        total += entry.originalSize; count++;
        return true;
      }});
      return Object.values(entries).map((data) => decodeXmlText(strFromU8(data))).join('\n').slice(0, MAX_TEXT) || null;
    }
    if (!isTextReadable(ext, file.type || '', file.size)) return null;
    const bytes = new Uint8Array(await file.slice(0, MAX_TEXT * 2).arrayBuffer());
    const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le' : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
    let text = new TextDecoder(encoding).decode(bytes).slice(0, MAX_TEXT);
    const sample = text.slice(0, 4096);
    if (!sample || (sample.match(/\0/g)?.length || 0) / sample.length > 0.03) return null;
    if (['html', 'htm', 'xml'].includes(ext)) text = decodeXmlText(text);
    return text;
  } catch {
    return null;
  }
}
