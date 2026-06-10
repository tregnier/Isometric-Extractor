# Dataset Schema Reference

This document defines the file layout and JSON schemas used across the training funnel.

## Directory Layout

```
data/v1/
├── index.jsonl                 # One line per drawing (summary)
├── drawings/
│   └── iso_00042/
│       ├── spec.json           # T0 — canonical ground truth
│       ├── native.dxf          # T1 — vector source
│       ├── export.pdf          # T2 — PDF
│       ├── export_300dpi.png   # T3 — raster (clean)
│       ├── export_300dpi_aug.png
│       └── manifest.json       # Full manifest with propagated coords
├── labels/
│   ├── coco_bom.json           # COCO format — BOM table regions
│   ├── coco_callouts.json      # COCO format — balloons + tips
│   └── train.jsonl             # Structured labels per image
└── stats/
    └── dataset_report.json
```

## `spec.json` (T0)

```json
{
  "$schema": "https://isometric-extractor.dev/schemas/drawing-spec-v1.json",
  "id": "iso_00042",
  "seed": 42,
  "version": "1.0",
  "sheet": {
    "width_mm": 420,
    "height_mm": 297,
    "title": "ISO-00042",
    "revision": "A"
  },
  "line": {
    "number": "6-P-1201",
    "spec": "A1A",
    "nps": "4"
  },
  "bom": [
    {
      "itemNo": 1,
      "qty": 2,
      "description": "ELBOW 90 DEG LR",
      "attributes": {
        "nps": "4",
        "schedule": "40",
        "rating": "150#",
        "endPrep": "BE"
      },
      "materialGrade": "ASTM A234 WPB",
      "componentType": "elbow_90_lr"
    },
    {
      "itemNo": 2,
      "qty": 1,
      "description": "PIPE SEAMLESS",
      "attributes": { "nps": "4", "schedule": "40", "length_mm": 1250 },
      "materialGrade": "ASTM A106 GR B",
      "componentType": "pipe"
    }
  ],
  "placements": [
    { "itemNo": 1, "modelPoint": [120.5, 85.0], "leaderStyle": "balloon" },
    { "itemNo": 2, "modelPoint": [200.0, 50.0], "leaderStyle": "balloon" }
  ],
  "routing": {
    "segments": [
      { "type": "pipe", "from": [50, 50], "to": [200, 50] },
      { "type": "elbow_90", "at": [200, 50], "direction_in": "E", "direction_out": "N" }
    ]
  },
  "bomTable": {
    "anchor": [280, 20],
    "columns": ["item", "qty", "description", "material"],
    "rowHeight_mm": 6
  }
}
```

## `manifest.json` (per drawing)

Links all export tiers with image-space annotations.

```json
{
  "id": "iso_00042",
  "specVersion": "1.0",
  "files": {
    "spec": "spec.json",
    "dxf": "native.dxf",
    "pdf": "export.pdf",
    "image": "export_300dpi.png"
  },
  "export": {
    "dpi": 300,
    "imageSize": [4961, 3508],
    "augmentation": null
  },
  "bom": [ /* copy from spec */ ],
  "bomTableRegion": {
    "modelBbox": [280, 20, 130, 90],
    "imageBbox": [2100, 50, 800, 600]
  },
  "placements": [
    {
      "itemNo": 1,
      "modelPoint": [120.5, 85.0],
      "imagePoint": [842, 615],
      "tipBbox": [830, 603, 24, 24],
      "balloonBbox": [800, 560, 36, 36],
      "itemNumberText": "1"
    }
  ],
  "cells": [
    {
      "row": 0,
      "col": "item",
      "text": "1",
      "imageBbox": [2110, 55, 30, 20]
    },
    {
      "row": 0,
      "col": "qty",
      "text": "2",
      "imageBbox": [2150, 55, 30, 20]
    }
  ]
}
```

## `train.jsonl` (one line per training image)

```json
{
  "image": "drawings/iso_00042/export_300dpi.png",
  "drawingId": "iso_00042",
  "bom": [ /* structured BOM rows */ ],
  "bomTableBbox": [2100, 50, 800, 600],
  "callouts": [
    {
      "itemNo": 1,
      "balloonBbox": [800, 560, 36, 36],
      "tipPoint": [842, 615],
      "ocrText": "1"
    }
  ]
}
```

## COCO Extensions

### `coco_callouts.json` categories

| id | name |
|----|------|
| 1 | balloon |
| 2 | arrow_tip |
| 3 | bom_table |

### Annotation linkage

Each COCO `image.id` maps to `drawingId` via `image.file_name`. Use `manifest.json` as the join key for structured fields beyond bboxes.

## Coordinate Conventions

- **Model space:** DXF units (mm), origin bottom-left, Y up
- **Image space:** pixels, origin top-left, Y down
- **Normalized:** `x_norm = x_px / image_width` (for API responses)
- All bboxes: `[x, y, width, height]` in the relevant coordinate system

## Validation Rules

A manifest is **valid** when:

1. Every `bom[].itemNo` has ≥ 0 matching `placements[].itemNo` (0 allowed for table-only items)
2. Every `placements[].itemNo` exists in `bom`
3. `bomTableRegion.imageBbox` is within image bounds
4. All `placements[].imagePoint` are within image bounds
5. `cells` row count equals `bom` row count

Run: `python -m dataset.validate --path data/v1`
