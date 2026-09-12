import assert from "node:assert/strict";
import test from "node:test";
import {
  BASE_ENEMY_COINS,
  BOSS_COIN_REWARD_MULTIPLIER,
  calculateBaseEnemyCoins,
  calculateBossCoins,
  calculateEnemyCoins,
} from "../src/game/coinEconomy.ts";

test("coin economy keeps the provisional prototype reward curve", () => {
  assert.equal(BASE_ENEMY_COINS, 14);
  assert.equal(calculateBaseEnemyCoins(0), 14);
  assert.equal(calculateBaseEnemyCoins(1), 16);
});

test("farm grants eighty percent while first clear grants full coins", () => {
  assert.equal(calculateEnemyCoins(16, false), 16);
  assert.equal(calculateEnemyCoins(16, true), 13);
});

test("boss coin reward uses the approved one-time reward multiplier", () => {
  assert.equal(BOSS_COIN_REWARD_MULTIPLIER, 8);
  assert.equal(calculateBossCoins(16), 128);
});
