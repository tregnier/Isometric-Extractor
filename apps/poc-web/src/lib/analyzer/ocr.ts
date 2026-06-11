"use client";

import type { Bbox, TextItem } from "@/lib/types";
import { PSM, createWorker } from "tesseract.js";

type OcrWord = {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
};

function wordToTextItem(word: OcrWord): TextItem {
  return {
    text: word.text.trim(),
    bbox: {
      x: word.bbox.x0,
      y: word.bbox.y0,
      width: word.bbox.x1 - word.bbox.x0,
      height: word.bbox.y1 - word.bbox.y0,
    },
    confidence: word.confidence / 100,
  };
}

function collectWords(data: {
  blocks?: Array<{
    paragraphs?: Array<{
      lines?: Array<{
        words?: OcrWord[];
      }>;
    }>;
  }> | null;
}): OcrWord[] {
  const words: OcrWord[] = [];
  for (const block of data.blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        for (const word of line.words ?? []) {
          if (word.text?.trim()) words.push(word);
        }
      }
    }
  }
  return words;
}

function cropCanvas(source: HTMLCanvasElement, region: Bbox) {
  const canvas = document.createElement("canvas");
  const width = Math.max(1, Math.round(region.width));
  const height = Math.max(1, Math.round(region.height));
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(
    source,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    width,
    height,
  );

  return canvas;
}

async function recognizeCanvas(
  canvas: HTMLCanvasElement,
  onProgress?: (message: string, percent: number) => void,
  pageSegMode: PSM = PSM.AUTO,
) {
  const worker = await createWorker("eng", 1, {
    logger: (message) => {
      if (message.status === "recognizing text" && message.progress) {
        onProgress?.("Recognizing text…", 20 + message.progress * 55);
      }
    },
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: pageSegMode,
      preserve_interword_spaces: "1",
    });
    return worker.recognize(canvas);
  } finally {
    await worker.terminate();
  }
}

export async function runOcr(
  canvas: HTMLCanvasElement,
  onProgress?: (message: string, percent: number) => void,
): Promise<TextItem[]> {
  onProgress?.("Loading OCR engine…", 10);
  const result = await recognizeCanvas(canvas, onProgress, PSM.AUTO);
  onProgress?.("Parsing OCR words…", 80);

  return collectWords(result.data)
    .map((word) => wordToTextItem(word))
    .filter((item) => item.text.length > 0);
}

export async function runOcrOnRegion(
  canvas: HTMLCanvasElement,
  region: Bbox,
  onProgress?: (message: string, percent: number) => void,
): Promise<TextItem[]> {
  onProgress?.("Refining BOM region with OCR…", 62);
  const cropped = cropCanvas(canvas, region);
  const result = await recognizeCanvas(cropped, onProgress, PSM.SINGLE_BLOCK);

  return collectWords(result.data)
    .map((word) => wordToTextItem(word))
    .filter((item) => item.text.length > 0)
    .map((item) => ({
      ...item,
      bbox: {
        x: item.bbox.x + region.x,
        y: item.bbox.y + region.y,
        width: item.bbox.width,
        height: item.bbox.height,
      },
    }));
}
