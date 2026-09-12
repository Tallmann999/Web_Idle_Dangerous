from __future__ import annotations

import argparse
import io
import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_ART = ROOT / "public" / "art"
BACKUP_ROOT = ROOT / "old Art" / "original-before-web-optimization"


def quality_for(path: Path) -> int:
    relative = path.relative_to(PUBLIC_ART).as_posix()
    if relative.startswith(("backgrounds/", "maps/")):
        return 78
    if relative.startswith(("abilities/", "map-points/", "projectiles/", "effects/")):
        return 84
    return 82


def encode_webp(path: Path) -> bytes | None:
    with Image.open(path) as source:
        source.load()
        # Small transparent sprites are already aggressively compressed and
        # repeated lossy encoding can blur their outlines. The large opaque
        # arena and world images are the useful optimization target.
        if source.mode != "RGB" or path.stat().st_size < 100_000:
            return None
        output = io.BytesIO()
        source.save(
            output,
            format="WEBP",
            quality=quality_for(path),
            method=4,
            exact=True,
        )
        return output.getvalue()


def main() -> None:
    parser = argparse.ArgumentParser(description="Recompress runtime WebP images when doing so saves at least 5%.")
    parser.add_argument("--apply", action="store_true", help="Back up and replace smaller files.")
    args = parser.parse_args()

    original_total = 0
    candidate_total = 0
    checked = 0
    selected: list[tuple[Path, bytes]] = []
    for path in sorted(PUBLIC_ART.rglob("*.webp")):
        candidate = encode_webp(path)
        if candidate is None:
            continue
        checked += 1
        original_size = path.stat().st_size
        original_total += original_size
        if len(candidate) <= original_size * 0.95:
            selected.append((path, candidate))
            candidate_total += len(candidate)
        else:
            candidate_total += original_size

    if args.apply:
        for path, candidate in selected:
            relative = path.relative_to(PUBLIC_ART)
            backup = BACKUP_ROOT / relative
            backup.parent.mkdir(parents=True, exist_ok=True)
            if not backup.exists():
                shutil.copy2(path, backup)
            path.write_bytes(candidate)

    saved = original_total - candidate_total
    mode = "applied" if args.apply else "dry-run"
    print(f"WEBP_OPTIMIZATION mode={mode} checked={checked} files={len(selected)} before={original_total} after={candidate_total} saved={saved}")
    for path, candidate in selected:
        print(f"  {path.relative_to(ROOT).as_posix()}: {path.stat().st_size if not args.apply else (BACKUP_ROOT / path.relative_to(PUBLIC_ART)).stat().st_size} -> {len(candidate)}")


if __name__ == "__main__":
    main()
