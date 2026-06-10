from __future__ import annotations


def model_bbox_to_image_bbox(
    bbox: tuple[float, float, float, float],
    xlim: tuple[float, float],
    ylim: tuple[float, float],
    image_width: int,
    image_height: int,
) -> list[int]:
    x, y, width, height = bbox
    return [
        int(round(model_to_image_x(x, xlim, image_width))),
        int(round(model_to_image_y(y + height, ylim, image_height))),
        int(round(width / (xlim[1] - xlim[0]) * image_width)),
        int(round(height / (ylim[1] - ylim[0]) * image_height)),
    ]


def model_point_to_image_point(
    point: tuple[float, float],
    xlim: tuple[float, float],
    ylim: tuple[float, float],
    image_width: int,
    image_height: int,
) -> list[int]:
    x, y = point
    return [
        int(round(model_to_image_x(x, xlim, image_width))),
        int(round(model_to_image_y(y, ylim, image_height))),
    ]


def model_to_image_x(x: float, xlim: tuple[float, float], image_width: int) -> float:
    return (x - xlim[0]) / (xlim[1] - xlim[0]) * image_width


def model_to_image_y(y: float, ylim: tuple[float, float], image_height: int) -> float:
    return (1.0 - (y - ylim[0]) / (ylim[1] - ylim[0])) * image_height
