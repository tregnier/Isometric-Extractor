from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class TextAnnotation:
    text: str
    model_point: tuple[float, float]
    height: float
    role: str
    item_no: int | None = None
    column: str | None = None
    row: int | None = None

    def estimate_model_bbox(self) -> tuple[float, float, float, float]:
        width = max(len(self.text), 1) * self.height * 0.55
        x, y = self.model_point
        return x, y - self.height, width, self.height


@dataclass
class CalloutAnnotation:
    item_no: int
    balloon_center: tuple[float, float]
    balloon_radius: float
    tip_point: tuple[float, float]
    label_text: str

    def balloon_model_bbox(self) -> tuple[float, float, float, float]:
        x, y = self.balloon_center
        d = self.balloon_radius * 2
        return x - self.balloon_radius, y - self.balloon_radius, d, d

    def tip_model_bbox(self, size: float = 4.0) -> tuple[float, float, float, float]:
        x, y = self.tip_point
        return x - size / 2, y - size / 2, size, size


@dataclass
class DrawingAnnotations:
    bom_table_origin: tuple[float, float]
    bom_table_size: tuple[float, float]
    texts: list[TextAnnotation] = field(default_factory=list)
    callouts: list[CalloutAnnotation] = field(default_factory=list)

    def bom_table_model_bbox(self) -> tuple[float, float, float, float]:
        x, y = self.bom_table_origin
        w, h = self.bom_table_size
        return x, y, w, h

    def to_manifest_annotations(self) -> dict[str, Any]:
        return {
            "bomTableRegion": {
                "modelBbox": list(self.bom_table_model_bbox()),
            },
            "cells": [
                {
                    "row": text.row,
                    "col": text.column,
                    "itemNo": text.item_no,
                    "text": text.text,
                    "modelBbox": list(text.estimate_model_bbox()),
                }
                for text in self.texts
                if text.column is not None
            ],
            "callouts": [
                {
                    "itemNo": callout.item_no,
                    "labelText": callout.label_text,
                    "balloonModelBbox": list(callout.balloon_model_bbox()),
                    "tipModelPoint": list(callout.tip_point),
                    "tipModelBbox": list(callout.tip_model_bbox()),
                }
                for callout in self.callouts
            ],
        }
