import type { Bbox } from "@/lib/types";
import { bboxCenter } from "@/lib/analyzer/geometry";

function isDarkPixel(data: Uint8ClampedArray, index: number, threshold = 90) {
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  const a = data[index + 3];
  if (a < 20) return false;
  return r < threshold && g < threshold && b < threshold;
}

function samplePoint(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
) {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= width) return false;
  const index = (py * width + px) * 4;
  return isDarkPixel(data, index);
}

export function findLeaderTip(
  imageData: ImageData,
  balloonBbox: Bbox,
  drawingCenter: { x: number; y: number },
): { x: number; y: number } {
  const { data, width, height } = imageData;
  const center = bboxCenter(balloonBbox);
  const maxRadius = Math.min(width, height) * 0.35;
  let bestPoint = drawingCenter;
  let bestScore = -Infinity;

  for (let angle = 0; angle < 360; angle += 5) {
    const radians = (angle * Math.PI) / 180;
    const dx = Math.cos(radians);
    const dy = Math.sin(radians);
    let lastDark: { x: number; y: number } | null = null;
    let darkRun = 0;

    for (let radius = 8; radius < maxRadius; radius += 2) {
      const x = center.x + dx * radius;
      const y = center.y + dy * radius;
      if (x < 0 || y < 0 || x >= width || y >= height) break;

      if (samplePoint(data, width, x, y)) {
        lastDark = { x, y };
        darkRun += 1;
      } else if (darkRun > 3 && lastDark) {
        break;
      }
    }

    if (!lastDark || darkRun < 4) continue;

    const towardDrawing =
      1 /
      (1 +
        Math.hypot(lastDark.x - drawingCenter.x, lastDark.y - drawingCenter.y) /
          Math.max(width, height));
    const lineLength = Math.hypot(lastDark.x - center.x, lastDark.y - center.y);
    const score = lineLength * towardDrawing;

    if (score > bestScore) {
      bestScore = score;
      bestPoint = lastDark;
    }
  }

  return bestPoint;
}
