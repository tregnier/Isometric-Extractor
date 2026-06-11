"use client";

import type { AnalysisResult, AnalyzeOptions } from "@/lib/types";
import { extractBom } from "@/lib/analyzer/bom-parser";
import { detectPlacements } from "@/lib/analyzer/callout-detector";
import { runOcr } from "@/lib/analyzer/ocr";
import { renderImageFile, renderPdfPage } from "@/lib/analyzer/render-pdf";

function normalizeResult(
  pageWidth: number,
  pageHeight: number,
  previewDataUrl: string,
  method: AnalysisResult["method"],
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
    method,
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
    warnings: [...bomResult.warnings, ...warnings],
  };
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
    : await renderPdfPage(file, 2);

  let textItems = rendered.textItems;
  let method: AnalysisResult["method"] = "pdf_text";

  if (textItems.length < 8) {
    onProgress?.("No searchable PDF text — running OCR…", 15);
    method = "ocr";
    textItems = await runOcr(rendered.canvas, onProgress);
  } else {
    onProgress?.("Extracted searchable PDF text…", 40);
  }

  onProgress?.("Parsing BOM table…", 70);
  const bomResult = extractBom(textItems);

  onProgress?.("Locating callout markers…", 85);
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
    method,
    bomResult,
    placementResult.placements,
    placementResult.warnings,
  );
}
