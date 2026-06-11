import type { BomItem, Bbox, TextItem } from "@/lib/types";
import { bboxUnion, clusterByY } from "@/lib/analyzer/geometry";
import {
  fuzzyEquals,
  lineTolerance,
  mergeWordsIntoLines,
  normalizeToken,
} from "@/lib/analyzer/text-lines";

const COLUMN_ALIASES: Record<string, string[]> = {
  item: ["item", "itemno", "item no", "no", "#"],
  qty: ["qty", "quantity", "qt", "q ty"],
  description: ["description", "desc", "part", "component"],
  material: ["material", "mat", "grade", "matl"],
};

function matchColumnHeader(text: string): string | null {
  const normalized = normalizeToken(text);
  if (!normalized) return null;

  for (const [column, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      if (normalized === alias || fuzzyEquals(normalized, alias, 2)) return column;
    }
  }

  return null;
}

function parseItemNo(text: string) {
  const trimmed = text.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

function parseQty(text: string) {
  const match = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number.parseFloat(match[1]) : null;
}

function findBomTitleLine(lines: TextItem[]) {
  return lines.find((line) => {
    const text = normalizeToken(line.text);
    return (
      (text.includes("bill") && text.includes("material")) ||
      text.includes("bill of materials") ||
      text.includes("bill of material")
    );
  });
}

function findHeaderCluster(items: TextItem[], titleLine?: TextItem) {
  const tolerance = lineTolerance(items);
  const candidates = items
    .map((item) => ({ item, column: matchColumnHeader(item.text) }))
    .filter((entry): entry is { item: TextItem; column: string } => entry.column !== null);

  const clusters = clusterByY(
    candidates.map((entry) => entry.item),
    tolerance,
  );

  let best:
    | {
        columns: Record<string, TextItem>;
        headerY: number;
        region: Bbox;
        score: number;
      }
    | null = null;

  for (const cluster of clusters) {
    const columns: Record<string, TextItem> = {};
    for (const item of cluster) {
      const column = matchColumnHeader(item.text);
      if (column && !columns[column]) columns[column] = item;
    }

    const score = Object.keys(columns).length;
    if (!columns.item || !columns.description || score < 2) continue;

    const headerY =
      cluster.reduce((sum, item) => sum + item.bbox.y + item.bbox.height / 2, 0) /
      cluster.length;

    if (titleLine && headerY < titleLine.bbox.y) continue;

    const region = bboxUnion(cluster.map((item) => item.bbox));
    if (!region) continue;

    if (!best || score > best.score) {
      best = { columns, headerY, region, score };
    }
  }

  return best;
}

function assignColumn(text: TextItem, columns: Record<string, TextItem>) {
  const centerX = text.bbox.x + text.bbox.width / 2;
  const entries = Object.entries(columns).map(([name, header]) => ({
    name,
    centerX: header.bbox.x + header.bbox.width / 2,
  }));

  entries.sort((a, b) => a.centerX - b.centerX);

  let best: { name: string; distance: number } | null = null;
  for (const entry of entries) {
    const distance = Math.abs(centerX - entry.centerX);
    if (!best || distance < best.distance) best = { name: entry.name, distance };
  }

  return best?.name ?? null;
}

function isStopRow(lineText: string) {
  const text = normalizeToken(lineText);
  return (
    text.includes("weld list") ||
    text.includes("weld no") ||
    text.includes("title block") ||
    text.includes("reference drawing")
  );
}

export function estimateBomRegion(
  items: TextItem[],
  pageWidth: number,
  pageHeight: number,
): Bbox | undefined {
  const lines = mergeWordsIntoLines(items);
  const titleLine = findBomTitleLine(lines);
  const header = findHeaderCluster(items, titleLine);

  if (!titleLine && !header) return undefined;

  const anchor = titleLine?.bbox ?? header!.region;
  const tableTop = header ? header.headerY - header.region.height : anchor.y;
  const tableBottom = Math.min(
    pageHeight,
    anchor.y + pageHeight * 0.28,
    header ? header.headerY + pageHeight * 0.22 : anchor.y + pageHeight * 0.25,
  );

  const left = Math.max(0, anchor.x - pageWidth * 0.02);
  const right = Math.min(
    pageWidth,
    Math.max(
      anchor.x + anchor.width + pageWidth * 0.35,
      header ? header.region.x + header.region.width + pageWidth * 0.08 : anchor.x + pageWidth * 0.4,
    ),
  );

  return {
    x: left,
    y: Math.max(0, tableTop - pageHeight * 0.01),
    width: right - left,
    height: tableBottom - Math.max(0, tableTop - pageHeight * 0.01),
  };
}

export function extractBom(
  items: TextItem[],
  pageWidth?: number,
  pageHeight?: number,
): { bom: BomItem[]; bomTableRegion?: Bbox; warnings: string[] } {
  const warnings: string[] = [];
  const lines = mergeWordsIntoLines(items);
  const titleLine = findBomTitleLine(lines);
  const header = findHeaderCluster(items, titleLine);

  if (!header) {
    if (titleLine) {
      warnings.push(
        'Found "BILL OF MATERIALS" title but could not match column headers. OCR may need a sharper render.',
      );
    } else {
      warnings.push(
        "Could not locate BOM table. Looked for BILL OF MATERIALS plus ITEM / DESCRIPTION / QTY headers.",
      );
    }
    return { bom: [], warnings };
  }

  const tolerance = lineTolerance(items);
  const tableLeft = header.region.x - tolerance * 2;
  const tableRight =
    header.region.x +
    header.region.width +
    (pageWidth ? pageWidth * 0.12 : header.region.width * 0.8);

  const dataItems = items.filter((item) => {
    if (matchColumnHeader(item.text)) return false;
    if (item.bbox.y + item.bbox.height / 2 <= header.headerY + tolerance * 0.25) return false;
    if (item.bbox.x < tableLeft || item.bbox.x > tableRight) return false;
    return true;
  });

  const rows = clusterByY(dataItems, tolerance).sort(
    (a, b) => a[0].bbox.y - b[0].bbox.y,
  );

  const bom: BomItem[] = [];

  for (const row of rows) {
    const rowLine = mergeWordsIntoLines(row, tolerance)[0];
    if (rowLine && isStopRow(rowLine.text)) break;

    const cells: Record<string, string> = {};
    for (const cell of row) {
      const column = assignColumn(cell, header.columns);
      if (!column) continue;
      cells[column] = cells[column] ? `${cells[column]} ${cell.text}` : cell.text;
    }

    const itemNo =
      parseItemNo(cells.item ?? "") ??
      parseItemNo(row.find((cell) => assignColumn(cell, header.columns) === "item")?.text ?? "");

    if (!itemNo) continue;

    const description = (cells.description ?? "").replace(/\s+/g, " ").trim();
    if (!description || description.length < 3) continue;

    const qty = parseQty(cells.qty ?? "") ?? 1;
    const confidences = row
      .map((cell) => cell.confidence ?? 0.75)
      .filter((value) => value > 0);

    bom.push({
      itemNo,
      qty,
      description,
      material: cells.material?.replace(/\s+/g, " ").trim() || undefined,
      confidence:
        confidences.length > 0
          ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
          : 0.7,
    });
  }

  if (!bom.length) {
    warnings.push(
      "BOM headers were found but no data rows could be parsed. Try a higher-resolution export or PNG upload.",
    );
  }

  const tableBoxes = [
    ...(titleLine ? [titleLine.bbox] : []),
    header.region,
    ...dataItems.map((item) => item.bbox),
  ];

  const bomTableRegion =
    pageWidth && pageHeight
      ? estimateBomRegion(items, pageWidth, pageHeight) ?? bboxUnion(tableBoxes)
      : bboxUnion(tableBoxes);

  return { bom, bomTableRegion, warnings };
}
