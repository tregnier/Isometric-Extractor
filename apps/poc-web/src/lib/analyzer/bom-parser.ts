import type { BomItem, Bbox, TextItem } from "@/lib/types";
import { bboxUnion, clusterByY } from "@/lib/analyzer/geometry";

const HEADER_ALIASES: Record<string, string[]> = {
  item: ["item", "itemno", "item no", "no", "#"],
  qty: ["qty", "quantity", "qt"],
  description: ["description", "desc", "part"],
  material: ["material", "mat", "grade"],
};

function normalizeHeader(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9# ]/g, "").trim();
}

function matchHeader(text: string) {
  const normalized = normalizeHeader(text);
  for (const [column, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(normalized)) return column;
  }
  return null;
}

function parseInteger(text: string) {
  const match = text.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function findHeaderRow(items: TextItem[]) {
  const candidates = items
    .map((item) => ({ item, column: matchHeader(item.text) }))
    .filter((entry): entry is { item: TextItem; column: string } => entry.column !== null);

  if (candidates.length < 2) return null;

  const headerY = candidates.reduce((sum, entry) => sum + entry.item.bbox.y, 0) / candidates.length;
  const nearby = candidates.filter(
    (entry) => Math.abs(entry.item.bbox.y - headerY) <= 12,
  );

  const columns: Record<string, TextItem> = {};
  for (const entry of nearby) {
    columns[entry.column] = entry.item;
  }

  if (!columns.item || !columns.description) return null;

  return {
    columns,
    headerY,
    region: bboxUnion(nearby.map((entry) => entry.item.bbox)),
  };
}

function assignColumn(
  text: TextItem,
  columns: Record<string, TextItem>,
): string | null {
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

export function extractBom(
  items: TextItem[],
): { bom: BomItem[]; bomTableRegion?: Bbox; warnings: string[] } {
  const warnings: string[] = [];
  const header = findHeaderRow(items);

  if (!header) {
    warnings.push("Could not locate BOM table headers (ITEM / QTY / DESCRIPTION).");
    return { bom: [], warnings };
  }

  const dataItems = items.filter((item) => {
    if (matchHeader(item.text)) return false;
    if (item.bbox.y <= header.headerY + 4) return false;
    if (!header.region) return true;
    return (
      item.bbox.x >= header.region.x - 20 &&
      item.bbox.x <= header.region.x + header.region.width + 120
    );
  });

  const rows = clusterByY(dataItems, 10).sort(
    (a, b) => a[0].bbox.y - b[0].bbox.y,
  );

  const bom: BomItem[] = [];

  for (const row of rows) {
    const cells: Record<string, string> = {};
    for (const cell of row) {
      const column = assignColumn(cell, header.columns);
      if (!column) continue;
      cells[column] = cells[column] ? `${cells[column]} ${cell.text}` : cell.text;
    }

    const itemNo = parseInteger(cells.item ?? "");
    if (!itemNo) continue;

    const qty = parseInteger(cells.qty ?? "") ?? 1;
    const description = (cells.description ?? "").trim();
    if (!description) continue;

    const confidences = row
      .map((cell) => cell.confidence ?? 0.75)
      .filter((value) => value > 0);

    bom.push({
      itemNo,
      qty,
      description,
      material: cells.material?.trim() || undefined,
      confidence:
        confidences.length > 0
          ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
          : 0.7,
    });
  }

  if (!bom.length) {
    warnings.push("BOM headers were found but no data rows could be parsed.");
  }

  const tableBoxes = [
    ...(header.region ? [header.region] : []),
    ...dataItems.map((item) => item.bbox),
  ];

  return {
    bom,
    bomTableRegion: bboxUnion(tableBoxes),
    warnings,
  };
}
