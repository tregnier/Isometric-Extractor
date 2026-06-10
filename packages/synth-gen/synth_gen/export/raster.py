from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import ezdxf
from ezdxf.addons.drawing import Frontend, RenderContext
from ezdxf.addons.drawing.matplotlib import MatplotlibBackend
import matplotlib.pyplot as plt


@dataclass
class RasterResult:
    image_path: Path
    width: int
    height: int
    dpi: int
    xlim: tuple[float, float]
    ylim: tuple[float, float]


def render_dxf_to_png(
    dxf_path: Path,
    png_path: Path,
    dpi: int = 300,
    margin: float = 10.0,
) -> RasterResult:
    doc = ezdxf.readfile(dxf_path)
    fig = plt.figure(figsize=(16, 11))
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_aspect("equal")
    ax.axis("off")

    ctx = RenderContext(doc)
    backend = MatplotlibBackend(ax)
    Frontend(ctx, backend).draw_layout(doc.modelspace())

    xmin, xmax = ax.get_xlim()
    ymin, ymax = ax.get_ylim()
    ax.set_xlim(xmin - margin, xmax + margin)
    ax.set_ylim(ymin - margin, ymax + margin)

    xmin, xmax = ax.get_xlim()
    ymin, ymax = ax.get_ylim()

    png_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(png_path, dpi=dpi, facecolor="white", bbox_inches="tight", pad_inches=0.05)
    plt.close(fig)

    width_px = int(fig.bbox.bounds[2] * dpi / fig.dpi) if fig.bbox.bounds else 0
    height_px = int(fig.bbox.bounds[3] * dpi / fig.dpi) if fig.bbox.bounds else 0

    from PIL import Image

    with Image.open(png_path) as image:
        width_px, height_px = image.size

    return RasterResult(
        image_path=png_path,
        width=width_px,
        height=height_px,
        dpi=dpi,
        xlim=(xmin, xmax),
        ylim=(ymin, ymax),
    )
