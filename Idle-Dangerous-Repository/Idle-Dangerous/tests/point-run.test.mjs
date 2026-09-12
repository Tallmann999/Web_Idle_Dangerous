import assert from "node:assert/strict";
import test from "node:test";
import {
  POINT_ENEMY_POOLS,
  calculateFarmReward,
  pickPointEnemy,
} from "../src/game/pointRun.ts";

test("every campaign point owns a ten-enemy first-clear sequence", () => {
  const pools = Object.values(POINT_ENEMY_POOLS);
  assert.equal(pools.length, 4);
  for (const pool of pools) {
    assert.equal(pool.length, 10);
    assert.equal(new Set(pool).size, 10);
  }
});

test("first-clear enemy follows the saved X out of ten", () => {
  const pool = POINT_ENEMY_POOLS.biome_01_point_01;
  assert.equal(pickPointEnemy("biome_01_point_01", {
    defeatedEnemies: 0, cleared: false, firstClearRewardGranted: false,
  }), pool[0]);
  assert.equal(pickPointEnemy("biome_01_point_01", {
    defeatedEnemies: 6, cleared: false, firstClearRewardGranted: false,
  }), pool[6]);
});

test("farm chooses only from its point pool and avoids an immediate repeat", () => {
  const pointId = "biome_02_point_02";
  const pool = POINT_ENEMY_POOLS[pointId];
  const previousId = pool[0];
  const progress = { defeatedEnemies: 10, cleared: true, firstClearRewardGranted: true };
  const selected = pickPointEnemy(pointId, progress, previousId, () => 0);
  assert.ok(pool.includes(selected));
  assert.notEqual(selected, previousId);
});

test("farm reward is rounded to eighty percent", () => {
  assert.equal(calculateFarmReward(14), 11);
  assert.equal(calculateFarmReward(21), 17);
});
