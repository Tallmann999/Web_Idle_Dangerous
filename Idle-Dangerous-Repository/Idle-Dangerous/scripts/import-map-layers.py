"""Encode supplied map art for the game; preserve all PNG pixels and alpha."""
from pathlib import Path
import argparse
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
args = parser.parse_args()
target = Path(__file__).resolve().parents[1] / "public" / "art" / "maps"
target.mkdir(parents=True, exist_ok=True)
Image.open(args.source / "Вся открытая карта.jpg").save(target / "world.webp", quality=85, method=6)
for region in range(1, 7):
    Image.open(args.source / f"Zone {region}.png").save(target / f"zone-{region}.webp", quality=85, method=6, exact=True)
    print(target / f"zone-{region}.webp")
