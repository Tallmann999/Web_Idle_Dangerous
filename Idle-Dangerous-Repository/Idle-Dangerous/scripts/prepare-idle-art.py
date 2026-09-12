"""Reproducible, lossless-source sprite extraction. Requires Python + Pillow.

The supplied sheets have irregular spacing, NOT animation frames or uniform grids.
Keep public/Item originals; export only the art used by the existing game economy.
"""
import json
from collections import deque
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/art/items'
# Explicit source rectangles, reviewed against the seven supplied sheets.
SELECTIONS = {
    'helmet': ('item2.png', (0, 442, 215, 703)),
    'armor': ('item2.png', (982, 436, 1254, 712)),
    'bracers': ('item2.png', (500, 447, 709, 710)),
    'boots': ('item2.png', (709, 440, 982, 710)),
    'shoulders': ('item6.png', (734, 941, 982, 1225)),
    'ring': ('item01.png', (10, 557, 248, 791)),
    'amulet': ('item01.png', (1006, 277, 1254, 556)),
    'claw': ('item6.png', (20, 655, 283, 927)),
    'hide': ('item6.png', (970, 35, 1254, 355)),
    'bone': ('item6.png', (288, 652, 609, 927)),
    'crystal': ('item01.png', (1010, 10, 1254, 276)),
    'essence': ('item7.png', (1017, 55, 1254, 350)),
    'heart': ('item7.png', (297, 348, 538, 650)),
}

def isolate_sprite(sprite):
    """Remove disconnected slivers of neighbours at irregular cell boundaries."""
    width, height = sprite.size
    alpha = sprite.getchannel('A')
    pixels = alpha.tobytes()
    seen = bytearray(width * height)
    largest = []
    for start, value in enumerate(pixels):
        if value <= 8 or seen[start]:
            continue
        queue, component = deque([start]), []
        seen[start] = 1
        while queue:
            p = queue.popleft()
            component.append(p)
            x, y = p % width, p // width
            for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if 0 <= nx < width and 0 <= ny < height:
                    n = ny * width + nx
                    if not seen[n] and pixels[n] > 8:
                        seen[n] = 1
                        queue.append(n)
        if len(component) > len(largest):
            largest = component
    mask = bytearray(width * height)
    for p in largest:
        mask[p] = 255
    # Preserve antialiased edge pixels around the selected connected silhouette.
    silhouette = Image.frombytes('L', sprite.size, bytes(mask)).filter(ImageFilter.MaxFilter(3))
    sprite.putalpha(ImageChops.multiply(alpha, silhouette))
    return sprite

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    cell, cols = 160, 4
    rows = (len(SELECTIONS) + cols - 1) // cols
    atlas = Image.new('RGBA', (cols * cell, rows * cell))
    review = Image.new('RGB', (cols * cell, rows * (cell + 24)), '#24302b')
    draw = ImageDraw.Draw(review)
    frames, sources = {}, {}
    for i, (name, (sheet, box)) in enumerate(SELECTIONS.items()):
        sprite = Image.open(ROOT / 'public/Item' / sheet).convert('RGBA').crop(box)
        sprite = isolate_sprite(sprite)
        bbox = sprite.getchannel('A').getbbox()
        if bbox is None:
            raise ValueError(f'Empty sprite: {name}')
        sprite = ImageOps.contain(sprite.crop(bbox), (cell - 16, cell - 16), Image.Resampling.LANCZOS)
        tile = Image.new('RGBA', (cell, cell))
        tile.paste(sprite, ((cell - sprite.width) // 2, (cell - sprite.height) // 2))
        tile.save(OUT / f'{name}.webp', quality=92, method=6)
        x, y = i % cols * cell, i // cols * cell
        atlas.paste(tile, (x, y))
        frames[name] = {'frame': {'x': x, 'y': y, 'w': cell, 'h': cell},
                        'rotated': False, 'trimmed': False,
                        'spriteSourceSize': {'x': 0, 'y': 0, 'w': cell, 'h': cell},
                        'sourceSize': {'w': cell, 'h': cell}}
        sources[name] = {'sheet': f'Item/{sheet}', 'rect': list(box)}
        ry = i // cols * (cell + 24)
        review.paste(tile, (x, ry), tile)
        draw.text((x + 8, ry + cell), name, fill='#eee2bd')
    atlas.save(OUT / 'items.webp', quality=92, method=6)
    (OUT / 'items.json').write_text(json.dumps({'frames': frames, 'meta': {
        'image': 'items.webp', 'size': {'w': atlas.width, 'h': atlas.height}, 'scale': '1'}}, indent=2) + '\n')
    (OUT / 'sources.json').write_text(json.dumps(sources, indent=2) + '\n')
    review.save(ROOT / 'docs/screenshots/item-sprites.png')
    print(f'Exported {len(frames)} sprites and a {atlas.width}x{atlas.height} Phaser atlas to {OUT}')

if __name__ == '__main__':
    main()
