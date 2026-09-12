import assert from "node:assert/strict";
import test from "node:test";

import {
  MANUAL_AUTO_RESUME_DELAY_MS,
  TRAINING_MIN_HP,
  calculateTrainingEnemyHp,
  getAutoResumeAt,
  getAutoResumeRemainingMs,
  isForegroundAutoPaused,
} from "../src/game/manualAutoHandoff.ts";

test("manual attack pauses foreground auto for two seconds from the latest click", () => {
  const firstResumeAt = getAutoResumeAt(5_000);
  const secondResumeAt = getAutoResumeAt(5_600);

  assert.equal(firstResumeAt, 5_000 + MANUAL_AUTO_RESUME_DELAY_MS);
  assert.equal(secondResumeAt, 5_600 + MANUAL_AUTO_RESUME_DELAY_MS);
  assert.equal(isForegroundAutoPaused(secondResumeAt, 7_599), true);
  assert.equal(isForegroundAutoPaused(secondResumeAt, 7_600), false);
  assert.equal(getAutoResumeRemainingMs(secondResumeAt, 7_100), 500);
});

test("auto is active when no manual handoff is pending", () => {
  assert.equal(isForegroundAutoPaused(null, 10_000), false);
  assert.equal(getAutoResumeRemainingMs(null, 10_000), 0);
});

test("training enemy scales to current active damage and keeps a safe minimum", () => {
  assert.equal(calculateTrainingEnemyHp(2, 1), TRAINING_MIN_HP);
  assert.equal(calculateTrainingEnemyHp(30, 4), 2_310);
  assert.equal(calculateTrainingEnemyHp(Number.NaN, -10), TRAINING_MIN_HP);
});
