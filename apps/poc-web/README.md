# Isometric Extractor — Web POC

Next.js proof of concept for the BOM + callout placement workflow described in the main project plan.

## What it demonstrates

1. Upload a DWG-exported **PDF** or raster **PNG/JPG**
2. Parse the **BOM table** (item, qty, description)
3. Detect **callout balloons** and trace **leader lines** to part locations
4. Overlay numbered markers on the drawing
5. **Export an annotated PDF**

Processing runs **in the browser** (pdf.js + Tesseract.js). This keeps the POC deployable on Vercel without GPU workers or native OCR binaries.

## Quick start

```bash
cd apps/poc-web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Try sample PDF** or **Try sample PNG**.

## Deploy to Vercel

```bash
cd apps/poc-web
npx vercel
```

Set the Vercel project root to `apps/poc-web`.

### Vercel considerations

| Topic | POC approach | Production note |
|-------|----------------|-----------------|
| OCR | Tesseract.js in browser (~15–40 s per sheet) | Move to GPU service or cloud OCR API |
| File size | Client-side only, no upload limit from API | Add size cap + progress for large PDFs |
| Accuracy | Heuristic table parser + ray-cast line trace | Train dedicated BOM/callout models (Phase B) |
| DWG | User exports to PDF first | Optional server converter (ODA / LibreCAD) |

## OCR and vision API options

The POC uses **Tesseract.js** when a PDF has no searchable text layer (common for matplotlib/AutoCAD plot-to-PDF paths that outline text as vectors).

For production, consider:

| Service | Best for | Access |
|---------|----------|--------|
| **Google Cloud Vision** | General OCR + bounding boxes | [cloud.google.com/vision](https://cloud.google.com/vision) — enable API, create service account JSON, call `DOCUMENT_TEXT_DETECTION` |
| **Azure AI Document Intelligence** | Tables + forms (strong BOM use case) | [learn.microsoft.com/azure/ai-services/document-intelligence](https://learn.microsoft.com/azure/ai-services/document-intelligence/) — create resource, use `prebuilt-layout` or custom model |
| **AWS Textract** | Table extraction from scans | [aws.amazon.com/textract](https://aws.amazon.com/textract/) |
| **PaddleOCR** (self-hosted) | High accuracy, no per-page cost | Run as Docker sidecar; Phase B default in `docs/PLAN.md` |
| **OpenAI / Anthropic vision** | Fast prototyping on messy sheets | API key + image upload; good for POC, costly at scale |

### Wiring a cloud OCR API (sketch)

1. Add `POST /api/analyze` that accepts the PDF upload.
2. Rasterize page 1 server-side (or send PDF bytes to Azure Document Intelligence directly).
3. Return text blocks with bounding boxes in the same shape as `TextItem`.
4. Reuse `bom-parser.ts` and `callout-detector.ts` unchanged.

Environment variables example:

```env
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://<resource>.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=<key>
```

## Difficulty assessment (honest POC takeaways)

| Step | Difficulty | Why |
|------|------------|-----|
| Upload + render PDF | Low | pdf.js works well in Next.js |
| BOM from searchable PDF | Medium | Table layouts vary; column alignment heuristics break on some templates |
| BOM from scans | Medium–High | Needs reliable OCR + table structure detection |
| Balloon number OCR | Medium | Small digits in circles are error-prone with Tesseract |
| Leader line → tip | High | Requires vector PDF path parsing or trained keypoint model; ray-cast heuristic is fragile |
| Production accuracy | High | Plan assumes synthetic training data + dedicated models (see `docs/PLAN.md`) |

## Sample files

- `public/samples/iso_00001.pdf` — generated from project `synth-gen` DXF
- `public/samples/iso_00001.png` — 300 DPI raster export

Regenerate samples from the repo root:

```bash
python3 -m synth_gen.cli run --count 1 --output data/poc-sample
```
