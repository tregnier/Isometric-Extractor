from __future__ import annotations

import sys
from pathlib import Path

import click

from synth_gen.pipeline import generate_drawing, write_index
from synth_gen.verify import verify_dataset


@click.group()
@click.version_option(package_name="isometric-extractor")
def main() -> None:
    """Generate synthetic isometric drawings for AI training."""


@main.command("run")
@click.option("--count", default=5, show_default=True, help="Number of drawings to generate.")
@click.option(
    "--output",
    "output_dir",
    default="data/v1",
    show_default=True,
    type=click.Path(path_type=Path),
    help="Output dataset directory.",
)
@click.option("--seed", default=42, show_default=True, help="Base random seed.")
@click.option("--items", "item_count", default=3, show_default=True, help="BOM rows per drawing.")
@click.option("--dpi", default=300, show_default=True, help="PNG export resolution.")
def run_command(
    count: int,
    output_dir: Path,
    seed: int,
    item_count: int,
    dpi: int,
) -> None:
    """Generate DXF + PNG + manifest dataset."""
    output_dir.mkdir(parents=True, exist_ok=True)
    results = []

    click.echo(f"Generating {count} drawing(s) into {output_dir.resolve()}")
    for index in range(count):
        drawing_id = f"iso_{index + 1:05d}"
        result = generate_drawing(
            output_dir=output_dir,
            drawing_id=drawing_id,
            seed=seed + index,
            item_count=item_count,
            dpi=dpi,
        )
        results.append(result)
        click.echo(f"  ✓ {drawing_id} -> {result.png_path.relative_to(output_dir)}")

    index_path = write_index(output_dir, results)
    click.echo(f"\nDone. Index written to {index_path.resolve()}")
    click.echo("\nOpen outputs:")
    click.echo(f"  PNG : {results[0].png_path.resolve()}")
    click.echo(f"  DXF : {results[0].dxf_path.resolve()}")
    click.echo(f"  JSON: {results[0].manifest_path.resolve()}")
    click.echo("\nNext: synth-gen verify --path data/v1")


@main.command("verify")
@click.option(
    "--path",
    "dataset_dir",
    required=True,
    type=click.Path(exists=True, file_okay=False, path_type=Path),
    help="Dataset directory created by synth-gen run.",
)
@click.option("--sample", "sample_count", default=5, show_default=True, help="Overlay sample count.")
def verify_command(dataset_dir: Path, sample_count: int) -> None:
    """Render QA overlays (red=item no, green=description, blue=BOM table)."""
    paths = verify_dataset(dataset_dir, sample_count=sample_count)
    click.echo(f"Wrote {len(paths)} overlay image(s) to {dataset_dir / 'verify'}")
    for path in paths:
        click.echo(f"  ✓ {path.resolve()}")


if __name__ == "__main__":
    main(sys.argv[1:])
