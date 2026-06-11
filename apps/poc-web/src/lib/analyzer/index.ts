"use client";

import type { AnalysisResult, AnalyzeOptions } from "@/lib/types";
import { estimateBomRegion, extractBom } from "@/lib/analyzer/bom-parser";
import { detectPlacements } from "@/lib/analyzer/callout-detector";
import { runOcr, runOcrOnRegion } from "@/lib/analyzer/ocr";
import { renderImageFile, renderPdfPage } from "@/lib/analyzer/render-pdf";
import { expandBbox, normalizeToken } from "@/lib/analyzer/text-lines";
import type { TextItem } from "@/lib/types";

function normalizeResult(
  pageWidth: number,
  pageHeight: number,
  previewDataUrl: string,
  bomResult: ReturnType<typeof extractBom>,
  placements: AnalysisResult["placements"],
  warnings: string[],
): AnalysisResult {
  const normalizeBbox = (bbox: { x: number; y: number; width: number; height: number }) => ({
    x: bbox.x / pageWidth,
    y: bbox.y / pageHeight,
    width: bbox.width / pageWidth,
    height: bbox.height / pageHeight,
  });

  return {
    pageWidth,
    pageHeight,
    previewDataUrl,
    method: "ocr",
    bom: bomResult.bom,
    bomTableRegion: bomResult.bomTableRegion
      ? normalizeBbox(bomResult.bomTableRegion)
      : undefined,
    placements: placements.map((placement) => ({
      ...placement,
      balloonBbox: normalizeBbox(placement.balloonBbox),
      tipPoint: {
        x: placement.tipPoint.x / pageWidth,
        y: placement.tipPoint.y / pageHeight,
      },
    })),
    warnings,
  };
}

function mergeOcrResults(full: TextItem[], regional: TextItem[]) {
  const seen = new Set<string>();
  return [...regional, ...full].filter((item) => {
    const key = `${Math.round(item.bbox.x)}:${Math.round(item.bbox.y)}:${normalizeToken(item.text)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function analyzeDrawingFile(
  file: File,
  options: AnalyzeOptions = {},
): Promise<AnalysisResult> {
  const { onProgress } = options;
  const isImage = file.type.startsWith("image/");

  onProgress?.("Rendering drawing…", 5);
  const rendered = isImage
    ? await renderImageFile(file, 1)
    : await renderPdfPage(file, 3);

  onProgress?.("Running OCR on full drawing…", 12);
  const fullPageText = await runOcr(rendered.canvas, onProgress);

  onProgress?.("Locating BOM table region…", 58);
  const roughRegion = estimateBomRegion(fullPageText, rendered.width, rendered.height);

  let textItems = fullPageText;
  const warnings: string[] = [];

  const scanRegion =
    roughRegion ??
    ({
      x: rendered.width * 0.52,
      y: rendered.height * 0.48,
      width: rendered.width * 0.45,
      height: rendered.height * 0.42,
    } as const);

  if (!roughRegion) {
    warnings.push(
      "BOM title not found on first OCR pass. Scanning the bottom-right quadrant where BOM tables usually appear.",
    );
  }

  const paddedRegion = expandBbox(
    scanRegion,
    Math.max(12, rendered.width * 0.01),
    rendered.width,
    rendered.height,
  );

  try {
    const regionalText = await runOcrOnRegion(rendered.canvas, paddedRegion, onProgress);
    textItems = mergeOcrResults(fullPageText, regionalText);
  } catch {
    warnings.push("BOM region OCR refinement failed; using full-page OCR only.");
  }

  onProgress?.("Parsing BOM table…", 78);
  const bomResult = extractBom(textItems, rendered.width, rendered.height);

  onProgress?.("Locating callout markers…", 88);
  const context = rendered.canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");
  const imageData = context.getImageData(0, 0, rendered.width, rendered.height);

  const placementResult = detectPlacements(
    textItems,
    bomResult.bom,
    bomResult.bomTableRegion,
    imageData,
    rendered.width,
    rendered.height,
  );

  onProgress?.("Done", 100);

  return normalizeResult(
    rendered.width,
    rendered.height,
    rendered.dataUrl,
    bomResult,
    placementResult.placements,
    [...warnings, ...bomResult.warnings, ...placementResult.warnings],
  );
}
