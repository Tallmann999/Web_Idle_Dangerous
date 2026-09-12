import assert from "node:assert/strict";
import test from "node:test";
import { createInitialProgression } from "../src/game/progression.ts";
import {
  calculateArsenalAutoDamage,
  calculateManualWeaponDamage,
  getNextWeaponUnlockPresentation,
  getUnlockedWeaponIds,
  normalizePresentedWeaponUnlocks,
  normalizeSelectedWeapon,
} from "../src/game/weaponArsenal.ts";

function defeatedBoss(state, bossId) {
  const boss = state.bosses[bossId];
  return {
    ...state,
    bosses: { ...state.bosses, [bossId]: { ...boss, revealed: true, defeated: true, rewardGranted: true } },
  };
}

test("arsenal unlock order follows regional boss progression", () => {
  const start = createInitialProgression();
  assert.deepEqual(getUnlockedWeaponIds(start), ["gray_weapon"]);
  const afterForest = defeatedBoss(start, "biome_01_boss");
  assert.deepEqual(getUnlockedWeaponIds(afterForest), ["gray_weapon", "purple_weapon"]);
  const afterHeights = defeatedBoss(afterForest, "biome_02_boss");
  assert.deepEqual(getUnlockedWeaponIds(afterHeights), ["gray_weapon", "purple_weapon", "blue_weapon"]);
});

test("selected weapon controls manual affinity", () => {
  assert.equal(calculateManualWeaponDamage("purple_weapon", "bio", 10), 20);
  assert.equal(calculateManualWeaponDamage("blue_weapon", "bio", 10), 8);
  assert.equal(calculateManualWeaponDamage("gray_weapon", "bio", 10), 8);
});

test("every unlocked weapon contributes to automatic damage", () => {
  assert.equal(calculateArsenalAutoDamage(["gray_weapon"], "bio", 10), 8);
  assert.equal(calculateArsenalAutoDamage(["gray_weapon", "purple_weapon"], "bio", 10), 28);
  assert.equal(calculateArsenalAutoDamage(["gray_weapon", "purple_weapon", "blue_weapon"], "bio", 10), 35);
});

test("legacy selection migrates only when its weapon is unlocked", () => {
  const start = createInitialProgression();
  assert.equal(normalizeSelectedWeapon("bio", start), "gray_weapon");
  assert.equal(normalizeSelectedWeapon("purge", start), "gray_weapon");
  assert.equal(normalizeSelectedWeapon("bio", defeatedBoss(start, "biome_01_boss")), "purple_weapon");
});

test("boss weapon presentations are ordered and acknowledged once", () => {
  const start = createInitialProgression();
  const afterForest = defeatedBoss(start, "biome_01_boss");
  const afterHeights = defeatedBoss(afterForest, "biome_02_boss");
  assert.equal(getNextWeaponUnlockPresentation(afterForest, []), "purple_weapon");
  assert.equal(getNextWeaponUnlockPresentation(afterForest, ["purple_weapon"]), null);
  assert.equal(getNextWeaponUnlockPresentation(afterHeights, []), "purple_weapon");
  assert.equal(getNextWeaponUnlockPresentation(afterHeights, ["purple_weapon"]), "blue_weapon");
  assert.equal(getNextWeaponUnlockPresentation(afterHeights, ["purple_weapon", "blue_weapon"]), null);
  assert.deepEqual(normalizePresentedWeaponUnlocks(["blue_weapon", "gray_weapon", "invalid", "blue_weapon"]), ["blue_weapon"]);
});
