"""Prepare a web map texture and trace the six clickable region silhouettes.

The boundary artwork is expected to be a transparent PNG whose alpha channel
contains closed black outlines. The script keeps a single optimized map texture
and prints compact SVG paths in the same 0..100 coordinate system used by the UI.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


REGION_SEEDS = {
    1: (350, 650),
    2: (820, 520),
    3: (480, 330),
    4: (760, 120),
    5: (1200, 330),
    6: (1160, 700),
}

MIN_ISLAND_AREA = 500
MAX_ISLAND_AREA = 10_000


@dataclass
class Component:
    runs: list[tuple[int, int, int]]
    area: int
    center: tuple[float, float]
    bounds: tuple[int, int, int, int]

    def contains(self, point: tuple[int, int]) -> bool:
        x, y = point
        return any(run_y == y and start <= x < end for run_y, start, end in self.runs)

    def to_mask(self, width: int, height: int) -> np.ndarray:
        mask = np.zeros((height, width), dtype=bool)
        for y, start, end in self.runs:
            mask[y, start:end] = True
        return mask


def filled_component(barrier: Image.Image, seed: tuple[int, int]) -> np.ndarray:
    canvas = Image.eval(barrier, lambda value: 0 if value else 255)
    ImageDraw.floodfill(canvas, seed, 128, thresh=0)
    return np.asarray(canvas) == 128


def discover_components(barrier: Image.Image) -> list[Component]:
    empty = np.asarray(barrier) == 0
    parents: list[int] = []
    all_runs: list[tuple[int, int, int, int]] = []
    previous: list[tuple[int, int, int]] = []

    def find(item: int) -> int:
        while parents[item] != item:
            parents[item] = parents[parents[item]]
            item = parents[item]
        return item

    def union(first: int, second: int) -> None:
        first_root, second_root = find(first), find(second)
        if first_root != second_root:
            parents[second_root] = first_root

    for y, row in enumerate(empty):
        padded = np.pad(row.astype(np.int8), 1)
        changes = np.diff(padded)
        starts = np.flatnonzero(changes == 1)
        ends = np.flatnonzero(changes == -1)
        current: list[tuple[int, int, int]] = []
        previous_index = 0
        for start, end in zip(starts.tolist(), ends.tolist()):
            run_id = len(parents)
            parents.append(run_id)
            current.append((start, end, run_id))
            all_runs.append((y, start, end, run_id))
            while previous_index < len(previous) and previous[previous_index][1] <= start:
                previous_index += 1
            overlap_index = previous_index
            while overlap_index < len(previous) and previous[overlap_index][0] < end:
                previous_start, previous_end, previous_id = previous[overlap_index]
                if previous_end > start and previous_start < end:
                    union(run_id, previous_id)
                overlap_index += 1
        previous = current

    grouped: dict[int, list[tuple[int, int, int]]] = {}
    for y, start, end, run_id in all_runs:
        grouped.setdefault(find(run_id), []).append((y, start, end))

    components: list[Component] = []
    for runs in grouped.values():
        area = sum(end - start for _, start, end in runs)
        if area < MIN_ISLAND_AREA:
            continue
        sum_x = sum((start + end - 1) * (end - start) / 2 for _, start, end in runs)
        sum_y = sum(y * (end - start) for y, start, end in runs)
        components.append(Component(
            runs=runs,
            area=area,
            center=(sum_x / area, sum_y / area),
            bounds=(min(start for _, start, _ in runs), min(y for y, _, _ in runs), max(end for _, _, end in runs), max(y for y, _, _ in runs) + 1),
        ))
    return components


def marching_loops(mask: np.ndarray) -> list[list[tuple[float, float]]]:
    padded = np.pad(mask.astype(np.uint8), 1)
    height, width = padded.shape
    segments: list[tuple[tuple[int, int], tuple[int, int]]] = []

    # Coordinates are doubled so half-pixel marching-square vertices stay exact.
    cases = {
        1: (("top", "left"),),
        2: (("right", "top"),),
        3: (("right", "left"),),
        4: (("bottom", "right"),),
        5: (("top", "left"), ("bottom", "right")),
        6: (("bottom", "top"),),
        7: (("bottom", "left"),),
        8: (("left", "bottom"),),
        9: (("top", "bottom"),),
        10: (("right", "top"), ("left", "bottom")),
        11: (("right", "bottom"),),
        12: (("left", "right"),),
        13: (("top", "right"),),
        14: (("left", "top"),),
    }

    for y in range(height - 1):
        for x in range(width - 1):
            case = int(padded[y, x] | padded[y, x + 1] << 1 | padded[y + 1, x + 1] << 2 | padded[y + 1, x] << 3)
            if case in (0, 15):
                continue
            points = {
                "top": (2 * x + 1, 2 * y),
                "right": (2 * x + 2, 2 * y + 1),
                "bottom": (2 * x + 1, 2 * y + 2),
                "left": (2 * x, 2 * y + 1),
            }
            segments.extend((points[start], points[end]) for start, end in cases[case])

    adjacency: dict[tuple[int, int], list[tuple[int, int]]] = {}
    unused: set[frozenset[tuple[int, int]]] = set()
    for start, end in segments:
        adjacency.setdefault(start, []).append(end)
        adjacency.setdefault(end, []).append(start)
        unused.add(frozenset((start, end)))

    loops: list[list[tuple[float, float]]] = []
    while unused:
        edge = next(iter(unused))
        start, current = tuple(edge)
        previous = start
        points = [start, current]
        unused.discard(edge)
        while current != start:
            candidates = [point for point in adjacency[current] if frozenset((current, point)) in unused]
            if not candidates:
                break
            following = candidates[0] if len(candidates) == 1 or candidates[0] != previous else candidates[-1]
            unused.discard(frozenset((current, following)))
            previous, current = current, following
            points.append(current)
        if len(points) > 4 and points[-1] == start:
            loops.append([((x / 2) - 1, (y / 2) - 1) for x, y in points[:-1]])
    return loops


def point_line_distance(point: tuple[float, float], start: tuple[float, float], end: tuple[float, float]) -> float:
    px, py = point
    sx, sy = start
    ex, ey = end
    dx, dy = ex - sx, ey - sy
    if dx == 0 and dy == 0:
        return ((px - sx) ** 2 + (py - sy) ** 2) ** 0.5
    amount = max(0.0, min(1.0, ((px - sx) * dx + (py - sy) * dy) / (dx * dx + dy * dy)))
    nearest_x, nearest_y = sx + amount * dx, sy + amount * dy
    return ((px - nearest_x) ** 2 + (py - nearest_y) ** 2) ** 0.5


def simplify_open(points: list[tuple[float, float]], tolerance: float) -> list[tuple[float, float]]:
    if len(points) <= 2:
        return points
    start, end = points[0], points[-1]
    distances = [point_line_distance(point, start, end) for point in points[1:-1]]
    if not distances or max(distances) <= tolerance:
        return [start, end]
    index = distances.index(max(distances)) + 1
    return simplify_open(points[: index + 1], tolerance)[:-1] + simplify_open(points[index:], tolerance)


def simplify_closed(points: list[tuple[float, float]], tolerance: float) -> list[tuple[float, float]]:
    if len(points) < 5:
        return points
    anchor = min(range(len(points)), key=lambda index: (points[index][0], points[index][1]))
    rotated = points[anchor:] + points[:anchor]
    opposite = max(range(1, len(rotated)), key=lambda index: point_line_distance(rotated[index], rotated[0], rotated[-1]))
    first = simplify_open(rotated[: opposite + 1], tolerance)
    second = simplify_open(rotated[opposite:] + [rotated[0]], tolerance)
    return first[:-1] + second[:-1]


def polygon_area(points: list[tuple[float, float]]) -> float:
    return abs(sum(points[index][0] * points[(index + 1) % len(points)][1] - points[(index + 1) % len(points)][0] * points[index][1] for index in range(len(points))) / 2)


def component_path(mask: np.ndarray, width: int, height: int, tolerance: float = 3.75) -> str:
    loops = marching_loops(mask)
    if not loops:
        raise ValueError("No closed contour found for region component")
    contour = max(loops, key=polygon_area)
    contour = simplify_closed(contour, tolerance)
    normalized = [(x / width * 100, y / height * 100) for x, y in contour]
    commands = [f"M {normalized[0][0]:.2f} {normalized[0][1]:.2f}"]
    commands.extend(f"L {x:.2f} {y:.2f}" for x, y in normalized[1:])
    commands.append("Z")
    return " ".join(commands)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("map_png", type=Path)
    parser.add_argument("boundary_png", type=Path)
    parser.add_argument("output_webp", type=Path)
    parser.add_argument("--quality", type=int, default=84)
    args = parser.parse_args()

    source = Image.open(args.map_png).convert("RGB")
    source.save(args.output_webp, "WEBP", quality=args.quality, method=6)

    alpha = Image.open(args.boundary_png).getchannel("A")
    if alpha.size != source.size:
        raise ValueError("Map and boundary images must have identical dimensions")
    barrier = alpha.point(lambda value: 255 if value > 20 else 0).filter(ImageFilter.MaxFilter(5))
    width, height = source.size
    components = discover_components(barrier)
    main_components: dict[int, Component] = {}
    for region_id, seed in REGION_SEEDS.items():
        main_components[region_id] = next(component for component in components if component.contains(seed))

    main_component_ids = {id(component) for component in main_components.values()}
    islands_by_region: dict[int, list[Component]] = {region_id: [] for region_id in REGION_SEEDS}
    for component in components:
        if id(component) in main_component_ids or component.area > MAX_ISLAND_AREA:
            continue
        # Northern archipelago belongs to the snowy land even when an island's
        # center happens to be closer to the seed of the eastern cursed region.
        region_id = 4 if component.center[1] < 150 else min(
            REGION_SEEDS,
            key=lambda candidate: (component.center[0] - REGION_SEEDS[candidate][0]) ** 2
            + (component.center[1] - REGION_SEEDS[candidate][1]) ** 2,
        )
        islands_by_region[region_id].append(component)

    print(f"texture={width}x{height} quality={args.quality} bytes={args.output_webp.stat().st_size}")
    for region_id in REGION_SEEDS:
        main = main_components[region_id]
        islands = sorted(islands_by_region[region_id], key=lambda component: component.center)
        print(f"region {region_id}: area={main.area} islands={len(islands)}")
        for island in islands:
            print(f"  island area={island.area} center=({island.center[0]:.0f},{island.center[1]:.0f}) bounds={island.bounds}")
        print(" ".join([
            component_path(main.to_mask(width, height), width, height),
            *(component_path(island.to_mask(width, height), width, height, 2.5) for island in islands),
        ]))


if __name__ == "__main__":
    main()
