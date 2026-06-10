from __future__ import annotations

import json
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def _load_font(size: int = 14):
    try:
        return ImageFont.truetype("DejaVuSans.ttf", size=size)
    except OSError:
        return ImageFont.load_default()


def overlay_manifest(image_path: Path, manifest_path: Path, output_path: Path) -> None:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    image = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(image)
    font = _load_font()

    bom_bbox = manifest["bomTableRegion"]["imageBbox"]
    draw.rectangle(
        [bom_bbox[0], bom_bbox[1], bom_bbox[0] + bom_bbox[2], bom_bbox[1] + bom_bbox[3]],
        outline="blue",
        width=3,
    )
    draw.text((bom_bbox[0], max(0, bom_bbox[1] - 18)), "BOM TABLE", fill="blue", font=font)

    for cell in manifest.get("trainingTargets", {}).get("itemNoCells", []):
        bbox = cell["imageBbox"]
        draw.rectangle(
            [bbox[0], bbox[1], bbox[0] + bbox[2], bbox[1] + bbox[3]],
            outline="red",
            width=2,
        )
        draw.text((bbox[0], bbox[1] - 14), f"ITEM {cell['text']}", fill="red", font=font)

    for cell in manifest.get("trainingTargets", {}).get("descriptionCells", []):
        bbox = cell["imageBbox"]
        draw.rectangle(
            [bbox[0], bbox[1], bbox[0] + bbox[2], bbox[1] + bbox[3]],
            outline="green",
            width=2,
        )

    for placement in manifest.get("placements", []):
        tip = placement["imagePoint"]
        draw.ellipse([tip[0] - 5, tip[1] - 5, tip[0] + 5, tip[1] + 5], outline="orange", width=2)
        balloon = placement["balloonBbox"]
        draw.ellipse(
            [
                balloon[0],
                balloon[1],
                balloon[0] + balloon[2],
                balloon[1] + balloon[3],
            ],
            outline="purple",
            width=2,
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path)


def verify_dataset(dataset_dir: Path, sample_count: int = 5) -> list[Path]:
    index_path = dataset_dir / "index.jsonl"
    if not index_path.exists():
        raise FileNotFoundError(f"Missing index file: {index_path}")

    entries = [
        json.loads(line)
        for line in index_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    sample = entries if len(entries) <= sample_count else random.sample(entries, sample_count)

    output_paths: list[Path] = []
    verify_dir = dataset_dir / "verify"
    for entry in sample:
        drawing_dir = dataset_dir / "drawings" / entry["id"]
        image_path = dataset_dir / entry["image"]
        manifest_path = dataset_dir / entry["manifest"]
        output_path = verify_dir / f"{entry['id']}_overlay.png"
        overlay_manifest(image_path, manifest_path, output_path)
        output_paths.append(output_path)
    return output_paths
