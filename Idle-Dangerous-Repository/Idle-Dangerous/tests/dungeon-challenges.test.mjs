import assert from "node:assert/strict";
import test from "node:test";

import {
  DUNGEON_CHALLENGES,
  DUNGEON_COOLDOWN_SEC,
  DUNGEON_HP_MULTIPLIER,
  DUNGEON_REWARD_MULTIPLIER,
  DUNGEON_TIME_LIMIT_SEC,
  advanceDungeon,
  createDungeonAttempt,
  damageDungeon,
  isDungeonUnlocked,
} from "../src/game/dungeonChallenges.ts";
import { getEnemyGold, getEnemyMaxHp } from "../src/game/clickerV3.ts";

test("regions retain standalone challenges, with three in the final region", () => {
  assert.equal(DUNGEON_CHALLENGES.length, 13);
  assert.equal(DUNGEON_TIME_LIMIT_SEC, 30);
  assert.equal(DUNGEON_COOLDOWN_SEC, 600);
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6].map((regionId) => DUNGEON_CHALLENGES.filter((dungeon) => dungeon.regionId === regionId).length),
    [2, 2, 2, 2, 2, 3],
  );
});

test("regional dungeons use the first and last boss and have double HP with a motivating reward", () => {
  assert.equal(DUNGEON_HP_MULTIPLIER, 2);
  assert.equal(DUNGEON_REWARD_MULTIPLIER, 3);
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6].map((regionId) => DUNGEON_CHALLENGES.filter((dungeon) => dungeon.regionId === regionId).map((dungeon) => dungeon.bossZone)),
    [[5, 10], [30, 40], [15, 25], [45, 55], [60, 75], [80, 90, 105]],
  );
  for (const dungeon of DUNGEON_CHALLENGES) {
    assert.equal(dungeon.hp, getEnemyMaxHp(dungeon.bossZone) * 2);
    assert.equal(dungeon.reward, getEnemyGold(dungeon.bossZone) * 3);
    assert.equal(isDungeonUnlocked(dungeon, dungeon.bossZone), false);
    assert.equal(isDungeonUnlocked(dungeon, dungeon.bossZone + 1), true);
  }
});

test("dungeon attempts fail after thirty seconds when the boss survives", () => {
  const attempt = createDungeonAttempt("region_1_dungeon_1");
  const failed = advanceDungeon(attempt, 1, 30);
  assert.equal(failed.status, "failed");
  assert.equal(failed.timeLeft, 0);
  assert.equal(failed.hp, attempt.maxHp - 30);
});

test("rewarded retry doubles automatic DPS without changing click damage", () => {
  const normal = advanceDungeon(createDungeonAttempt("region_1_dungeon_1"), 10, 5);
  const boosted = advanceDungeon(createDungeonAttempt("region_1_dungeon_1", true), 10, 5);
  assert.equal(normal.maxHp - normal.hp, 50);
  assert.equal(boosted.maxHp - boosted.hp, 100);

  const clicked = damageDungeon(createDungeonAttempt("region_1_dungeon_1", true), 25);
  assert.equal(clicked.maxHp - clicked.hp, 25);
});

test("a lethal dungeon hit marks the attempt won", () => {
  const attempt = createDungeonAttempt("region_1_dungeon_1");
  const won = damageDungeon(attempt, attempt.maxHp);
  assert.equal(won.status, "won");
  assert.equal(won.hp, 0);
});

test("a delayed background tick cannot damage a dungeon beyond its deadline", () => {
  const attempt = createDungeonAttempt("region_1_dungeon_1");
  const dps = attempt.maxHp / 40;
  const delayed = advanceDungeon(attempt, dps, 60);
  assert.equal(delayed.status, "failed");
  assert.equal(delayed.timeLeft, 0);
  assert.ok(delayed.hp > 0);
});
