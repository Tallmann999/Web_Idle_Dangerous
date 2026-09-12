from __future__ import annotations

import argparse
import runpy
from pathlib import Path

import numpy as np
from PIL import Image


ALPHA_THRESHOLD = 2
ICON_LONG_EDGE = 160
ICON_QUALITY = 72
BOSS_LONG_EDGE = 288
BOSS_QUALITY = 72

ABILITY_NAMES = (
    "queen", "gold-bag", "ice-rain", "white-peaks", "strength",
    "agility", "credit", "hero-summon", "fire-fury", "crystal-shield",
    "abyss", "critical", "speed", "health", "armor",
    "wolf-summon", "treasure", "lightning", "poison", "leadership",
)


def isolated_cells(source: Image.Image, rows: int, columns: int) -> list[Image.Image]:
    # Assign complete alpha-connected objects to adaptive cells so a staff or
    # a wisp crossing a nominal boundary stays with its character.
    helpers = runpy.run_path(str(Path(__file__).with_name("import-zone-art.py")))
    alpha = np.asarray(source.getchannel("A"))
    mask = alpha > ALPHA_THRESHOLD
    labels = helpers["label_alpha_components"](alpha)
    row_cuts = adaptive_cuts(mask.sum(axis=1), rows)
    boxes = []
    for row in range(rows):
        top, bottom = row_cuts[row:row + 2]
        cuts = adaptive_cuts(mask[top:bottom].sum(axis=0), columns)
        boxes.extend((cuts[col], top, cuts[col + 1], bottom) for col in range(columns))
    count = int(labels.max()) + 1
    overlaps = np.stack([np.bincount(labels[t:b, l:r].ravel(), minlength=count) for l, t, r, b in boxes])
    assignments = overlaps.argmax(axis=0)
    sizes = overlaps.sum(axis=0)
    ranked = np.sort(overlaps, axis=0)
    shared = ranked[-2] >= np.maximum(50, ranked[-1] * .55)
    ownership = assignments[labels].astype(np.int16)
    for index, (l, t, r, b) in enumerate(boxes):
        area = ownership[t:b, l:r]
        area[shared[labels[t:b, l:r]]] = index
    rgb = np.asarray(source)[:, :, :3].astype(np.float32)
    yy, xx = np.indices(alpha.shape)
    if columns == 10:
        # The wolf's blue halo touches the chest at the shared boundary.
        wolf_halo = (ownership == 16) & (xx < 1320) & (rgb[:, :, 2] > rgb[:, :, 0] * 1.2) & (rgb[:, :, 2] > rgb[:, :, 1] * 1.05)
        ownership[wolf_halo] = -1
    else:
        # A detached violet spark above the horse belongs to row three.
        horse_spark = (ownership == 7) & (yy > 640) & (rgb[:, :, 2] > rgb[:, :, 0] * 1.2) & (rgb[:, :, 2] > rgb[:, :, 1] * 1.5)
        ownership[horse_spark] = 13
    cells = []
    for index in range(len(boxes)):
        selected = (ownership == index) & (labels > 0) & (sizes[labels] >= 6)
        ys, xs = np.nonzero(selected)
        l, t, r, b = max(0, int(xs.min()) - 3), max(0, int(ys.min()) - 3), min(source.width, int(xs.max()) + 4), min(source.height, int(ys.max()) + 4)
        crop = source.crop((l, t, r, b))
        crop.putalpha(Image.fromarray(np.where(selected[t:b, l:r], alpha[t:b, l:r], 0).astype(np.uint8)))
        cells.append(crop)
    return cells


def adaptive_cuts(projection: np.ndarray, part_count: int) -> list[int]:
    length = projection.shape[0]
    nominal = length / part_count
    smoothed = np.convolve(projection.astype(np.float64), np.ones(5), mode="same")
    cuts = [0]
    for part_index in range(1, part_count):
        target = round(part_index * nominal)
        radius = max(8, round(nominal * 0.16))
        start = max(cuts[-1] + 8, target - radius)
        end = min(length - 8, target + radius)
        candidates = np.arange(start, end + 1)
        scores = smoothed[candidates]
        best = candidates[scores == scores.min()]
        cuts.append(int(best[np.argmin(np.abs(best - target))]))
    cuts.append(length)
    return cuts


def trim_and_save(
    cell: Image.Image,
    output_path: Path,
    longest_edge: int,
    quality: int,
    method: int,
) -> tuple[int, int]:
    alpha = np.asarray(cell.getchannel("A"))
    visible_y, visible_x = np.nonzero(alpha > ALPHA_THRESHOLD)
    if visible_x.size == 0:
        raise RuntimeError(f"No visible pixels for {output_path.name}")
    padding = 3
    left = max(0, int(visible_x.min()) - padding)
    top = max(0, int(visible_y.min()) - padding)
    right = min(cell.width, int(visible_x.max()) + padding + 1)
    bottom = min(cell.height, int(visible_y.max()) + padding + 1)
    crop = cell.crop((left, top, right, bottom))
    scale = min(1.0, longest_edge / max(crop.size))
    if scale < 1:
        crop = crop.resize(
            (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
            Image.Resampling.LANCZOS,
        )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    crop.save(output_path, "WEBP", quality=quality, method=method, exact=True, alpha_quality=100)
    return crop.size


def import_abilities(source_path: Path, output_root: Path, method: int) -> None:
    source = Image.open(source_path).convert("RGBA")
    for name, cell in zip(ABILITY_NAMES, isolated_cells(source, 2, 10), strict=True):
        output_path = output_root / f"{name}.webp"
        size = trim_and_save(cell, output_path, ICON_LONG_EDGE, ICON_QUALITY, method)
        print(f"ability {output_path.name} {size[0]}x{size[1]} {output_path.stat().st_size} bytes", flush=True)


def import_bosses(source_path: Path, output_root: Path, method: int) -> None:
    source = Image.open(source_path).convert("RGBA")
    for number, cell in enumerate(isolated_cells(source, 3, 6), 1):
        output_path = output_root / f"boss-{number:02}.webp"
        size = trim_and_save(cell, output_path, BOSS_LONG_EDGE, BOSS_QUALITY, method)
        print(f"boss {output_path.name} {size[0]}x{size[1]} {output_path.stat().st_size} bytes", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Slice and optimize ability icons and boss sprites for the web build.")
    parser.add_argument("ability_sheet", type=Path)
    parser.add_argument("boss_sheet", type=Path)
    parser.add_argument("ability_output", type=Path)
    parser.add_argument("boss_output", type=Path)
    parser.add_argument("--method", type=int, choices=range(0, 7), default=6)
    args = parser.parse_args()
    import_abilities(args.ability_sheet, args.ability_output, args.method)
    import_bosses(args.boss_sheet, args.boss_output, args.method)


def contact_sheet(paths: list[Path], destination: Path, columns: int) -> None:
    from PIL import ImageDraw
    tile_w, tile_h = 220, 245
    preview = Image.new("RGB", (columns * tile_w, ((len(paths) + columns - 1) // columns) * tile_h), "#293d37")
    draw = ImageDraw.Draw(preview)
    for index, path in enumerate(paths):
        sprite = Image.open(path).convert("RGBA")
        sprite.thumbnail((210, 218))
        x, y = (index % columns) * tile_w, (index // columns) * tile_h
        preview.paste(sprite, (x + (tile_w - sprite.width) // 2, y + 2), sprite)
        draw.text((x + 5, y + 224), path.stem, fill="white")
    destination.parent.mkdir(parents=True, exist_ok=True)
    preview.save(destination)


if __name__ == "__main__":
    main()
