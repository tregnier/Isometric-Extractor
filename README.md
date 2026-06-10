# Isometric Extractor

AI pipeline for extracting Bill of Materials (BOM) and part locations from isometric piping drawings.

Designed to integrate with [Weld Dashboard](https://github.com/tregnier/Weld-Dashboard) and similar weld traceability tools — automating the manual step of placing component overlays on drawings.

## Goals

1. **BOM extraction** from drawing images — qty, description, attributes, material grade
2. **Part localization** — item callout positions (balloon + leader arrow)
3. **API** for external software to call inference

## Approach

**Synthetic-data-first:** generate isometric drawings with known ground truth, export through DWG → PDF → image, and train vision models on the linked dataset.

## Documentation

| Document | Description |
|----------|-------------|
| [docs/PLAN.md](docs/PLAN.md) | Full implementation plan — Phases A, B, C |
| [docs/DATASET_SCHEMA.md](docs/DATASET_SCHEMA.md) | Dataset layout and JSON schemas |

## Phases

| Phase | Focus | Status |
|-------|-------|--------|
| **A** | Synthetic data funnel (`synth-gen`) | Planned |
| **B** | Model training + verification | Planned |
| **C** | Inference API | Planned |

## Project Structure (planned)

```
packages/
├── synth-gen/     # Phase A — drawing generation
├── dataset/       # Schema validation + loaders
├── training/      # Phase B — train / verify
└── api/           # Phase C — FastAPI service
```

## Quick Start

_Not yet implemented. Phase A0 scaffold is the first milestone._

```bash
# Future usage
synth-gen run --count 1000 --output data/v1
python -m training.verify.run --checkpoint checkpoints/bom_v1.pt --dataset data/v1/test
docker compose up api
```

## License

TBD
