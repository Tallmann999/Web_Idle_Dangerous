import assert from "node:assert/strict";
import test from "node:test";
import {
  createInitialProgression,
  defeatBoss,
  dismissCompletionScreen,
  failBossAttempt,
  getDefaultFarmPoint,
  isNodeAvailable,
  isNodeVisible,
  normalizeProgression,
  recordNormalVictory,
  startBossAttempt,
} from "../src/game/progression.ts";

function clearPoint(state, pointId) {
  let next = state;
  for (let index = 0; index < 10; index += 1) next = recordNormalVictory(next, pointId).state;
  return next;
}

function clearBiomeOne(state) {
  let next = state;
  for (let index = 1; index <= 2; index += 1) next = clearPoint(next, `biome_01_point_0${index}`);
  return next;
}

function clearBiomeTwo(state) {
  let next = state;
  for (let index = 1; index <= 2; index += 1) next = clearPoint(next, `biome_02_point_0${index}`);
  return next;
}

test("new progression shows the route but exposes only the first honest gate", () => {
  const state = createInitialProgression();
  assert.equal(isNodeAvailable(state, "biome_01_point_01"), true);
  assert.equal(isNodeAvailable(state, "biome_01_point_02"), false);
  assert.equal(isNodeVisible(state, "biome_01_boss"), true);
  assert.equal(isNodeAvailable(state, "biome_01_boss"), false);
  assert.equal(isNodeVisible(state, "biome_02_point_01"), true);
  assert.equal(isNodeAvailable(state, "biome_02_point_01"), false);
});

test("ten victories clear one point and unlock only its successor", () => {
  let state = createInitialProgression();
  for (let index = 0; index < 9; index += 1) state = recordNormalVictory(state, "biome_01_point_01").state;
  assert.equal(state.points.biome_01_point_01.defeatedEnemies, 9);
  assert.equal(isNodeAvailable(state, "biome_01_point_02"), false);

  const result = recordNormalVictory(state, "biome_01_point_01");
  assert.equal(result.firstClear, true);
  assert.equal(result.state.points.biome_01_point_01.cleared, true);
  assert.equal(isNodeAvailable(result.state, "biome_01_point_02"), true);
  assert.equal(isNodeAvailable(result.state, "biome_01_boss"), false);
});

test("the regional boss stays veiled until both biome points are cleared", () => {
  let state = createInitialProgression();
  state = clearPoint(state, "biome_01_point_01");
  assert.equal(isNodeVisible(state, "biome_01_boss"), true);
  assert.equal(isNodeAvailable(state, "biome_01_boss"), false);

  state = clearPoint(state, "biome_01_point_02");
  assert.equal(isNodeAvailable(state, "biome_01_boss"), true);
  assert.equal(isNodeVisible(state, "biome_02_point_01"), true);
  assert.equal(isNodeAvailable(state, "biome_02_point_01"), false);
});

test("the first boss unlocks the second biome and cannot be replayed", () => {
  let state = clearBiomeOne(createInitialProgression());
  state = startBossAttempt(state, "biome_01_boss");
  assert.equal(state.bosses.biome_01_boss.attempts, 1);
  state = defeatBoss(state, "biome_01_boss");
  assert.equal(state.bosses.biome_01_boss.rewardGranted, true);
  assert.equal(isNodeAvailable(state, "biome_01_boss"), false);
  assert.equal(isNodeVisible(state, "biome_02_point_01"), true);
  assert.equal(isNodeAvailable(state, "biome_02_point_01"), true);

  const duplicate = defeatBoss(state, "biome_01_boss");
  assert.deepEqual(duplicate, state);
});

test("manual boss exit records failure without opening content", () => {
  let state = clearBiomeOne(createInitialProgression());
  state = startBossAttempt(state, "biome_01_boss");
  state = failBossAttempt(state, "biome_01_boss", "manual_exit");
  assert.equal(state.bosses.biome_01_boss.lastFailureReason, "manual_exit");
  assert.equal(state.bosses.biome_01_boss.defeated, false);
  assert.equal(isNodeVisible(state, "biome_02_point_01"), true);
  assert.equal(isNodeAvailable(state, "biome_02_point_01"), false);
});

test("version one saves migrate to the shortened route", () => {
  const state = clearBiomeOne(createInitialProgression());
  state.version = 1;
  state.points.biome_01_point_03 = { defeatedEnemies: 4, cleared: false, firstClearRewardGranted: false };

  const migrated = normalizeProgression(state);
  assert.ok(migrated);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.bosses.biome_01_boss.revealed, true);
  assert.equal(isNodeAvailable(migrated, "biome_01_boss"), true);
});

test("defeating the second boss completes the two-biome prototype", () => {
  let state = clearBiomeOne(createInitialProgression());
  state = defeatBoss(state, "biome_01_boss");
  state = clearBiomeTwo(state);
  state = startBossAttempt(state, "biome_02_boss");
  state = defeatBoss(state, "biome_02_boss");
  assert.equal(state.prototypeCompleted, true);
  assert.equal(state.bosses.biome_02_boss.rewardGranted, true);
  assert.equal(state.completionScreenDismissed, false);
  assert.equal(getDefaultFarmPoint(state), "biome_02_point_02");

  const dismissed = dismissCompletionScreen(state);
  assert.equal(dismissed.completionScreenDismissed, true);
  assert.equal(dismissed.prototypeCompleted, true);
});

test("farm victories never restart first-clear progress", () => {
  let state = clearPoint(createInitialProgression(), "biome_01_point_01");
  const result = recordNormalVictory(state, "biome_01_point_01");
  assert.equal(result.farm, true);
  assert.equal(result.firstClear, false);
  assert.equal(result.state.points.biome_01_point_01.defeatedEnemies, 10);
});

test("normalization rejects legacy and contradictory saves", () => {
  assert.equal(normalizeProgression({ characterXp: 5000, clearedNodes: [0, 5] }), null);

  const state = createInitialProgression();
  state.points.biome_01_point_02.defeatedEnemies = 3;
  assert.equal(normalizeProgression(state), null);
});
