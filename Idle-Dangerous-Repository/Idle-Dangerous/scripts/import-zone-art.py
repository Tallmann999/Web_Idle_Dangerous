from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image


BACKGROUND_LONG_EDGE = 1280
BACKGROUND_QUALITY = 65
SPRITE_LONG_EDGE = 288
SPRITE_QUALITY = 68
ALPHA_THRESHOLD = 2
MIN_COMPONENT_AREA = 6
SPRITE_PADDING = 6


@dataclass(frozen=True)
class SheetSpec:
    region_id: int
    file_name: str
    rows: int
    columns: int


SHEETS = (
    SheetSpec(1, "Enemy_Zone1_1.png", 4, 4),
    SheetSpec(1, "Enemy_Zone1_2.png", 4, 4),
    SheetSpec(2, "Enemy_Zone2_1.png", 3, 4),
    SheetSpec(2, "Enemy_Zone2_2.png", 3, 4),
    SheetSpec(3, "Enemy_Zone3_1.png", 3, 4),
    SheetSpec(3, "Enemy_Zone3_2.png", 3, 4),
    SheetSpec(4, "Enemy_Zone4_1.png", 3, 4),
    SheetSpec(4, "Enemy_Zone4_2.png", 4, 5),
    SheetSpec(5, "enemy TIR5_1.png", 3, 4),
    SheetSpec(5, "enemy TIR5_2.png", 4, 5),
    SheetSpec(6, "enemy TIR6_1.png", 4, 4),
    SheetSpec(6, "enemy TIR6_2.png", 4, 4),
)

KEPT_ENEMY_NUMBERS = {
    1: frozenset((1, 2, 3, 5, 6, 8, 9, 11, 12, 15, 16, 17, 19, 21, 24, 31)),
    2: frozenset((7, 8, 9, 10, 11, 12, 19, 20, 21, 22, 23, 24)),
    3: frozenset((7, 8, 9, 10, 11, 12, 19, 20, 21, 22, 23, 24)),
    4: frozenset((1, 2, 3, 4, 10, 11, 12, 13, 14, 15, 17, 18, 20, 21, 24, 26)),
    5: frozenset((1, 2, 5, 6, 7, 8, 9, 10, 11, 19, 20, 21, 26, 28, 31, 32)),
    6: frozenset((9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 28, 29, 30, 32)),
}


def find_adaptive_cuts(projection: np.ndarray, part_count: int) -> list[int]:
    length = projection.shape[0]
    nominal_part_size = length / part_count
    smoothed = np.convolve(projection.astype(np.float64), np.ones(5), mode="same")
    cuts = [0]
    for part_index in range(1, part_count):
        target = round(part_index * nominal_part_size)
        radius = max(8, round(nominal_part_size * 0.22))
        search_start = max(cuts[-1] + 12, target - radius)
        search_end = min(length - 12, target + radius)
        candidates = np.arange(search_start, search_end + 1)
        scores = smoothed[candidates]
        minimum_score = scores.min()
        best_candidates = candidates[scores == minimum_score]
        cut = int(best_candidates[np.argmin(np.abs(best_candidates - target))])
        cuts.append(cut)
    cuts.append(length)
    return cuts


def label_alpha_components(alpha: np.ndarray) -> np.ndarray:
    mask = alpha > ALPHA_THRESHOLD
    parent: list[int] = []
    rank: list[int] = []
    runs: list[tuple[int, int, int, int]] = []
    previous_runs: list[tuple[int, int, int]] = []

    def make_set() -> int:
        label = len(parent)
        parent.append(label)
        rank.append(0)
        return label

    def find(label: int) -> int:
        while parent[label] != label:
            parent[label] = parent[parent[label]]
            label = parent[label]
        return label

    def union(first: int, second: int) -> None:
        first_root = find(first)
        second_root = find(second)
        if first_root == second_root:
            return
        if rank[first_root] < rank[second_root]:
            first_root, second_root = second_root, first_root
        parent[second_root] = first_root
        if rank[first_root] == rank[second_root]:
            rank[first_root] += 1

    for y, row in enumerate(mask):
        padded = np.pad(row.astype(np.int8), (1, 1))
        changes = np.diff(padded)
        starts = np.flatnonzero(changes == 1)
        ends = np.flatnonzero(changes == -1) - 1
        current_runs: list[tuple[int, int, int]] = []
        previous_index = 0
        for x_start, x_end in zip(starts.tolist(), ends.tolist(), strict=True):
            label = make_set()
            while previous_index < len(previous_runs) and previous_runs[previous_index][1] < x_start - 1:
                previous_index += 1
            overlap_index = previous_index
            while overlap_index < len(previous_runs) and previous_runs[overlap_index][0] <= x_end + 1:
                union(label, previous_runs[overlap_index][2])
                overlap_index += 1
            current_runs.append((x_start, x_end, label))
            runs.append((y, x_start, x_end, label))
        previous_runs = current_runs

    roots = sorted({find(label) for _, _, _, label in runs})
    compact_labels = {root: index + 1 for index, root in enumerate(roots)}
    labels = np.zeros(alpha.shape, dtype=np.uint16)
    for y, x_start, x_end, label in runs:
        labels[y, x_start : x_end + 1] = compact_labels[find(label)]
    return labels


def save_sprite(
    source: Image.Image,
    alpha: np.ndarray,
    owner: np.ndarray,
    slot_index: int,
    output_path: Path,
    method: int,
) -> tuple[int, int]:
    slot_mask = owner == slot_index
    visible_y, visible_x = np.nonzero(slot_mask)
    if visible_x.size < MIN_COMPONENT_AREA:
        raise RuntimeError(f"No visible sprite in slot {slot_index + 1}")

    left = max(0, int(visible_x.min()) - SPRITE_PADDING)
    top = max(0, int(visible_y.min()) - SPRITE_PADDING)
    right = min(source.width, int(visible_x.max()) + SPRITE_PADDING + 1)
    bottom = min(source.height, int(visible_y.max()) + SPRITE_PADDING + 1)
    crop = source.crop((left, top, right, bottom))
    isolated_alpha = np.where(slot_mask[top:bottom, left:right], alpha[top:bottom, left:right], 0).astype(np.uint8)
    crop.putalpha(Image.fromarray(isolated_alpha, mode="L"))

    longest_edge = max(crop.size)
    if longest_edge > SPRITE_LONG_EDGE:
        scale = SPRITE_LONG_EDGE / longest_edge
        crop = crop.resize(
            (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
            Image.Resampling.LANCZOS,
        )

    crop.save(
        output_path,
        "WEBP",
        quality=SPRITE_QUALITY,
        method=method,
        exact=True,
        alpha_quality=100,
    )
    return crop.size


def import_enemy_sheets(source_root: Path, output_root: Path, method: int) -> dict[int, int]:
    output_root.mkdir(parents=True, exist_ok=True)
    source_counts = {region_id: 0 for region_id in range(1, 7)}
    output_counts = {region_id: 0 for region_id in range(1, 7)}

    for spec in SHEETS:
        sheet_path = source_root / spec.file_name
        if not sheet_path.is_file():
            raise FileNotFoundError(f"Missing enemy sheet: {sheet_path}")
        source = Image.open(sheet_path).convert("RGBA")
        alpha = np.asarray(source.getchannel("A"))
        mask = alpha > ALPHA_THRESHOLD
        labels = label_alpha_components(alpha)
        row_cuts = find_adaptive_cuts(mask.sum(axis=1), spec.rows)
        cell_boxes: list[tuple[int, int, int, int]] = []

        for row in range(spec.rows):
            row_top = row_cuts[row]
            row_bottom = row_cuts[row + 1]
            column_cuts = find_adaptive_cuts(mask[row_top:row_bottom].sum(axis=0), spec.columns)
            for column in range(spec.columns):
                cell_boxes.append((column_cuts[column], row_top, column_cuts[column + 1], row_bottom))

        label_count = int(labels.max())
        overlaps = np.zeros((len(cell_boxes), label_count + 1), dtype=np.int32)
        for slot_index, (left, top, right, bottom) in enumerate(cell_boxes):
            overlaps[slot_index] = np.bincount(labels[top:bottom, left:right].ravel(), minlength=label_count + 1)

        owner = np.full(alpha.shape, -1, dtype=np.int16)
        for label in range(1, label_count + 1):
            slot_counts = overlaps[:, label]
            total_area = int(slot_counts.sum())
            if total_area < MIN_COMPONENT_AREA:
                continue
            ordered_slots = np.argsort(slot_counts)[::-1]
            dominant_slot = int(ordered_slots[0])
            dominant_count = int(slot_counts[dominant_slot])
            secondary_count = int(slot_counts[int(ordered_slots[1])]) if len(ordered_slots) > 1 else 0
            component_mask = labels == label
            if secondary_count >= max(50, round(dominant_count * 0.55)):
                for slot_index, (left, top, right, bottom) in enumerate(cell_boxes):
                    cell_owner = owner[top:bottom, left:right]
                    cell_component = component_mask[top:bottom, left:right]
                    cell_owner[cell_component] = slot_index
            else:
                owner[component_mask] = dominant_slot

        for slot_index in range(len(cell_boxes)):
            source_counts[spec.region_id] += 1
            sprite_number = source_counts[spec.region_id]
            if sprite_number not in KEPT_ENEMY_NUMBERS[spec.region_id]:
                continue
            output_counts[spec.region_id] += 1
            output_path = output_root / f"region-{spec.region_id}-{sprite_number:02}.webp"
            size = save_sprite(source, alpha, owner, slot_index, output_path, method)
            print(f"sprite {output_path.name} {size[0]}x{size[1]} {output_path.stat().st_size} bytes")

    return output_counts


def import_backgrounds(source_root: Path, output_root: Path, method: int) -> None:
    output_root.mkdir(parents=True, exist_ok=True)
    for region_id in range(1, 7):
        source_path = source_root / f"{region_id:02}.png"
        if not source_path.is_file():
            raise FileNotFoundError(f"Missing zone background: {source_path}")
        source = Image.open(source_path).convert("RGB")
        if source.width > BACKGROUND_LONG_EDGE:
            height = round(source.height * BACKGROUND_LONG_EDGE / source.width)
            source = source.resize((BACKGROUND_LONG_EDGE, height), Image.Resampling.LANCZOS)
        output_path = output_root / f"zone-{region_id:02}.webp"
        source.save(output_path, "WEBP", quality=BACKGROUND_QUALITY, method=method)
        print(f"background {output_path.name} {source.width}x{source.height} {output_path.stat().st_size} bytes")


def main() -> None:
    parser = argparse.ArgumentParser(description="Import optimized regional backgrounds and tightly cropped enemy sprites.")
    parser.add_argument("background_source", type=Path)
    parser.add_argument("enemy_source", type=Path)
    parser.add_argument("background_output", type=Path)
    parser.add_argument("enemy_output", type=Path)
    parser.add_argument("--method", type=int, choices=range(0, 7), default=6)
    args = parser.parse_args()

    import_backgrounds(args.background_source, args.background_output, args.method)
    counts = import_enemy_sheets(args.enemy_source, args.enemy_output, args.method)
    print("enemy counts " + ", ".join(f"region {region_id}: {count}" for region_id, count in counts.items()))


if __name__ == "__main__":
    main()
