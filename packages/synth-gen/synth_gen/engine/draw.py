from __future__ import annotations

import math

import ezdxf
from ezdxf.document import Drawing
from ezdxf.enums import TextEntityAlignment

from synth_gen.engine.annotations import CalloutAnnotation, DrawingAnnotations, TextAnnotation
from synth_gen.engine.geometry import iso_project
from synth_gen.spec import DrawingSpec


LAYER_PIPE = "PIPE"
LAYER_SYMBOLS = "SYMBOLS"
LAYER_BOM = "BOM_TABLE"
LAYER_CALLOUTS = "CALLOUTS"
LAYER_TITLE = "TITLEBLOCK"


def _setup_layers(doc: Drawing) -> None:
    for layer in [LAYER_PIPE, LAYER_SYMBOLS, LAYER_BOM, LAYER_CALLOUTS, LAYER_TITLE]:
        doc.layers.add(layer)


def _add_text(
    msp,
    point: tuple[float, float],
    text: str,
    height: float,
    layer: str,
    align=TextEntityAlignment.LEFT,
) -> None:
    msp.add_text(text, dxfattribs={"height": height, "layer": layer}).set_placement(
        point, align=align
    )


def _draw_title_block(msp, spec: DrawingSpec, annotations: DrawingAnnotations) -> None:
    origin = (18, 18)
    _add_text(msp, origin, f"DRAWING: {spec.sheet_title}", 4.0, LAYER_TITLE)
    _add_text(msp, (origin[0], origin[1] - 8), f"LINE: {spec.line_number}", 3.2, LAYER_TITLE)
    _add_text(msp, (origin[0], origin[1] - 16), f"REV: {spec.revision}", 3.2, LAYER_TITLE)
    annotations.texts.append(
        TextAnnotation(
            text=spec.sheet_title,
            model_point=origin,
            height=4.0,
            role="title",
        )
    )


def _draw_pipe_run(msp, origin: tuple[float, float]) -> list[tuple[float, float]]:
    """Draw a simple isometric pipe route and return key points for callout tips."""
    ox, oy = origin
    segments_3d = [
        (0, 0, 0),
        (80, 0, 0),
        (80, 50, 0),
        (140, 50, 0),
    ]
    points_2d = [iso_project(x + ox, y + oy, z) for x, y, z in segments_3d]

    for start, end in zip(points_2d, points_2d[1:]):
        msp.add_line(start, end, dxfattribs={"layer": LAYER_PIPE, "color": 7})

    for point in points_2d[1:-1]:
        msp.add_circle(point, radius=3.0, dxfattribs={"layer": LAYER_SYMBOLS, "color": 3})

    return points_2d


def _draw_bom_table(msp, spec: DrawingSpec, annotations: DrawingAnnotations) -> None:
    origin_x, origin_y = 250.0, 170.0
    row_height = 8.0
    col_widths = [14.0, 12.0, 95.0, 45.0]
    headers = ["ITEM", "QTY", "DESCRIPTION", "MATERIAL"]
    columns = ["item", "qty", "description", "material"]

    table_width = sum(col_widths)
    table_height = row_height * (len(spec.bom) + 1) + 4.0
    annotations.bom_table_origin = (origin_x, origin_y - table_height)
    annotations.bom_table_size = (table_width, table_height)

    top_y = origin_y
    x = origin_x
    for header, width in zip(headers, col_widths):
        _add_text(msp, (x + 1.0, top_y - 6.0), header, 2.8, LAYER_BOM)
        annotations.texts.append(
            TextAnnotation(
                text=header,
                model_point=(x + 1.0, top_y - 6.0),
                height=2.8,
                role="header",
                column=header.lower(),
                row=-1,
            )
        )
        x += width

    x0 = origin_x
    y = top_y - row_height
    msp.add_lwpolyline(
        [
            (origin_x, top_y),
            (origin_x + table_width, top_y),
            (origin_x + table_width, origin_y - table_height),
            (origin_x, origin_y - table_height),
            (origin_x, top_y),
        ],
        dxfattribs={"layer": LAYER_BOM},
    )

    for row_index, item in enumerate(spec.bom):
        row_y = y - row_index * row_height
        values = [
            str(item.item_no),
            str(item.qty),
            item.description,
            item.material_grade,
        ]
        x = x0
        for value, width, column in zip(values, col_widths, columns):
            text_point = (x + 1.0, row_y - 6.0)
            _add_text(msp, text_point, value, 2.6, LAYER_BOM)
            annotations.texts.append(
                TextAnnotation(
                    text=value,
                    model_point=text_point,
                    height=2.6,
                    role="bom_cell",
                    item_no=item.item_no,
                    column=column,
                    row=row_index,
                )
            )
            x += width

        msp.add_line(
            (x0, row_y),
            (x0 + table_width, row_y),
            dxfattribs={"layer": LAYER_BOM},
        )


def _draw_callout(
    msp,
    placement,
    annotations: DrawingAnnotations,
    index: int,
) -> None:
    tip = placement.model_point
    balloon_center = (tip[0] + 18.0 + index * 2.0, tip[1] + 22.0 + index * 3.0)
    radius = 4.0
    label = str(placement.item_no)

    msp.add_line(tip, balloon_center, dxfattribs={"layer": LAYER_CALLOUTS, "color": 1})
    msp.add_solid(
        [
            tip,
            (tip[0] - 1.5, tip[1] + 2.5),
            (tip[0] + 1.5, tip[1] + 2.5),
        ],
        dxfattribs={"layer": LAYER_CALLOUTS, "color": 1},
    )
    msp.add_circle(balloon_center, radius, dxfattribs={"layer": LAYER_CALLOUTS, "color": 1})
    _add_text(
        msp,
        balloon_center,
        label,
        3.0,
        LAYER_CALLOUTS,
        align=TextEntityAlignment.MIDDLE_CENTER,
    )

    annotations.callouts.append(
        CalloutAnnotation(
            item_no=placement.item_no,
            balloon_center=balloon_center,
            balloon_radius=radius,
            tip_point=tip,
            label_text=label,
        )
    )
    annotations.texts.append(
        TextAnnotation(
            text=label,
            model_point=balloon_center,
            height=3.0,
            role="callout_label",
            item_no=placement.item_no,
        )
    )


def build_drawing(spec: DrawingSpec) -> tuple[Drawing, DrawingAnnotations]:
    doc = ezdxf.new("R2010", setup=True)
    doc.units = ezdxf.units.MM
    _setup_layers(doc)
    msp = doc.modelspace()
    annotations = DrawingAnnotations(bom_table_origin=(0.0, 0.0), bom_table_size=(0.0, 0.0))

    _draw_title_block(msp, spec, annotations)
    pipe_points = _draw_pipe_run(msp, origin=(60.0, 90.0))

    for index, placement in enumerate(spec.placements):
        if index < len(pipe_points):
            placement.model_point = pipe_points[min(index + 1, len(pipe_points) - 1)]
        _draw_callout(msp, placement, annotations, index)

    _draw_bom_table(msp, spec, annotations)

    return doc, annotations
