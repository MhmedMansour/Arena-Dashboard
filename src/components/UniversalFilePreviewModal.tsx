import { useEffect, useRef, useState, useMemo } from "react";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  Compass,
  Box,
  Archive,
  Search,
  Copy,
  ExternalLink,
  Layers,
  ShieldCheck,
  Music,
  Film,
  Check,
} from "lucide-react";
import {
  inspectFileForPreview,
  PreviewTarget,
  ResolvedPreviewResult,
} from "../services/filePreviewService";
import { formatFileSize } from "../services/archiveStorage";

export type { PreviewTarget };

interface UniversalFilePreviewModalProps {
  target: PreviewTarget | null;
  onClose: () => void;
  onDownload?: () => void;
  externalViewer?: {
    enabled: boolean;
    viewerName: string;
    viewerUrlTemplate: string;
  };
  zIndex?: number;
}

function PdfCanvasStage({
  bytes,
  objectUrl,
  zoom,
}: {
  bytes: Uint8Array;
  objectUrl: string;
  zoom: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [rendering, setRendering] = useState(true);
  const [pdfError, setPdfError] = useState("");
  const pdfDocRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    setPdfError("");
    setPageNum(1);

    (async () => {
      try {
        const [{ getDocument }, { ensurePdfWorker }] = await Promise.all([
          import("pdfjs-dist"),
          import("../services/pdfTextExtractor"),
        ]);
        ensurePdfWorker();
        const loadingTask = getDocument({
          data: bytes.slice(),
          useSystemFonts: true,
        });
        const doc = await loadingTask.promise;
        if (cancelled) {
          await (doc as { destroy?: () => Promise<void> }).destroy?.();
          return;
        }
        pdfDocRef.current = doc;
        setPageCount(doc.numPages);
      } catch {
        if (!cancelled) {
          setPdfError("تعذر عرض صفحات PDF عبر العارض المدمج — سيتم استخدام عارض المتصفح.");
          setRendering(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (pdfDocRef.current) {
        void pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [bytes]);

  useEffect(() => {
    let cancelled = false;
    const doc = pdfDocRef.current;
    if (!doc || !pageCount || !canvasRef.current) return;

    setRendering(true);
    (async () => {
      try {
        const page = await doc.getPage(pageNum);
        if (cancelled || !canvasRef.current) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const baseScale = 1.28 * zoom;
        const viewport = page.getViewport({ scale: baseScale * dpr });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      } catch {
        if (!cancelled) {
          setPdfError("تعذر رسم هذه الصفحة، يمكنك فتح المستند مباشرة في تبويب مستقل.");
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pageCount, pageNum, zoom]);

  if (pdfError) {
    return (
      <div style={{ width: "100%" }}>
        <iframe src={objectUrl} title="PDF Preview" className="sa-pdf-frame" />
      </div>
    );
  }

  return (
    <div className="mh-univ-pdf-wrap">
      <div className="mh-univ-subbar">
        <div className="mh-btn-row">
          <button
            type="button"
            className="sa-btn-subtle"
            disabled={pageNum <= 1}
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
          >
            <ChevronRight size={15} /> السابق
          </button>
          <span className="sa-pill">
            صفحة <b>{pageNum}</b> من <b>{pageCount || "…"}</b>
          </span>
          <button
            type="button"
            className="sa-btn-subtle"
            disabled={!pageCount || pageNum >= pageCount}
            onClick={() => setPageNum((p) => Math.min(pageCount, p + 1))}
          >
            التالي <ChevronLeft size={15} />
          </button>
        </div>
        <a
          href={objectUrl}
          target="_blank"
          rel="noreferrer"
          className="sa-btn-subtle"
        >
          <ExternalLink size={14} /> فتح في تبويب مستقل
        </a>
      </div>
      <div className="mh-univ-pdf-canvas-box">
        {rendering && !pageCount && (
          <p className="empty">جارٍ تجهيز صفحات PDF للمعاينة عالية الدقة…</p>
        )}
        <canvas ref={canvasRef} className="mh-univ-pdf-canvas" />
      </div>
    </div>
  );
}

function colIndexToLetter(idx: number): string {
  let n = idx + 1;
  let str = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    str = String.fromCharCode(65 + rem) + str;
    n = Math.floor((n - 1) / 26);
  }
  return str;
}

export default function UniversalFilePreviewModal({
  target,
  onClose,
  onDownload,
  externalViewer,
  zIndex = 36,
}: UniversalFilePreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ResolvedPreviewResult | null>(null);

  // Interactive viewer controls
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [slideIdx, setSlideIdx] = useState(0);
  const [innerSearch, setInnerSearch] = useState("");
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    if (!target) {
      setResult(null);
      return;
    }

    let active = true;
    let currentRevoke: string[] = [];

    setLoading(true);
    setError("");
    setZoom(1);
    setRotation(0);
    setImgDims(null);
    setSheetIdx(0);
    setSlideIdx(0);
    setInnerSearch("");
    setHiddenLayers(new Set());

    inspectFileForPreview(target)
      .then((res) => {
        if (!active) {
          res.revokeUrls.forEach((u) => URL.revokeObjectURL(u));
          return;
        }
        currentRevoke = res.revokeUrls;
        setResult(res);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "تعذر تحضير معاينة هذا الملف"
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      currentRevoke.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  const handleFallbackDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    if (!target) return;
    if (target.blob) {
      const u = URL.createObjectURL(target.blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = target.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 3000);
    } else if (target.url) {
      const a = document.createElement("a");
      a.href = target.url;
      a.download = target.name;
      a.click();
    }
  };

  const canZoom =
    result?.kind === "image" ||
    result?.kind === "pdf" ||
    (result?.kind === "dxf" && Boolean(result.dxf.bounds)) ||
    (result?.kind === "binary-inspector" &&
      result.info.embeddedImageUrls.length > 0);

  const activeSheet = useMemo(() => {
    if (result?.kind !== "spreadsheet") return null;
    return result.sheets[sheetIdx] || result.sheets[0] || null;
  }, [result, sheetIdx]);

  const filteredSheetRows = useMemo(() => {
    if (!activeSheet) return [];
    const q = innerSearch.trim().toLowerCase();
    if (!q) return activeSheet.rows;
    return activeSheet.rows.filter((r, i) =>
      i === 0 ? true : r.some((cell) => cell.toLowerCase().includes(q))
    );
  }, [activeSheet, innerSearch]);

  if (!target) return null;

  const extLabel = (
    target.name.includes(".") ? target.name.split(".").pop()! : "FILE"
  ).toUpperCase();

  const fileSize = target.size ?? target.blob?.size ?? 0;

  return (
    <div
      className="overlay"
      style={{ zIndex }}
      onClick={onClose}
      role="presentation"
    >
      <section
        className="dialog sa-preview-dialog mh-univ-preview-dialog"
        role="dialog"
        aria-label={`معاينة الملف ${target.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="sa-preview-header">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="mh-badges-row" style={{ marginBottom: 4 }}>
              <span className="sa-ext-badge">{extLabel}</span>
              {fileSize > 0 && (
                <span className="sa-pill">{formatFileSize(fileSize)}</span>
              )}
              {target.category && (
                <span className="sa-pill">{target.category}</span>
              )}
              {target.projectName && (
                <span className="mh-pill accent">{target.projectName}</span>
              )}
              {imgDims && (
                <span className="sa-pill" dir="ltr">
                  {imgDims.w} × {imgDims.h} px
                </span>
              )}
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={target.name}
            >
              {target.name}
            </h2>
          </div>

          <div className="sa-preview-controls">
            {canZoom && (
              <>
                <button
                  type="button"
                  className="sa-btn-subtle"
                  title="تصغير"
                  onClick={() =>
                    setZoom((z) => Math.max(0.4, +(z - 0.2).toFixed(2)))
                  }
                >
                  <ZoomOut size={15} />
                </button>
                <button
                  type="button"
                  className="sa-pill"
                  title="إعادة الضبط 100%"
                  onClick={() => {
                    setZoom(1);
                    setRotation(0);
                  }}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  className="sa-btn-subtle"
                  title="تكبير"
                  onClick={() =>
                    setZoom((z) => Math.min(3.5, +(z + 0.2).toFixed(2)))
                  }
                >
                  <ZoomIn size={15} />
                </button>
              </>
            )}

            {result?.kind === "image" && (
              <button
                type="button"
                className="sa-btn-subtle"
                title="تدوير 90 درجة"
                onClick={() => setRotation((r) => (r + 90) % 360)}
              >
                <RotateCw size={15} />
              </button>
            )}

            <button
              type="button"
              className="primary mh-btn-nomargin"
              onClick={handleFallbackDownload}
            >
              <Download size={15} /> تنزيل الملف
            </button>
            <button
              type="button"
              className="sa-btn-subtle"
              onClick={onClose}
              title="إغلاق المعاينة"
            >
              <X size={16} /> إغلاق
            </button>
          </div>
        </div>

        {target.notes && (
          <div className="sa-analysis-note" style={{ marginBottom: 0 }}>
            <ShieldCheck size={15} />
            <span>{target.notes}</span>
          </div>
        )}

        {/* Main Preview Stage */}
        <div className="sa-preview-stage mh-univ-stage">
          {loading ? (
            <p className="empty">جارٍ قراءة وتجهيز معاينة الملف دون تعديل النسخة الأصلية…</p>
          ) : error ? (
            <div className="sa-cad-fallback">
              <FileText size={36} className="sa-copper-icon" />
              <h3>{target.name}</h3>
              <p>{error}</p>
              <button
                type="button"
                className="primary mh-btn-nomargin"
                onClick={handleFallbackDownload}
              >
                <Download size={15} /> تنزيل الملف الأصلي
              </button>
            </div>
          ) : !result ? null : result.kind === "pdf" ? (
            <PdfCanvasStage
              bytes={result.bytes}
              objectUrl={result.objectUrl}
              zoom={zoom}
            />
          ) : result.kind === "image" ? (
            <div className="sa-image-canvas">
              <img
                src={result.srcUrl}
                alt={target.name}
                onLoad={(e) =>
                  setImgDims({
                    w: e.currentTarget.naturalWidth,
                    h: e.currentTarget.naturalHeight,
                  })
                }
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                }}
              />
            </div>
          ) : result.kind === "video" ? (
            <div className="mh-univ-media-box">
              <Film size={24} className="sa-copper-icon" />
              <video
                src={result.srcUrl}
                controls
                style={{
                  maxWidth: "100%",
                  maxHeight: "58vh",
                  borderRadius: 8,
                }}
              />
            </div>
          ) : result.kind === "audio" ? (
            <div className="mh-univ-media-box">
              <Music size={36} className="sa-copper-icon" />
              <h3 style={{ color: "#f4f1eb", margin: 0 }}>{target.name}</h3>
              <audio
                src={result.srcUrl}
                controls
                style={{ width: "min(480px, 90%)" }}
              />
            </div>
          ) : result.kind === "docx" ? (
            <div className="mh-univ-doc-sheet">
              <div className="mh-univ-doc-banner">
                <span>
                  <FileText size={14} style={{ display: "inline", verticalAlign: "middle" }} />{" "}
                  معاينة مستند Word (.DOCX) — {result.blocks.length} فقرة / جدول
                </span>
              </div>
              <div className="mh-univ-doc-body" dir="auto">
                {result.blocks.map((blk, i) => {
                  if (blk.type === "heading") {
                    return (
                      <h3
                        key={i}
                        className={`mh-doc-h mh-doc-h${blk.level || 2}`}
                      >
                        {blk.text}
                      </h3>
                    );
                  }
                  if (blk.type === "image" && blk.imageUrl) {
                    return (
                      <figure key={i} className="mh-doc-img">
                        <img src={blk.imageUrl} alt={`صورة مضمّنة ${i + 1}`} />
                      </figure>
                    );
                  }
                  if (blk.type === "table" && blk.rows) {
                    return (
                      <div key={i} className="mh-doc-table-wrap">
                        <table className="mh-univ-table">
                          <tbody>
                            {blk.rows.map((r, ri) => (
                              <tr key={ri}>
                                {r.map((cell, ci) => (
                                  <td
                                    key={ci}
                                    style={
                                      ri === 0 ? { fontWeight: 700 } : undefined
                                    }
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }
                  return (
                    <p
                      key={i}
                      style={blk.bold ? { fontWeight: 700 } : undefined}
                    >
                      {blk.text}
                    </p>
                  );
                })}
              </div>
            </div>
          ) : result.kind === "spreadsheet" ? (
            <div className="mh-univ-sheet-wrap">
              <div className="mh-univ-subbar">
                <div className="mh-badges-row">
                  <FileSpreadsheet size={16} className="sa-copper-icon" />
                  {result.sheets.map((sh, idx) => (
                    <button
                      key={sh.name + idx}
                      type="button"
                      className={`mh-choice-pill ${
                        sheetIdx === idx ? "active" : ""
                      }`}
                      onClick={() => setSheetIdx(idx)}
                    >
                      {sh.name} ({sh.rows.length})
                    </button>
                  ))}
                </div>
                <div className="mh-univ-mini-search">
                  <Search size={14} />
                  <input
                    placeholder="تصفية صفوف الجدول..."
                    value={innerSearch}
                    onChange={(e) => setInnerSearch(e.target.value)}
                  />
                </div>
              </div>

              {!activeSheet || activeSheet.rows.length === 0 ? (
                <p className="empty">هذه الورقة فارغة من البيانات.</p>
              ) : (
                <div className="mh-univ-table-scroll">
                  <table className="mh-univ-table">
                    <thead>
                      <tr>
                        <th className="mh-row-num">#</th>
                        {(activeSheet.rows[0] || []).map((_, ci) => (
                          <th key={ci}>{colIndexToLetter(ci)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSheetRows.map((row, ri) => (
                        <tr key={ri} className={ri === 0 ? "mh-first-data-row" : ""}>
                          <td className="mh-row-num">{ri + 1}</td>
                          {row.map((cell, ci) => (
                            <td key={ci} dir="auto">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : result.kind === "pptx" ? (
            <div className="mh-univ-pptx-wrap">
              <div className="mh-univ-subbar">
                <div className="mh-btn-row">
                  <button
                    type="button"
                    className="sa-btn-subtle"
                    disabled={slideIdx <= 0}
                    onClick={() => setSlideIdx((s) => Math.max(0, s - 1))}
                  >
                    <ChevronRight size={15} /> الشريحة السابقة
                  </button>
                  <span className="sa-pill">
                    شريحة <b>{slideIdx + 1}</b> من <b>{result.slides.length}</b>
                  </span>
                  <button
                    type="button"
                    className="sa-btn-subtle"
                    disabled={slideIdx >= result.slides.length - 1}
                    onClick={() =>
                      setSlideIdx((s) =>
                        Math.min(result.slides.length - 1, s + 1)
                      )
                    }
                  >
                    الشريحة التالية <ChevronLeft size={15} />
                  </button>
                </div>
                <div className="mh-badges-row">
                  {result.slides.slice(0, 12).map((sl, idx) => (
                    <button
                      key={sl.index}
                      type="button"
                      className={`mh-choice-pill ${
                        slideIdx === idx ? "active" : ""
                      }`}
                      onClick={() => setSlideIdx(idx)}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {result.slides[slideIdx] && (
                <div className="mh-pptx-slide-card" dir="auto">
                  <small className="eyebrow">
                    SLIDE {result.slides[slideIdx].index} / {result.slides.length}
                  </small>
                  <h3>{result.slides[slideIdx].title}</h3>
                  {result.slides[slideIdx].bullets.length > 0 && (
                    <ul>
                      {result.slides[slideIdx].bullets.map((b, bi) => (
                        <li key={bi}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {result.slides[slideIdx].imageUrls.length > 0 && (
                    <div className="mh-pptx-images">
                      {result.slides[slideIdx].imageUrls.map((u, ui) => (
                        <img key={ui} src={u} alt={`Slide graphic ${ui + 1}`} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : result.kind === "dxf" ? (
            result.dxf.bounds &&
            (result.dxf.lines.length > 0 || result.dxf.circles.length > 0) ? (
              <div className="sa-dxf-viewer">
                <div className="sa-dxf-bar">
                  <div className="mh-flex-between">
                    <span>
                      معاينة مخطط DXF ثنائي الأبعاد · العناصر:{" "}
                      {result.dxf.lines.length + result.dxf.circles.length}
                    </span>
                    <span className="mh-badges-row">
                      <Layers size={13} className="sa-copper-icon" />
                      {result.dxf.layers.slice(0, 10).map((layer) => {
                        const isOff = hiddenLayers.has(layer);
                        return (
                          <button
                            key={layer}
                            type="button"
                            className={`sa-mini-tag ${isOff ? "" : "linked"}`}
                            style={{ opacity: isOff ? 0.45 : 1, cursor: "pointer" }}
                            title="إظهار / إخفاء الطبقة"
                            onClick={() =>
                              setHiddenLayers((prev) => {
                                const next = new Set(prev);
                                if (next.has(layer)) next.delete(layer);
                                else next.add(layer);
                                return next;
                              })
                            }
                          >
                            {layer}
                          </button>
                        );
                      })}
                    </span>
                  </div>
                </div>
                <div className="sa-dxf-canvas">
                  {(() => {
                    const b = result.dxf.bounds!;
                    const w = Math.max(b.maxX - b.minX, 1);
                    const h = Math.max(b.maxY - b.minY, 1);
                    const pad = Math.max(w, h) * 0.06;
                    const vbX = b.minX - pad;
                    const vbY = -(b.maxY + pad);
                    const vbW = w + pad * 2;
                    const vbH = h + pad * 2;
                    const strokeW = Math.max(vbW, vbH) * 0.0022;

                    return (
                      <svg
                        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
                        style={{
                          width: `${100 * zoom}%`,
                          height: `${100 * zoom}%`,
                        }}
                      >
                        {result.dxf.lines
                          .filter((ln) => !hiddenLayers.has(ln.layer))
                          .map((ln, idx) => (
                            <line
                              key={idx}
                              x1={ln.x1}
                              y1={-ln.y1}
                              x2={ln.x2}
                              y2={-ln.y2}
                              stroke="#f5a16b"
                              strokeWidth={strokeW}
                              strokeLinecap="round"
                            />
                          ))}
                        {result.dxf.circles
                          .filter((c) => !hiddenLayers.has(c.layer))
                          .map((c, idx) => (
                            <circle
                              key={`c-${idx}`}
                              cx={c.cx}
                              cy={-c.cy}
                              r={c.r}
                              fill="none"
                              stroke="#8fd3e8"
                              strokeWidth={strokeW}
                            />
                          ))}
                      </svg>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="sa-cad-fallback">
                <Compass size={38} className="sa-copper-icon" />
                <h3>ملف مخطط DXF</h3>
                <p>{result.dxf.note || "يتطلب هذا المخطط عارض CAD متخصصًا."}</p>
              </div>
            )
          ) : result.kind === "ifc" ? (
            <div className="sa-cad-fallback" style={{ maxWidth: 740 }}>
              <Box size={38} className="sa-copper-icon" />
              <h3>نموذج OpenBIM قياسي ({result.ifc.schema})</h3>
              <p>
                {result.ifc.authoringApp
                  ? `برنامج الإنشاء: ${result.ifc.authoringApp} · `
                  : ""}
                {result.ifc.timestamp ? `التوقيت: ${result.ifc.timestamp}` : ""}
              </p>
              {result.ifc.elementCounts.length > 0 && (
                <div className="sa-ifc-counts">
                  {result.ifc.elementCounts.map((el) => (
                    <div key={el.label} className="sa-ifc-chip">
                      <strong>{el.count}</strong>
                      <small>{el.label}</small>
                    </div>
                  ))}
                </div>
              )}
              {result.headerSample && (
                <pre className="mh-univ-code-mini" dir="ltr">
                  {result.headerSample.slice(0, 1200)}
                </pre>
              )}
              {externalViewer?.enabled && externalViewer.viewerUrlTemplate && (
                <a
                  href={externalViewer.viewerUrlTemplate.replace(
                    "{fileName}",
                    encodeURIComponent(target.name)
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="primary mh-btn-nomargin"
                >
                  <ExternalLink size={15} /> فتح في {externalViewer.viewerName}
                </a>
              )}
            </div>
          ) : result.kind === "zip" ? (
            <div className="mh-univ-sheet-wrap">
              <div className="mh-univ-subbar">
                <span className="mh-badges-row">
                  <Archive size={16} className="sa-copper-icon" />
                  <b style={{ color: "#f4f1eb" }}>
                    محتويات الأرشيف المضغوط ({result.totalEntries} عنصر)
                  </b>
                </span>
                <div className="mh-univ-mini-search">
                  <Search size={14} />
                  <input
                    placeholder="ابحث داخل الأرشيف..."
                    value={innerSearch}
                    onChange={(e) => setInnerSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="mh-univ-table-scroll">
                <table className="mh-univ-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>مسار الملف داخل الأرشيف</th>
                      <th>الحجم الأصلي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.entries
                      .filter(
                        (e) =>
                          !innerSearch.trim() ||
                          e.name
                            .toLowerCase()
                            .includes(innerSearch.trim().toLowerCase())
                      )
                      .map((entry, idx) => (
                        <tr key={entry.name + idx}>
                          <td className="mh-row-num">{idx + 1}</td>
                          <td dir="ltr">{entry.name}</td>
                          <td dir="ltr">
                            {entry.isDir ? "مجلد" : formatFileSize(entry.size)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : result.kind === "text" ? (
            <div className="mh-univ-sheet-wrap">
              <div className="mh-univ-subbar">
                <span className="sa-pill">{result.languageHint}</span>
                {result.truncated && (
                  <small style={{ color: "#fbbf24" }}>
                    يُعرض أول 512 كيلوبايت للمعاينة السريعة
                  </small>
                )}
                <button
                  type="button"
                  className="sa-btn-subtle"
                  onClick={() => {
                    navigator.clipboard?.writeText(result.content);
                    setCopiedText(true);
                    setTimeout(() => setCopiedText(false), 2000);
                  }}
                >
                  {copiedText ? <Check size={14} /> : <Copy size={14} />}
                  {copiedText ? "تم النسخ" : "نسخ النص"}
                </button>
              </div>
              <pre className="mh-univ-text-pre" dir="auto">
                {result.content}
              </pre>
            </div>
          ) : (
            /* Binary & Engineering CAD/BIM Inspector (DWG, RVT, RFA, DWFx, DOC, etc.) */
            <div className="mh-univ-binary-card">
              <div className="mh-badges-row" style={{ justifyContent: "center" }}>
                <Compass size={26} className="sa-copper-icon" />
                <h3 style={{ margin: 0, color: "#f4f1eb" }}>
                  {result.info.formatFamily}
                </h3>
              </div>

              {result.info.versionHint && (
                <span className="mh-pill accent" dir="ltr">
                  {result.info.versionHint}
                </span>
              )}

              {result.info.embeddedImageUrls.length > 0 ? (
                <div className="mh-embedded-thumb-stage">
                  <small style={{ color: "#d3d8dc", marginBottom: 6 }}>
                    معاينة اللوحة / النموذج المستخرجة من داخل الملف الهندسي:
                  </small>
                  <div className="mh-embedded-imgs">
                    {result.info.embeddedImageUrls.map((u, idx) => (
                      <img
                        key={idx}
                        src={u}
                        alt={`معاينة مضمّنة ${idx + 1}`}
                        style={{ transform: `scale(${zoom})` }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p
                  style={{
                    margin: "4px 0",
                    fontSize: 13,
                    color: "#d3d8dc",
                    textAlign: "center",
                    maxWidth: 560,
                  }}
                >
                  تم فحص ترويسة الملف وبنيته بنجاح دون المساس بالنسخة الأصلية. لا يحتوي
                  هذا الملف على صورة مصغّرة مضمّنة، ويمكنك تنزيله لفتحه بالبرنامج المختص
                  أو فتحه عبر العارض الخارجي.
                </p>
              )}

              {result.info.details.length > 0 && (
                <div className="mh-badges-row" style={{ justifyContent: "center" }}>
                  {result.info.details.map((d, i) => (
                    <span key={i} className="sa-pill">
                      {d}
                    </span>
                  ))}
                </div>
              )}

              {result.info.extractedStringsSample && (
                <div style={{ width: "100%", maxWidth: 680 }}>
                  <small style={{ color: "#b6bdc1", marginBottom: 4 }}>
                    بيانات نصية / خصائص مقروءة من ترويسة الملف:
                  </small>
                  <pre className="mh-univ-code-mini" dir="auto">
                    {result.info.extractedStringsSample}
                  </pre>
                </div>
              )}

              <small style={{ fontFamily: "monospace", opacity: 0.75 }} dir="ltr">
                HEX SIGNATURE: {result.info.hexHeader}
              </small>

              <div className="sa-fallback-actions">
                <button
                  type="button"
                  className="primary mh-btn-nomargin"
                  onClick={handleFallbackDownload}
                >
                  <Download size={15} /> تنزيل النسخة الأصلية الكاملة
                </button>
                {externalViewer?.enabled && externalViewer.viewerUrlTemplate && (
                  <a
                    href={externalViewer.viewerUrlTemplate.replace(
                      "{fileName}",
                      encodeURIComponent(target.name)
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="sa-btn-subtle"
                  >
                    <ExternalLink size={15} /> فتح عبر {externalViewer.viewerName}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
