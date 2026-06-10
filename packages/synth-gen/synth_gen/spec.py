from __future__ import annotations

import json
import random
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class BomItem:
    item_no: int
    qty: int
    description: str
    material_grade: str = ""
    attributes: dict[str, Any] = field(default_factory=dict)
    component_type: str = "pipe"

    def to_dict(self) -> dict[str, Any]:
        return {
            "itemNo": self.item_no,
            "qty": self.qty,
            "description": self.description,
            "materialGrade": self.material_grade,
            "attributes": self.attributes,
            "componentType": self.component_type,
        }


@dataclass
class Placement:
    item_no: int
    model_point: tuple[float, float]
    leader_style: str = "balloon"

    def to_dict(self) -> dict[str, Any]:
        return {
            "itemNo": self.item_no,
            "modelPoint": list(self.model_point),
            "leaderStyle": self.leader_style,
        }


@dataclass
class DrawingSpec:
    id: str
    seed: int
    sheet_title: str
    line_number: str
    bom: list[BomItem]
    placements: list[Placement]
    sheet_width_mm: float = 420.0
    sheet_height_mm: float = 297.0
    revision: str = "A"

    def to_dict(self) -> dict[str, Any]:
        return {
            "$schema": "https://isometric-extractor.dev/schemas/drawing-spec-v1.json",
            "id": self.id,
            "seed": self.seed,
            "version": "1.0",
            "sheet": {
                "width_mm": self.sheet_width_mm,
                "height_mm": self.sheet_height_mm,
                "title": self.sheet_title,
                "revision": self.revision,
            },
            "line": {"number": self.line_number, "spec": "A1A", "nps": "4"},
            "bom": [item.to_dict() for item in self.bom],
            "placements": [placement.to_dict() for placement in self.placements],
        }

    def save(self, path: Path) -> None:
        path.write_text(json.dumps(self.to_dict(), indent=2), encoding="utf-8")


DEFAULT_BOM_TEMPLATES: list[dict[str, Any]] = [
    {
        "description": "Seamless Pipe OD 125mm x 25.4mm WT",
        "material_grade": "ASTM A106 GR B",
        "component_type": "pipe",
        "attributes": {"od_mm": 125, "wt_mm": 25.4},
    },
    {
        "description": "ELBOW 90 DEG LR 4\" SCH 40",
        "material_grade": "ASTM A234 WPB",
        "component_type": "elbow_90_lr",
        "attributes": {"nps": "4", "schedule": "40"},
    },
    {
        "description": "FLANGE WN 4\" 150# RF",
        "material_grade": "ASTM A105",
        "component_type": "flange",
        "attributes": {"nps": "4", "rating": "150#"},
    },
    {
        "description": "TEE EQUAL 4\" SCH 40",
        "material_grade": "ASTM A234 WPB",
        "component_type": "tee",
        "attributes": {"nps": "4", "schedule": "40"},
    },
    {
        "description": "GATE VALVE 4\" 150#",
        "material_grade": "ASTM A216 WCB",
        "component_type": "valve",
        "attributes": {"nps": "4", "rating": "150#"},
    },
]


def generate_spec(drawing_id: str, seed: int, item_count: int = 3) -> DrawingSpec:
    rng = random.Random(seed)
    templates = rng.sample(DEFAULT_BOM_TEMPLATES, k=min(item_count, len(DEFAULT_BOM_TEMPLATES)))

    bom: list[BomItem] = []
    placements: list[Placement] = []
    base_x = 80.0
    base_y = 120.0

    for index, template in enumerate(templates, start=1):
        bom.append(
            BomItem(
                item_no=index,
                qty=rng.randint(1, 3),
                description=template["description"],
                material_grade=template["material_grade"],
                attributes=dict(template.get("attributes", {})),
                component_type=template["component_type"],
            )
        )
        placements.append(
            Placement(
                item_no=index,
                model_point=(base_x + index * 45.0, base_y + index * 18.0),
            )
        )

    return DrawingSpec(
        id=drawing_id,
        seed=seed,
        sheet_title=drawing_id.upper().replace("_", "-"),
        line_number=f"6-P-{rng.randint(1000, 9999)}",
        bom=bom,
        placements=placements,
    )
