import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerSource from "pdfjs-dist/build/pdf.worker.min.mjs?raw";

// Bundle the worker with the single-file app: no CDN or external worker request.
let workerUrl: string | undefined;
export async function extractPdfText(file: File, maxChars: number): Promise<string | null> {
  if (!workerUrl) {
    workerUrl = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
    GlobalWorkerOptions.workerSrc = workerUrl;
  }
  const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()),
    useSystemFonts: true, stopAtErrors: true });
  const timeout = setTimeout(() => { void task.destroy(); }, 15000);
  // Never block staging on the password dialog for an encrypted PDF.
  task.onPassword = () => { void task.destroy(); };
  try {
    const pdf = await task.promise;
    let text = '';
    for (let pageIndex = 1; pageIndex <= Math.min(pdf.numPages, 12) && text.length < maxChars; pageIndex++) {
      const page = await pdf.getPage(pageIndex);
      const content = await page.getTextContent();
      text += content.items.map((item) => 'str' in item ? item.str : '').join(' ') + '\n';
      page.cleanup();
    }
    return text.trim().slice(0, maxChars) || null;
  } finally {
    clearTimeout(timeout);
    await task.destroy();
  }
}
