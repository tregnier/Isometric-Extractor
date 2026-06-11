"use client";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { AnalysisResult } from "@/lib/types";

const MARKER_COLORS = [
  rgb(0.86, 0.15, 0.15),
  rgb(0.09, 0.52, 0.9),
  rgb(0.12, 0.66, 0.32),
  rgb(0.93, 0.49, 0.08),
  rgb(0.55, 0.24, 0.74),
];

async function createPdfFromImage(result: AnalysisResult) {
  const pdfDoc = await PDFDocument.create();
  const imageBytes = await fetch(result.previewDataUrl).then((response) => response.arrayBuffer());
  const embedded = result.previewDataUrl.includes("image/png")
    ? await pdfDoc.embedPng(imageBytes)
    : await pdfDoc.embedJpg(imageBytes);
  const page = pdfDoc.addPage([result.pageWidth, result.pageHeight]);
  page.drawImage(embedded, {
    x: 0,
    y: 0,
    width: result.pageWidth,
    height: result.pageHeight,
  });
  return pdfDoc;
}

export async function exportAnnotatedPdf(
  sourceFile: File,
  result: AnalysisResult,
): Promise<Uint8Array> {
  const isImage = sourceFile.type.startsWith("image/");
  const pdfDoc = isImage
    ? await createPdfFromImage(result)
    : await PDFDocument.load(new Uint8Array(await sourceFile.arrayBuffer()), {
        ignoreEncryption: true,
      });
  const page = pdfDoc.getPage(0);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const placement of result.placements) {
    const color = MARKER_COLORS[(placement.itemNo - 1) % MARKER_COLORS.length];
    const tipX = placement.tipPoint.x * width;
    const tipY = height - placement.tipPoint.y * height;
    const label = String(placement.itemNo);
    const labelSize = 14;

    page.drawCircle({
      x: tipX,
      y: tipY,
      size: 10,
      borderColor: color,
      borderWidth: 2,
      color: rgb(1, 1, 1),
      opacity: 0.85,
    });

    page.drawText(label, {
      x: tipX - labelSize * 0.3,
      y: tipY - labelSize * 0.35,
      size: labelSize,
      font,
      color,
    });

    const balloon = placement.balloonBbox;
    const balloonX = (balloon.x + balloon.width / 2) * width;
    const balloonY = height - (balloon.y + balloon.height / 2) * height;

    page.drawLine({
      start: { x: tipX, y: tipY },
      end: { x: balloonX, y: balloonY },
      thickness: 1,
      color,
      opacity: 0.5,
    });
  }

  return pdfDoc.save();
}

export async function downloadAnnotatedPdf(sourceFile: File, result: AnalysisResult) {
  const bytes = await exportAnnotatedPdf(sourceFile, result);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${sourceFile.name.replace(/\.[^.]+$/, "")}-annotated.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
