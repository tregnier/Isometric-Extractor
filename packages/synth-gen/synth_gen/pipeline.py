from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from synth_gen.engine.draw import build_drawing
from synth_gen.export.manifest import build_manifest, save_manifest
from synth_gen.export.raster import render_dxf_to_png
from synth_gen.spec import DrawingSpec, generate_spec


@dataclass
class GenerationResult:
    drawing_id: str
    output_dir: Path
    spec_path: Path
    dxf_path: Path
    png_path: Path
    manifest_path: Path


def generate_drawing(
    output_dir: Path,
    drawing_id: str,
    seed: int,
    item_count: int = 3,
    dpi: int = 300,
) -> GenerationResult:
    spec = generate_spec(drawing_id=drawing_id, seed=seed, item_count=item_count)
    drawing_dir = output_dir / "drawings" / drawing_id
    drawing_dir.mkdir(parents=True, exist_ok=True)

    spec_path = drawing_dir / "spec.json"
    dxf_path = drawing_dir / "native.dxf"
    png_path = drawing_dir / f"export_{dpi}dpi.png"
    manifest_path = drawing_dir / "manifest.json"

    spec.save(spec_path)

    doc, annotations = build_drawing(spec)
    doc.saveas(dxf_path)

    raster = render_dxf_to_png(dxf_path, png_path, dpi=dpi)
    manifest = build_manifest(
        spec=spec,
        annotations=annotations,
        raster=raster,
        files={
            "spec": str(spec_path.relative_to(output_dir)),
            "dxf": str(dxf_path.relative_to(output_dir)),
            "image": str(png_path.relative_to(output_dir)),
        },
    )
    save_manifest(manifest_path, manifest)

    return GenerationResult(
        drawing_id=drawing_id,
        output_dir=drawing_dir,
        spec_path=spec_path,
        dxf_path=dxf_path,
        png_path=png_path,
        manifest_path=manifest_path,
    )


def write_index(output_dir: Path, results: list[GenerationResult]) -> Path:
    index_path = output_dir / "index.jsonl"
    lines = []
    for result in results:
        manifest = json.loads(result.manifest_path.read_text(encoding="utf-8"))
        lines.append(
            json.dumps(
                {
                    "id": result.drawing_id,
                    "spec": str(result.spec_path.relative_to(output_dir)),
                    "dxf": str(result.dxf_path.relative_to(output_dir)),
                    "image": str(result.png_path.relative_to(output_dir)),
                    "manifest": str(result.manifest_path.relative_to(output_dir)),
                    "bomCount": len(manifest.get("bom", [])),
                }
            )
        )
    index_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return index_path
