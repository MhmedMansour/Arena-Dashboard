export interface DxfLineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  layer: string;
}

export interface DxfCircleEntity {
  cx: number;
  cy: number;
  r: number;
  layer: string;
}

export interface DxfPreviewData {
  isAsciiDxf: boolean;
  lines: DxfLineSegment[];
  circles: DxfCircleEntity[];
  layers: string[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  entityCount: number;
  note?: string;
}

/**
 * Non-destructive read-only parser for ASCII DXF files to render a 2D wireframe preview.
 * Does NOT modify the stored Blob. Binary DXF files gracefully fall back to external viewer prompt.
 */
export async function parseAsciiDxfPreview(blob: Blob): Promise<DxfPreviewData> {
  // Guard size for browser responsiveness (read up to 5 MB for wireframe preview)
  if (blob.size > 5 * 1024 * 1024) {
    return {
      isAsciiDxf: false,
      lines: [],
      circles: [],
      layers: [],
      bounds: null,
      entityCount: 0,
      note: "حجم ملف DXF يتجاوز 5 ميجابايت للمعاينة السريعة داخل المتصفح؛ استخدم عارض CAD متخصص أو قم بتنزيل النسخة الأصلية.",
    };
  }

  const headBytes = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
  const headAscii = new TextDecoder("ascii", { fatal: false }).decode(headBytes);
  if (headAscii.startsWith("AutoCAD Binary DXF")) {
    return {
      isAsciiDxf: false,
      lines: [],
      circles: [],
      layers: [],
      bounds: null,
      entityCount: 0,
      note: "هذا الملف بصيغة Binary DXF الثنائية ويتطلب عارض CAD متخصصًا لعرضه.",
    };
  }

  const text = await blob.text();
  if (!text.includes("ENTITIES")) {
    return {
      isAsciiDxf: false,
      lines: [],
      circles: [],
      layers: [],
      bounds: null,
      entityCount: 0,
      note: "لم يتم العثور على قسم ENTITIES نصي داخل ملف DXF.",
    };
  }

  const rawLines = text.split(/\r?\n/);
  const lines: DxfLineSegment[] = [];
  const circles: DxfCircleEntity[] = [];
  const layerSet = new Set<string>();

  let inEntities = false;
  let i = 0;

  // Locate ENTITIES section
  while (i + 1 < rawLines.length) {
    const code = rawLines[i].trim();
    const val = rawLines[i + 1].trim();
    i += 2;
    if (code === "2" && val === "ENTITIES") {
      inEntities = true;
      break;
    }
  }

  if (!inEntities) {
    return {
      isAsciiDxf: true,
      lines: [],
      circles: [],
      layers: [],
      bounds: null,
      entityCount: 0,
      note: "ملف DXF لا يحتوي على عناصر هندسية مرسومة في قسم ENTITIES.",
    };
  }

  let currentEntity = "";
  let props: Record<string, string[]> = {};
  let polyPoints: Array<{ x: number; y: number }> = [];
  let polyClosed = false;
  let pendingX: number | null = null;

  const flushEntity = () => {
    if (!currentEntity) return;
    const layer = props["8"]?.[0] || "0";
    layerSet.add(layer);

    if (currentEntity === "LINE") {
      const x1 = parseFloat(props["10"]?.[0] ?? "NaN");
      const y1 = parseFloat(props["20"]?.[0] ?? "NaN");
      const x2 = parseFloat(props["11"]?.[0] ?? "NaN");
      const y2 = parseFloat(props["21"]?.[0] ?? "NaN");
      if ([x1, y1, x2, y2].every(Number.isFinite)) {
        lines.push({ x1, y1, x2, y2, layer });
      }
    } else if (currentEntity === "CIRCLE") {
      const cx = parseFloat(props["10"]?.[0] ?? "NaN");
      const cy = parseFloat(props["20"]?.[0] ?? "NaN");
      const r = parseFloat(props["40"]?.[0] ?? "NaN");
      if ([cx, cy, r].every(Number.isFinite) && r > 0) {
        circles.push({ cx, cy, r, layer });
      }
    } else if (currentEntity === "LWPOLYLINE" && polyPoints.length >= 2) {
      for (let p = 0; p + 1 < polyPoints.length; p++) {
        lines.push({
          x1: polyPoints[p].x,
          y1: polyPoints[p].y,
          x2: polyPoints[p + 1].x,
          y2: polyPoints[p + 1].y,
          layer,
        });
      }
      if (polyClosed && polyPoints.length > 2) {
        const last = polyPoints[polyPoints.length - 1];
        const first = polyPoints[0];
        lines.push({ x1: last.x, y1: last.y, x2: first.x, y2: first.y, layer });
      }
    }

    currentEntity = "";
    props = {};
    polyPoints = [];
    polyClosed = false;
    pendingX = null;
  };

  const MAX_ENTITIES = 6000;
  let entityCount = 0;

  while (i + 1 < rawLines.length && entityCount < MAX_ENTITIES) {
    const code = rawLines[i].trim();
    const val = rawLines[i + 1].trim();
    i += 2;

    if (code === "0") {
      flushEntity();
      if (val === "ENDSEC" || val === "EOF") break;
      currentEntity = val;
      entityCount++;
    } else if (currentEntity) {
      if (currentEntity === "LWPOLYLINE") {
        if (code === "10") {
          pendingX = parseFloat(val);
        } else if (code === "20" && pendingX !== null) {
          const py = parseFloat(val);
          if (Number.isFinite(pendingX) && Number.isFinite(py)) {
            polyPoints.push({ x: pendingX, y: py });
          }
          pendingX = null;
        } else if (code === "70") {
          const flag = parseInt(val, 10);
          polyClosed = (flag & 1) === 1;
        } else if (code === "8") {
          props["8"] = [val];
        }
      } else {
        if (!props[code]) props[code] = [];
        props[code].push(val);
      }
    }
  }
  flushEntity();

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const expand = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  for (const l of lines) {
    expand(l.x1, l.y1);
    expand(l.x2, l.y2);
  }
  for (const c of circles) {
    expand(c.cx - c.r, c.cy - c.r);
    expand(c.cx + c.r, c.cy + c.r);
  }

  const hasBounds =
    Number.isFinite(minX) &&
    Number.isFinite(minY) &&
    Number.isFinite(maxX) &&
    Number.isFinite(maxY);

  return {
    isAsciiDxf: true,
    lines,
    circles,
    layers: Array.from(layerSet),
    bounds: hasBounds ? { minX, minY, maxX, maxY } : null,
    entityCount,
  };
}

export interface IfcHeaderInspection {
  isStepIfc: boolean;
  schema: string;
  authoringApp: string;
  timestamp: string;
  elementCounts: Array<{ label: string; count: number }>;
}

/**
 * Non-destructive STEP header & element counter for open ASCII .ifc files.
 */
export async function inspectIfcStepMetadata(
  blob: Blob
): Promise<IfcHeaderInspection | null> {
  try {
    const sample = await blob.slice(0, Math.min(blob.size, 2 * 1024 * 1024)).text();
    if (!sample.includes("ISO-10303-21")) return null;

    const schemaMatch = sample.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i);
    const nameBlock = sample.match(/FILE_NAME\s*\(([\s\S]*?)\);/i);
    let timestamp = "";
    let authoringApp = "";
    if (nameBlock) {
      const strings = Array.from(nameBlock[1].matchAll(/'([^']*)'/g)).map(
        (m) => m[1]
      );
      timestamp = strings[1] || "";
      authoringApp = strings[4] || strings[3] || "";
    }

    const targets: Array<{ token: RegExp; label: string }> = [
      { token: /=\s*IFCWALL(?:STANDARDCASE)?\s*\(/gi, label: "جدران (IfcWall)" },
      { token: /=\s*IFCSLAB\s*\(/gi, label: "بلاطات وأسقف (IfcSlab)" },
      { token: /=\s*IFCCOLUMN\s*\(/gi, label: "أعمدة (IfcColumn)" },
      { token: /=\s*IFCBEAM\s*\(/gi, label: "كمرات (IfcBeam)" },
      { token: /=\s*IFCDOOR\s*\(/gi, label: "أبواب (IfcDoor)" },
      { token: /=\s*IFCWINDOW\s*\(/gi, label: "نوافذ (IfcWindow)" },
      { token: /=\s*IFCSPACE\s*\(/gi, label: "فراغات (IfcSpace)" },
      { token: /=\s*IFCBUILDINGSTOREY\s*\(/gi, label: "طوابق (IfcBuildingStorey)" },
    ];

    const elementCounts = targets
      .map((t) => ({
        label: t.label,
        count: (sample.match(t.token) || []).length,
      }))
      .filter((x) => x.count > 0);

    return {
      isStepIfc: true,
      schema: schemaMatch ? schemaMatch[1] : "IFC (ISO-10303-21)",
      authoringApp,
      timestamp,
      elementCounts,
    };
  } catch {
    return null;
  }
}
