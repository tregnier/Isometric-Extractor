from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from synth_gen.engine.annotations import DrawingAnnotations
from synth_gen.export.coords import model_bbox_to_image_bbox, model_point_to_image_point
from synth_gen.export.raster import RasterResult
from synth_gen.spec import DrawingSpec


def build_manifest(
    spec: DrawingSpec,
    annotations: DrawingAnnotations,
    raster: RasterResult,
    files: dict[str, str],
) -> dict[str, Any]:
    xlim = raster.xlim
    ylim = raster.ylim
    width = raster.width
    height = raster.height

    cells = []
    for text in annotations.texts:
        if text.column is None or text.row is None or text.row < 0:
            continue
        cells.append(
            {
                "row": text.row,
                "col": text.column,
                "itemNo": text.item_no,
                "text": text.text,
                "modelBbox": list(text.estimate_model_bbox()),
                "imageBbox": model_bbox_to_image_bbox(
                    text.estimate_model_bbox(), xlim, ylim, width, height
                ),
            }
        )

    placements = []
    for callout in annotations.callouts:
        placements.append(
            {
                "itemNo": callout.item_no,
                "labelText": callout.label_text,
                "modelPoint": list(callout.tip_point),
                "imagePoint": model_point_to_image_point(
                    callout.tip_point, xlim, ylim, width, height
                ),
                "balloonBbox": model_bbox_to_image_bbox(
                    callout.balloon_model_bbox(), xlim, ylim, width, height
                ),
                "tipBbox": model_bbox_to_image_bbox(
                    callout.tip_model_bbox(), xlim, ylim, width, height
                ),
            }
        )

    bom_table_bbox = annotations.bom_table_model_bbox()
    return {
        "id": spec.id,
        "specVersion": "1.0",
        "files": files,
        "export": {
            "dpi": raster.dpi,
            "imageSize": [width, height],
            "xlim": list(xlim),
            "ylim": list(ylim),
        },
        "bom": [item.to_dict() for item in spec.bom],
        "bomTableRegion": {
            "modelBbox": list(bom_table_bbox),
            "imageBbox": model_bbox_to_image_bbox(bom_table_bbox, xlim, ylim, width, height),
        },
        "cells": cells,
        "placements": placements,
        "trainingTargets": {
            "itemNoCells": [cell for cell in cells if cell["col"] == "item"],
            "descriptionCells": [cell for cell in cells if cell["col"] == "description"],
        },
    }


def save_manifest(path: Path, manifest: dict[str, Any]) -> None:
    path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
