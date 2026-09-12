import assert from "node:assert/strict";
import test from "node:test";
import {
  WEAPON_LEVEL_CAP,
  createInitialWeaponLevels,
  createInitialWeaponMilestones,
  getAvailableWeaponMilestone,
  getNextWeaponMilestone,
  getWeaponLevelCost,
  getWeaponMilestoneCost,
  getWeaponPowerMultiplier,
  normalizeWeaponLevels,
  normalizeWeaponMilestones,
} from "../src/game/weaponProgression.ts";

test("old saves receive level one for every prototype weapon", () => {
  assert.deepEqual(normalizeWeaponLevels(undefined), createInitialWeaponLevels());
  assert.deepEqual(normalizeWeaponMilestones(undefined, createInitialWeaponLevels()), createInitialWeaponMilestones());
});

test("weapon progression normalization clamps levels and rejects impossible milestones", () => {
  assert.equal(WEAPON_LEVEL_CAP, 999);
  const levels = normalizeWeaponLevels({ gray_weapon: 10.9, purple_weapon: -2, blue_weapon: 99_999 });
  assert.deepEqual(levels, { gray_weapon: 10, purple_weapon: 1, blue_weapon: WEAPON_LEVEL_CAP });
  assert.deepEqual(normalizeWeaponMilestones({
    gray_weapon: [10, 25, 10, "bad"],
    blue_weapon: [10, 25, 50, 100, 150],
  }, levels), {
    gray_weapon: [10],
    purple_weapon: [],
    blue_weapon: [10, 25, 50, 100, 150],
  });
});

test("levels and purchased milestones increase one weapon power", () => {
  assert.equal(getWeaponPowerMultiplier(1, []), 1);
  assert.ok(getWeaponPowerMultiplier(10, []) > 2.3);
  assert.equal(
    getWeaponPowerMultiplier(10, [10]),
    getWeaponPowerMultiplier(10, []) * 2,
  );
});

test("reached mastery milestones require a separate coin purchase", () => {
  assert.equal(getAvailableWeaponMilestone(9, []), null);
  assert.equal(getAvailableWeaponMilestone(10, []), 10);
  assert.equal(getAvailableWeaponMilestone(25, [10]), 25);
  assert.equal(getNextWeaponMilestone(10, []), 10);
  assert.equal(getNextWeaponMilestone(10, [10]), 25);
  assert.ok(getWeaponMilestoneCost("gray_weapon", 10) > getWeaponLevelCost("gray_weapon", 10));
});

test("later prototype weapons cost more to level", () => {
  assert.ok(getWeaponLevelCost("purple_weapon", 1) > getWeaponLevelCost("gray_weapon", 1));
  assert.ok(getWeaponLevelCost("blue_weapon", 1) > getWeaponLevelCost("purple_weapon", 1));
});
