# Phase A1 — Getting Started

Phase A1 is a **local CLI tool** (`synth-gen`) that runs on your machine (or in Docker). It is not a hosted service yet — you install it, run it, and inspect files on disk.

## What it produces

For each drawing:

| File | Description |
|------|-------------|
| `spec.json` | Ground truth BOM (item no, qty, description, material) |
| `native.dxf` | Vector isometric drawing — open in AutoCAD / LibreCAD |
| `export_300dpi.png` | Raster image for model training |
| `manifest.json` | Links image bboxes ↔ BOM cells ↔ callout positions |

Training targets highlighted for your use case:

- **Red boxes (verify overlay):** `ITEM` column → Item No (e.g. `1`)
- **Green boxes:** `DESCRIPTION` column (e.g. `Seamless Pipe OD 125mm x 25.4mm WT`)

## Option 1 — Run locally (recommended for development)

```bash
git clone https://github.com/tregnier/Isometric-Extractor.git
cd Isometric-Extractor

python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e .

synth-gen run --count 5 --output data/v1
synth-gen verify --path data/v1
```

### Outputs

```
data/v1/
├── index.jsonl
├── drawings/
│   └── iso_00001/
│       ├── spec.json
│       ├── native.dxf
│       ├── export_300dpi.png
│       └── manifest.json
└── verify/
    └── iso_00001_overlay.png
```

Open `data/v1/verify/iso_00001_overlay.png` to confirm red/green boxes align with BOM cells.

## Option 2 — Run with Docker

```bash
docker compose build
docker compose run --rm synth-gen run --count 5 --output /data/v1
docker compose run --rm synth-gen verify --path /data/v1
```

Generated files appear in `./data/v1` on your host (mounted volume).

## CLI reference

```bash
synth-gen run --count 1000 --output data/v1 --seed 42 --items 3 --dpi 300
synth-gen verify --path data/v1 --sample 10
```

| Flag | Default | Purpose |
|------|---------|---------|
| `--count` | 5 | Number of drawings |
| `--output` | `data/v1` | Dataset directory |
| `--seed` | 42 | Reproducible randomness |
| `--items` | 3 | BOM rows per drawing |
| `--dpi` | 300 | PNG resolution |

## Where it runs

| Environment | Use case |
|-------------|----------|
| **Your laptop** | Development, inspecting DXF/PNG |
| **CI runner** | Regenerate dataset on each release |
| **GPU server** | Not needed for Phase A1 (no ML yet) |
| **Cloud VM** | Batch-generate large datasets |

Phase B (training) and Phase C (API) will be separate commands/services added later.

## Manifest example (training labels)

```json
{
  "bom": [
    {
      "itemNo": 1,
      "qty": 2,
      "description": "Seamless Pipe OD 125mm x 25.4mm WT",
      "materialGrade": "ASTM A106 GR B"
    }
  ],
  "trainingTargets": {
    "itemNoCells": [
      { "col": "item", "text": "1", "imageBbox": [2110, 55, 30, 20] }
    ],
    "descriptionCells": [
      {
        "col": "description",
        "text": "Seamless Pipe OD 125mm x 25.4mm WT",
        "imageBbox": [2180, 55, 420, 20]
      }
    ]
  }
}
```

These `imageBbox` values are what Phase B uses as supervised labels.
