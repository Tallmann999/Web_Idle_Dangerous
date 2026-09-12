import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPhaseDamage,
  calculateArsenalPhaseDamage,
  calculateCorruptionHp,
  calculateManualPhaseDamage,
  getPhaseBonusWeaponId,
  getWeaponPhaseMultiplier,
} from "../src/game/corruptionCombat.ts";
import { CORRUPTED_ENEMY_COIN_MULTIPLIER, calculateEnemyCoins } from "../src/game/coinEconomy.ts";
import { POINT_ENEMY_POOLS, getEncounterCorruptionElement } from "../src/game/pointRun.ts";

test("corruption and body phases use different counter weapons", () => {
  assert.equal(getWeaponPhaseMultiplier("purple_weapon", "corruption", "bio"), 2);
  assert.equal(getWeaponPhaseMultiplier("gray_weapon", "corruption", "bio"), 0.75);
  assert.equal(getWeaponPhaseMultiplier("gray_weapon", "body", "bio"), 2);
  assert.equal(getWeaponPhaseMultiplier("purple_weapon", "body", "bio"), 0.75);
  assert.equal(calculateManualPhaseDamage("purple_weapon", "corruption", "bio", 10), 20);
  assert.equal(calculateManualPhaseDamage("gray_weapon", "body", "bio", 10), 20);
  assert.equal(calculateArsenalPhaseDamage(["gray_weapon", "purple_weapon"], "body", "bio", 10), 28);
});

test("combat phase identifies the weapon receiving the automatic bonus", () => {
  assert.equal(getPhaseBonusWeaponId("corruption", "bio"), "purple_weapon");
  assert.equal(getPhaseBonusWeaponId("corruption", "crystal"), "blue_weapon");
  assert.equal(getPhaseBonusWeaponId("body", "bio"), "gray_weapon");
  assert.equal(getPhaseBonusWeaponId("body", null), "gray_weapon");
  assert.equal(getPhaseBonusWeaponId("corruption", null), null);
});

test("a hit that breaks corruption never spills into body hp", () => {
  const shellHit = applyPhaseDamage({ bodyHp: 100, corruptionHp: 5 }, 20);
  assert.deepEqual(shellHit, {
    bodyHp: 100,
    corruptionHp: 0,
    appliedDamage: 5,
    phaseBeforeHit: "corruption",
    corruptionBroken: true,
    defeated: false,
  });
  const bodyHit = applyPhaseDamage(shellHit, 20);
  assert.equal(bodyHit.bodyHp, 80);
  assert.equal(bodyHit.defeated, false);
});

test("corruption shell hp supports light and heavy enemy profiles", () => {
  assert.equal(calculateCorruptionHp(100, "enemy-01"), 35);
  assert.equal(calculateCorruptionHp(100, "enemy-02"), 65);
});

test("first biome repeats three normal encounters then one corrupted encounter", () => {
  const sequence = [
    ...POINT_ENEMY_POOLS.biome_01_point_01.map((enemyId) => getEncounterCorruptionElement("biome_01_point_01", enemyId)),
    ...POINT_ENEMY_POOLS.biome_01_point_02.map((enemyId) => getEncounterCorruptionElement("biome_01_point_02", enemyId)),
  ];
  assert.equal(sequence.filter(Boolean).length, 5);
  for (let index = 0; index < sequence.length; index += 1) {
    assert.equal(sequence[index], (index + 1) % 4 === 0 ? "bio" : null);
  }
});

test("corrupted farm reward combines the 0.8 and 1.5 multipliers", () => {
  assert.equal(CORRUPTED_ENEMY_COIN_MULTIPLIER, 1.5);
  assert.equal(calculateEnemyCoins(14, false, true), 21);
  assert.equal(calculateEnemyCoins(14, true, true), 17);
});
