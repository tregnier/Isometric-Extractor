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

## Quick Start (Phase A1)

Phase A1 is a **local CLI** — install it, run it on your machine, outputs land in `data/`.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -e .

synth-gen run --count 5 --output data/v1
synth-gen verify --path data/v1
```

See **[docs/PHASE_A1.md](docs/PHASE_A1.md)** for Docker usage, output layout, and where it runs.

```bash
# Docker alternative
docker compose run --rm synth-gen run --count 5 --output /data/v1
```

Future phases:

```bash
python -m training.verify.run --checkpoint checkpoints/bom_v1.pt --dataset data/v1/test
docker compose up api
```

## License

TBD
