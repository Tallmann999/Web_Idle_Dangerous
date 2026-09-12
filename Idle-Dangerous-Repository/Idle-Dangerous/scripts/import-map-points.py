"""Extract the supplied point atlas into small transparent runtime icons."""
from pathlib import Path
import argparse
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
args = parser.parse_args()
sheet = Image.open(args.source).convert("RGBA")
target = Path(__file__).resolve().parents[1] / "public/art/map-points"
target.mkdir(parents=True, exist_ok=True)
# Original atlas is 1440 x 1080; keep the supplied shapes and alpha.
boxes = {
    "dungeon": (40, 45, 360, 365),
    "dungeon-locked": (428, 0, 748, 384),
    "dungeon-boss": (752, 0, 1070, 385),
    "boss-defeated": (1080, 0, 1440, 348),
    "boss": (1080, 350, 1440, 710),
    "gold-mine": (420, 412, 748, 732),
    "level": (746, 763, 1056, 1080),
    "level-current": (1070, 730, 1440, 1080),
}
for name, box in boxes.items():
    box = tuple(round(value * sheet.size[index % 2] / (1440 if index % 2 == 0 else 1080)) for index, value in enumerate(box))
    icon = sheet.crop(box)
    icon = icon.crop(icon.getchannel("A").getbbox())
    icon.thumbnail((96, 96), Image.Resampling.LANCZOS)
    path = target / f"{name}.webp"
    icon.save(path, quality=65, method=6, exact=True)
    print(name, icon.size, path.stat().st_size)
