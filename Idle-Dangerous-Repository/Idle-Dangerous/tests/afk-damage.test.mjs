import assert from "node:assert/strict";
import test from "node:test";
import { createInitialGameState, getTotalArsenalDps } from "../src/game/clickerV3.ts";
import { getAfkDamage } from "../src/game/afkDamage.ts";

test("background damage includes a boost only until its expiry", () => {
  const state = createInitialGameState();
  state.dpsBoostUntil = 6000;
  const dps = getTotalArsenalDps(state);
  assert.equal(getAfkDamage(state, 1000, 11000), dps * 15);
});

test("background Abyss preserves all 480 hits across throttled ticks", () => {
  const state = createInitialGameState();
  state.weapons.void_weapon = { owned: true, level: 150, purchasedUpgradeIds: ["void_150"] };
  state.combatAbilities.abyss = { activeUntil: 13000, cooldownUntil: 613000, nextHitAt: 1250 };
  const dps = getTotalArsenalDps(state);
  assert.equal(getAfkDamage(state, 1000, 14000), dps * (13 + 480));
  const split = getAfkDamage(state, 1000, 7000) + getAfkDamage(state, 7000, 14000);
  assert.equal(split, getAfkDamage(state, 1000, 14000));
});
