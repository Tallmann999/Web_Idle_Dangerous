import assert from "node:assert/strict";
import test from "node:test";
import {
  BOSS_BOOST_DURATION_SEC,
  BOSS_BOOST_MAX_USES_PER_SESSION,
  BOSS_HP_MULTIPLIER,
  TEST_REWARDED_AD_DURATION_MS,
  canUseBossBoost,
  getBossBoostDamageMultiplier,
  getBossFailureCopy,
} from "../src/game/bossFlow.ts";

test("boss boost has the approved duration and session limit", () => {
  assert.equal(BOSS_BOOST_DURATION_SEC, 15);
  assert.equal(BOSS_BOOST_MAX_USES_PER_SESSION, 3);
  assert.equal(TEST_REWARDED_AD_DURATION_MS, 2000);
  assert.equal(BOSS_HP_MULTIPLIER, 20);
});

test("boss boost doubles damage only while active", () => {
  assert.equal(getBossBoostDamageMultiplier(180), 2);
  assert.equal(getBossBoostDamageMultiplier(1), 2);
  assert.equal(getBossBoostDamageMultiplier(0), 1);
});

test("boss boost offer respects active state and session limit", () => {
  assert.equal(canUseBossBoost(0, 0), true);
  assert.equal(canUseBossBoost(2, 0), true);
  assert.equal(canUseBossBoost(3, 0), false);
  assert.equal(canUseBossBoost(0, 120), false);
});

test("every boss failure reason has explicit player copy", () => {
  assert.match(getBossFailureCopy("time_expired"), /ВРЕМЯ ВЫШЛО/);
  assert.match(getBossFailureCopy("manual_exit"), /ПОПЫТКА ПРЕРВАНА/);
  assert.match(getBossFailureCopy("session_interrupted"), /НЕЗАВЕРШЁННАЯ ПОПЫТКА/);
});
