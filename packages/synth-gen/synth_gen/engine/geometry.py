from __future__ import annotations

import math


COS_30 = math.cos(math.radians(30))
SIN_30 = math.sin(math.radians(30))


def iso_project(x: float, y: float, z: float = 0.0) -> tuple[float, float]:
    """Project 3D model coordinates to 2D isometric sheet coordinates (mm)."""
    iso_x = (x - y) * COS_30
    iso_y = (x + y) * SIN_30 - z
    return iso_x, iso_y


def offset_polyline(points: list[tuple[float, float]], dx: float, dy: float) -> list[tuple[float, float]]:
    return [(x + dx, y + dy) for x, y in points]
