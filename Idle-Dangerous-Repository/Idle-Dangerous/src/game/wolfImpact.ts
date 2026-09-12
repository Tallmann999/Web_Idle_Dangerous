export const WOLF_IMPACT_LIFE_MS = 1_000 / 3;
export const WOLF_IMPACT_PAUSE_MIN_MS = 400 / 3;
export const WOLF_IMPACT_PAUSE_MAX_MS = 1_000 / 3;
export type BodyPoint = { x: number; y: number };

export function nextWolfImpactDelay(random = Math.random): number {
  return WOLF_IMPACT_LIFE_MS + WOLF_IMPACT_PAUSE_MIN_MS
    + random() * (WOLF_IMPACT_PAUSE_MAX_MS - WOLF_IMPACT_PAUSE_MIN_MS);
}

// Sample inside the silhouette, excluding transparent canvas and isolated edge pixels.
export function getOpaqueBodyPoints(rgba: Uint8ClampedArray, width: number, height: number): BodyPoint[] {
  const points: BodyPoint[] = [];
  const opaque = (x: number, y: number) => rgba[(y * width + x) * 4 + 3] >= 200;
  for (let y = 4; y < height - 4; y += 2) {
    for (let x = 4; x < width - 4; x += 2) {
      if (opaque(x, y) && opaque(x - 2, y) && opaque(x + 2, y) && opaque(x, y - 2) && opaque(x, y + 2)) {
        points.push({ x: x / width * 100, y: y / height * 100 });
      }
    }
  }
  return points.length ? points : [{ x: 50, y: 50 }];
}
