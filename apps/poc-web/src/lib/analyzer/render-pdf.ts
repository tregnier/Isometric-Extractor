"use client";

import type { TextItem } from "@/lib/types";

export type RenderedPage = {
  width: number;
  height: number;
  scale: number;
  canvas: HTMLCanvasElement;
  dataUrl: string;
  textItems: TextItem[];
};

function textItemFromPdfJs(item: {
  str: string;
  transform: number[];
  width: number;
  height: number;
}): TextItem | null {
  const text = item.str.trim();
  if (!text) return null;

  const x = item.transform[4];
  const y = item.transform[5];
  const height = Math.abs(item.height) || Math.abs(item.transform[3]) || 10;
  const width = item.width || text.length * height * 0.55;

  return {
    text,
    bbox: {
      x,
      y: y - height,
      width,
      height,
    },
  };
}

export async function renderPdfPage(
  file: File,
  scale = 2,
): Promise<RenderedPage> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport, canvas }).promise;

  const textContent = await page.getTextContent();
  const textItems = textContent.items
    .map((item) => {
      if (!("str" in item)) return null;
      return textItemFromPdfJs({
        str: item.str,
        transform: item.transform,
        width: item.width,
        height: item.height,
      });
    })
    .filter((item): item is TextItem => item !== null);

  return {
    width: viewport.width,
    height: viewport.height,
    scale,
    canvas,
    dataUrl: canvas.toDataURL("image/png"),
    textItems,
  };
}

export async function renderImageFile(file: File, scale = 1): Promise<RenderedPage> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  return {
    width,
    height,
    scale,
    canvas,
    dataUrl: canvas.toDataURL("image/png"),
    textItems: [],
  };
}
