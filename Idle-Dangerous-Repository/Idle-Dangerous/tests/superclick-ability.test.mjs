import assert from "node:assert/strict";
import test from "node:test";

import {
  SUPERCLICK_AD_DURATION_SEC,
  SUPERCLICK_COOLDOWN_SEC,
  SUPERCLICK_DURATION_SEC,
  SUPERCLICK_INTERVAL_MS,
  SUPERCLICK_RATE_PER_SECOND,
  canActivateSuperclick,
  createSuperclickActivation,
  getSuperclickRemainingSec,
  isSuperclickActive,
  isSuperclickUnlocked,
  normalizeSuperclickTimestamp,
} from "../src/game/superclickAbility.ts";

test("gray milestone 25 is the saved superclick unlock gate", () => {
  assert.equal(isSuperclickUnlocked([]), false);
  assert.equal(isSuperclickUnlocked([10]), false);
  assert.equal(isSuperclickUnlocked([10, 25]), true);
});

test("rewarded activation creates a three-minute effect followed by a ten-minute cooldown", () => {
  const now = 1_000_000;
  const activation = createSuperclickActivation(now);

  assert.equal(SUPERCLICK_AD_DURATION_SEC, 2);
  assert.equal(SUPERCLICK_DURATION_SEC, 180);
  assert.equal(SUPERCLICK_COOLDOWN_SEC, 600);
  assert.equal(SUPERCLICK_RATE_PER_SECOND, 10);
  assert.equal(SUPERCLICK_INTERVAL_MS, 100);
  assert.equal(activation.activeUntil, now + SUPERCLICK_DURATION_SEC * 1000);
  assert.equal(activation.cooldownUntil, activation.activeUntil + SUPERCLICK_COOLDOWN_SEC * 1000);
  assert.equal(isSuperclickActive(activation.activeUntil, now + 179_999), true);
  assert.equal(isSuperclickActive(activation.activeUntil, now + 180_000), false);
});

test("superclick cannot be activated while active or cooling down", () => {
  const now = 5_000;
  assert.equal(canActivateSuperclick(false, 0, 0, now), false);
  assert.equal(canActivateSuperclick(true, now + 1, now + 600_000, now), false);
  assert.equal(canActivateSuperclick(true, 0, now + 1, now), false);
  assert.equal(canActivateSuperclick(true, 0, now, now), true);
});

test("saved timers survive reload but invalid and stale values are discarded", () => {
  const now = 2_000_000;
  assert.equal(normalizeSuperclickTimestamp(undefined, now, SUPERCLICK_DURATION_SEC), 0);
  assert.equal(normalizeSuperclickTimestamp(now - 1, now, SUPERCLICK_DURATION_SEC), 0);
  assert.equal(normalizeSuperclickTimestamp(now + 12_345, now, SUPERCLICK_DURATION_SEC), now + 12_345);
  assert.equal(
    normalizeSuperclickTimestamp(now + 999_999, now, SUPERCLICK_DURATION_SEC),
    now + SUPERCLICK_DURATION_SEC * 1000,
  );
  assert.equal(getSuperclickRemainingSec(now + 1_001, now), 2);
});
