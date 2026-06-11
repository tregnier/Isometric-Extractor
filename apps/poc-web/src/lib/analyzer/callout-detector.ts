import type { BomItem, Bbox, Placement, TextItem } from "@/lib/types";
import { bboxCenter, bboxContains } from "@/lib/analyzer/geometry";
import { findLeaderTip } from "@/lib/analyzer/line-tracer";

function isBalloonLabel(text: string) {
  return /^\d{1,3}$/.test(text.trim());
}

export function detectPlacements(
  items: TextItem[],
  bom: BomItem[],
  bomTableRegion: Bbox | undefined,
  imageData: ImageData,
  pageWidth: number,
  pageHeight: number,
): { placements: Placement[]; warnings: string[] } {
  const warnings: string[] = [];
  const bomItemNumbers = new Set(bom.map((row) => row.itemNo));
  const drawingCenter = {
    x: bomTableRegion ? bomTableRegion.x * 0.35 : pageWidth * 0.35,
    y: pageHeight * 0.5,
  };

  const balloonCandidates = items.filter((item) => {
    if (!isBalloonLabel(item.text)) return false;
    const itemNo = Number.parseInt(item.text, 10);
    if (!bomItemNumbers.has(itemNo)) return false;
    const tablePadding = bomTableRegion
      ? Math.max(20, Math.round(bomTableRegion.width * 0.04))
      : 12;
    if (bomTableRegion && bboxContains(bomTableRegion, item.bbox, tablePadding)) return false;
    return true;
  });

  const placements: Placement[] = [];
  const used = new Set<number>();

  for (const candidate of balloonCandidates) {
    const itemNo = Number.parseInt(candidate.text, 10);
    if (used.has(itemNo)) continue;
    used.add(itemNo);

    const tipPoint = findLeaderTip(imageData, candidate.bbox, drawingCenter);
    const confidence = candidate.confidence ?? 0.72;

    placements.push({
      itemNo,
      balloonBbox: candidate.bbox,
      tipPoint,
      confidence,
    });
  }

  for (const row of bom) {
    if (!placements.some((placement) => placement.itemNo === row.itemNo)) {
      warnings.push(`No callout balloon detected for item ${row.itemNo}.`);
    }
  }

  placements.sort((a, b) => a.itemNo - b.itemNo);
  return { placements, warnings };
}

export function estimateDrawingCenter(
  placements: Placement[],
  bomTableRegion: Bbox | undefined,
  pageWidth: number,
  pageHeight: number,
) {
  if (placements.length) {
    const avg = placements.reduce(
      (acc, placement) => {
        const center = bboxCenter(placement.balloonBbox);
        return { x: acc.x + center.x, y: acc.y + center.y };
      },
      { x: 0, y: 0 },
    );
    return {
      x: avg.x / placements.length,
      y: avg.y / placements.length,
    };
  }

  return {
    x: bomTableRegion ? bomTableRegion.x * 0.35 : pageWidth * 0.35,
    y: pageHeight * 0.5,
  };
}
