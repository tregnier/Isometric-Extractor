import type { Bbox, TextItem } from "@/lib/types";
import { bboxUnion } from "@/lib/analyzer/geometry";

export function normalizeToken(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9# ]/g, "").replace(/\s+/g, " ").trim();
}

export function levenshtein(a: string, b: string) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[b.length][a.length];
}

export function fuzzyEquals(token: string, target: string, maxDistance = 2) {
  const left = normalizeToken(token);
  const right = normalizeToken(target);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  return levenshtein(left, right) <= maxDistance;
}

export function medianWordHeight(items: TextItem[]) {
  const heights = items
    .map((item) => item.bbox.height)
    .filter((height) => height > 0)
    .sort((a, b) => a - b);

  if (!heights.length) return 14;
  return heights[Math.floor(heights.length / 2)];
}

export function lineTolerance(items: TextItem[]) {
  return Math.max(8, medianWordHeight(items) * 0.85);
}

export function mergeWordsIntoLines(items: TextItem[], tolerance?: number): TextItem[] {
  const yTolerance = tolerance ?? lineTolerance(items);
  const sorted = [...items].sort((a, b) => {
    const yDiff = a.bbox.y - b.bbox.y;
    if (Math.abs(yDiff) > 1) return yDiff;
    return a.bbox.x - b.bbox.x;
  });

  const lines: TextItem[][] = [];

  for (const item of sorted) {
    const itemY = item.bbox.y + item.bbox.height / 2;
    const line = lines.find((group) => {
      const avgY =
        group.reduce((sum, entry) => sum + entry.bbox.y + entry.bbox.height / 2, 0) /
        group.length;
      return Math.abs(itemY - avgY) <= yTolerance;
    });

    if (line) line.push(item);
    else lines.push([item]);
  }

  const merged: TextItem[] = [];

  for (const group of lines) {
    const ordered = [...group].sort((a, b) => a.bbox.x - b.bbox.x);
    const bbox = bboxUnion(ordered.map((entry) => entry.bbox));
    if (!bbox) continue;

    const confidence =
      ordered.reduce((sum, entry) => sum + (entry.confidence ?? 0.7), 0) / ordered.length;

    merged.push({
      text: ordered.map((entry) => entry.text).join(" "),
      bbox,
      confidence,
    });
  }

  return merged;
}

export function lineContainsAny(lineText: string, needles: string[]) {
  const normalized = normalizeToken(lineText);
  return needles.some((needle) => {
    const target = normalizeToken(needle);
    return normalized.includes(target) || fuzzyEquals(normalized, target, 2);
  });
}

export function expandBbox(bbox: Bbox, padding: number, maxWidth: number, maxHeight: number): Bbox {
  const x = Math.max(0, bbox.x - padding);
  const y = Math.max(0, bbox.y - padding);
  const x2 = Math.min(maxWidth, bbox.x + bbox.width + padding);
  const y2 = Math.min(maxHeight, bbox.y + bbox.height + padding);

  return {
    x,
    y,
    width: Math.max(1, x2 - x),
    height: Math.max(1, y2 - y),
  };
}

export function offsetTextItems(items: TextItem[], offsetX: number, offsetY: number): TextItem[] {
  return items.map((item) => ({
    ...item,
    bbox: {
      ...item.bbox,
      x: item.bbox.x + offsetX,
      y: item.bbox.y + offsetY,
    },
  }));
}
