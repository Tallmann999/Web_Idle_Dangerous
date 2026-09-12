import assert from "node:assert/strict";
import test from "node:test";

import {
  ICE_RAIN_COOLDOWN_SEC,
  ICE_RAIN_DURATION_SEC,
  ICE_RAIN_INTERVAL_MS,
  ICE_RAIN_PROJECTILE_TRAVEL_MS,
  ICE_RAIN_PROJECTILES_PER_SECOND,
  ICE_RAIN_PROJECTILES_PER_VOLLEY,
  ICE_RAIN_UPGRADE_ID,
  canActivateIceRain,
  createIceRainActivation,
  isIceRainUnlocked,
} from "../src/game/iceRainAbility.ts";

test("Ice Rain unlocks only after buying the Crystal Rifle level 150 upgrade", () => {
  assert.equal(ICE_RAIN_UPGRADE_ID, "blue_150");
  assert.equal(isIceRainUnlocked([]), false);
  assert.equal(isIceRainUnlocked(["blue_100"]), false);
  assert.equal(isIceRainUnlocked(["blue_10", "blue_150"]), true);
});

test("Ice Rain lasts fifteen seconds and then cools down for ten minutes", () => {
  const now = 1_000_000;
  const activation = createIceRainActivation(now);
  assert.equal(ICE_RAIN_DURATION_SEC, 15);
  assert.equal(ICE_RAIN_COOLDOWN_SEC, 600);
  assert.equal(activation.activeUntil, now + 15_000);
  assert.equal(activation.cooldownUntil, now + 615_000);
  assert.equal(canActivateIceRain(true, activation.activeUntil, activation.cooldownUntil, now), false);
  assert.equal(canActivateIceRain(true, 0, now, now), true);
  assert.equal(canActivateIceRain(false, 0, 0, now), false);
});

test("Ice Rain triples the projectile count at the original volley cadence", () => {
  assert.equal(ICE_RAIN_PROJECTILES_PER_VOLLEY, 3);
  assert.equal(ICE_RAIN_PROJECTILES_PER_SECOND, 16.5);
  assert.equal(ICE_RAIN_INTERVAL_MS, 182);
  assert.ok(1000 / ICE_RAIN_INTERVAL_MS * ICE_RAIN_PROJECTILES_PER_VOLLEY >= 15);
  assert.ok(1000 / ICE_RAIN_INTERVAL_MS * ICE_RAIN_PROJECTILES_PER_VOLLEY <= 18);
  assert.equal(ICE_RAIN_PROJECTILE_TRAVEL_MS, 240);
});
