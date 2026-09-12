"""Extract the supplied shop sprites and ability icons into transparent WebP assets."""
import argparse
from pathlib import Path
import numpy as np
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
args = parser.parse_args()
target = Path(__file__).resolve().parents[1] / "public" / "art" / "shop"
target.mkdir(parents=True, exist_ok=True)

def cuts(projection, count):
    size = len(projection)
    result = [0]
    for index in range(1, count):
        center = round(size * index / count)
        radius = round(size / count * .12)
        candidates = np.arange(center - radius, center + radius + 1)
        scores = projection[candidates]
        best = candidates[scores == scores.min()]
        result.append(int(best[np.argmin(abs(best - center))]))
    return result + [size]

for filename, rows, columns, prefix, edge in [
    ("Оружие магазина.png", 4, 2, "weapon", 480),
    ("Иконки оружия.png", 4, 4, "ability", 160),
]:
    sheet = Image.open(args.source / filename).convert("RGBA")
    alpha = np.asarray(sheet.getchannel("A")) > 2
    row_cuts = cuts(alpha.sum(axis=1), rows)
    for row in range(rows):
        top, bottom = row_cuts[row:row + 2]
        column_cuts = cuts(alpha[top:bottom].sum(axis=0), columns)
        for column in range(columns):
            left, right = column_cuts[column:column + 2]
            cell = sheet.crop((left, top, right, bottom))
            cell = cell.crop(cell.getchannel("A").getbbox())
            cell.thumbnail((edge, edge), Image.Resampling.LANCZOS)
            index = row * columns + column + 1
            path = target / f"{prefix}-{index}.webp"
            cell.save(path, quality=85, method=6, exact=True)
            print(path.name, cell.size, path.stat().st_size)
