import type { Bbox } from "@/lib/types";

export function bboxCenter(bbox: Bbox) {
  return {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height / 2,
  };
}

export function bboxContains(outer: Bbox, inner: Bbox, padding = 4) {
  return (
    inner.x >= outer.x - padding &&
    inner.y >= outer.y - padding &&
    inner.x + inner.width <= outer.x + outer.width + padding &&
    inner.y + inner.height <= outer.y + outer.height + padding
  );
}

export function bboxUnion(boxes: Bbox[]): Bbox | undefined {
  if (!boxes.length) return undefined;
  const xs = boxes.map((b) => b.x);
  const ys = boxes.map((b) => b.y);
  const x2 = boxes.map((b) => b.x + b.width);
  const y2 = boxes.map((b) => b.y + b.height);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    width: Math.max(...x2) - x,
    height: Math.max(...y2) - y,
  };
}

export function clusterByY<T extends { bbox: Bbox }>(items: T[], tolerance = 8): T[][] {
  const sorted = [...items].sort((a, b) => a.bbox.y - b.bbox.y);
  const clusters: T[][] = [];

  for (const item of sorted) {
    const cluster = clusters.find((group) => {
      const avgY =
        group.reduce((sum, entry) => sum + entry.bbox.y + entry.bbox.height / 2, 0) /
        group.length;
      const itemY = item.bbox.y + item.bbox.height / 2;
      return Math.abs(itemY - avgY) <= tolerance;
    });

    if (cluster) cluster.push(item);
    else clusters.push([item]);
  }

  return clusters;
}

export function normalizeBbox(bbox: Bbox, pageWidth: number, pageHeight: number): Bbox {
  return {
    x: bbox.x / pageWidth,
    y: bbox.y / pageHeight,
    width: bbox.width / pageWidth,
    height: bbox.height / pageHeight,
  };
}

export function denormalizePoint(
  point: { x: number; y: number },
  pageWidth: number,
  pageHeight: number,
) {
  return {
    x: point.x * pageWidth,
    y: point.y * pageHeight,
  };
}
