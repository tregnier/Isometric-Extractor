export type Bbox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TextItem = {
  text: string;
  bbox: Bbox;
  confidence?: number;
};

export type BomItem = {
  itemNo: number;
  qty: number;
  description: string;
  material?: string;
  confidence: number;
};

export type Placement = {
  itemNo: number;
  balloonBbox: Bbox;
  tipPoint: { x: number; y: number };
  confidence: number;
};

export type AnalysisResult = {
  pageWidth: number;
  pageHeight: number;
  bom: BomItem[];
  placements: Placement[];
  bomTableRegion?: Bbox;
  method: "pdf_text" | "ocr";
  warnings: string[];
  previewDataUrl: string;
};

export type AnalyzeOptions = {
  onProgress?: (message: string, percent: number) => void;
};
