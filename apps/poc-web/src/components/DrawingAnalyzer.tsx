"use client";

import { useState } from "react";
import { analyzeDrawingFile } from "@/lib/analyzer";
import { downloadAnnotatedPdf } from "@/lib/analyzer/export-annotated-pdf";
import type { AnalysisResult } from "@/lib/types";
import { BomTable } from "@/components/BomTable";
import { UploadZone } from "@/components/UploadZone";
import { ViewerDrawing } from "@/components/ViewerDrawing";

export function DrawingAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ message: "", percent: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleFileSelect(selected: File) {
    setFile(selected);
    setResult(null);
    setError(null);
    setIsProcessing(true);
    setProgress({ message: "Starting…", percent: 0 });

    try {
      const analysis = await analyzeDrawingFile(selected, {
        onProgress: (message, percent) => setProgress({ message, percent }),
      });
      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function loadSample(path: string, name: string) {
    const response = await fetch(path);
    const blob = await response.blob();
    const sampleFile = new File([blob], name, { type: blob.type || "application/pdf" });
    await handleFileSelect(sampleFile);
  }

  async function handleExport() {
    if (!file || !result) return;
    await downloadAnnotatedPdf(file, result);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          Isometric Extractor POC
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          BOM extraction and callout placement from isometric drawings
        </h1>
        <p className="max-w-3xl text-base leading-7 text-slate-600">
          Upload a DWG-exported PDF or PNG. The app parses the bill of materials, finds item
          balloons on the drawing, traces leader lines to part locations, and overlays numbered
          markers for review or PDF export.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <UploadZone onFileSelect={handleFileSelect} isProcessing={isProcessing} />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => loadSample("/samples/iso_00001.pdf", "iso_00001.pdf")}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-400 hover:text-sky-700 disabled:opacity-50"
            >
              Try sample PDF
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => loadSample("/samples/iso_00001.png", "iso_00001.png")}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-400 hover:text-sky-700 disabled:opacity-50"
            >
              Try sample PNG
            </button>
            {result && file && (
              <button
                type="button"
                onClick={handleExport}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Export annotated PDF
              </button>
            )}
          </div>

          {isProcessing && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                <span>{progress.message}</span>
                <span>{Math.round(progress.percent)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-900">Method:</span>{" "}
                {result.method === "pdf_text" ? "Searchable PDF text" : "OCR (Tesseract.js)"}
              </p>
              <p className="mt-1">
                <span className="font-medium text-slate-900">Items:</span> {result.bom.length} BOM
                rows, {result.placements.length} placements recognized
              </p>
              {result.warnings.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-amber-800">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Workflow</h2>
          <ol className="space-y-4 text-sm leading-6 text-slate-600">
            <li>
              <span className="font-medium text-slate-900">1. Upload</span> — PDF exported from DWG
              or a raster PNG/JPG scan.
            </li>
            <li>
              <span className="font-medium text-slate-900">2. BOM parse</span> — locate ITEM / QTY /
              DESCRIPTION headers and read table rows.
            </li>
            <li>
              <span className="font-medium text-slate-900">3. Callout match</span> — find numeric
              balloons outside the table and associate them with BOM item numbers.
            </li>
            <li>
              <span className="font-medium text-slate-900">4. Leader trace</span> — scan image lines
              from each balloon toward the part to estimate arrow tip position.
            </li>
            <li>
              <span className="font-medium text-slate-900">5. Review / export</span> — overlay
              markers on the drawing and download an annotated PDF.
            </li>
          </ol>
        </div>
      </section>

      {result && (
        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <ViewerDrawing result={result} />
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Extracted BOM</h2>
            <BomTable bom={result.bom} placements={result.placements} />
          </div>
        </section>
      )}
    </div>
  );
}
