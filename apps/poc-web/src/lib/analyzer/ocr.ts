"use client";

import type { TextItem } from "@/lib/types";

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

export async function runOcr(
  canvas: HTMLCanvasElement,
  onProgress?: (message: string, percent: number) => void,
): Promise<TextItem[]> {
  onProgress?.("Loading OCR engine…", 10);
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (message) => {
      if (message.status === "recognizing text" && message.progress) {
        onProgress?.("Recognizing text…", 20 + message.progress * 60);
      }
    },
  });

  try {
    const result = await worker.recognize(canvas);
    onProgress?.("Parsing OCR words…", 85);

    return collectWords(result.data)
      .map((word) => wordToTextItem(word))
      .filter((item) => item.text.length > 0);
  } finally {
    await worker.terminate();
  }
}
