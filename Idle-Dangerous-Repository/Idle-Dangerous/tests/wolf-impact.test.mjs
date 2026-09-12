import assert from "node:assert/strict";
import test from "node:test";
import { WOLF_IMPACT_LIFE_MS, nextWolfImpactDelay, getOpaqueBodyPoints } from "../src/game/wolfImpact.ts";

test("wolf visuals run three times faster without changing combat timing", () => {
  assert.equal(WOLF_IMPACT_LIFE_MS, 1000 / 3);
  assert.ok(Math.abs(nextWolfImpactDelay(() => 0) - 1400 / 3) < .001);
  assert.ok(Math.abs(nextWolfImpactDelay(() => 1) - 2000 / 3) < .001);
  assert.ok(Math.abs(nextWolfImpactDelay(() => .5) - 1700 / 3) < .001);
});
test("claw centers stay on the enemy body and skip transparent gaps and isolated pixels", () => {
  const size = 64;
  const pixels = new Uint8ClampedArray(size * size * 4);
  for (let y = 8; y < 56; y++) for (let x = 18; x < 46; x++) pixels[(y * size + x) * 4 + 3] = 255;
  pixels[(32 * size + 32) * 4 + 3] = 0;
  pixels[(6 * size + 6) * 4 + 3] = 255;
  const points = getOpaqueBodyPoints(pixels, size, size);
  assert.ok(points.length > 100);
  for (const point of points) {
    assert.ok(point.x >= 20 / size * 100 && point.x < 44 / size * 100);
    assert.ok(point.y >= 10 / size * 100 && point.y < 54 / size * 100);
    assert.notDeepEqual(point, { x: 50, y: 50 });
  }
  assert.deepEqual(getOpaqueBodyPoints(new Uint8ClampedArray(size * size * 4), size, size), [{ x: 50, y: 50 }]);
});
