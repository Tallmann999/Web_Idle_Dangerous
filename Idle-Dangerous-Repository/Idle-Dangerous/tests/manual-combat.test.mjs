import assert from "node:assert/strict";
import test from "node:test";
import {
  MANUAL_CRIT_COOLDOWN_SEC,
  MANUAL_CRIT_DURATION_SEC,
  MANUAL_CRIT_MULTIPLIER,
  MANUAL_DOUBLE_DAMAGE_MULTIPLIER,
  MANUAL_UPGRADES,
  activateManualCritical,
  buyManualUpgrade,
  createInitialGameState,
  getEnemyGold,
  getEnemyMaxHp,
  getGoldRewardWithBonuses,
  getManualCritChance,
  normalizeGameState,
  resolveManualAttack,
} from "../src/game/clickerV3.ts";

test("manual weapon milestones are ordered at levels 10, 25, 50, 100 and 150", () => {
  assert.deepEqual(MANUAL_UPGRADES.map((upgrade) => upgrade.threshold), [10, 25, 50, 100, 150]);
  assert.deepEqual(MANUAL_UPGRADES.map((upgrade) => upgrade.kind), ["passive", "passive", "passive", "passive", "active"]);
});

test("manual upgrades require their level and price and survive save normalization", () => {
  const initial = createInitialGameState();
  const upgrade = MANUAL_UPGRADES[0];
  assert.equal(buyManualUpgrade({ ...initial, gold: upgrade.cost }, upgrade.id).clickPurchasedUpgradeIds.length, 0);

  const eligible = { ...initial, clickLevel: upgrade.threshold, gold: upgrade.cost };
  const purchased = buyManualUpgrade(eligible, upgrade.id);
  assert.equal(purchased.gold, 0);
  assert.deepEqual(purchased.clickPurchasedUpgradeIds, [upgrade.id]);
  assert.deepEqual(normalizeGameState(purchased).clickPurchasedUpgradeIds, [upgrade.id]);
});

test("manual critical chance progresses from 2% to 5% and the active adds 20 percentage points", () => {
  const now = 1_000_000;
  const initial = createInitialGameState();
  assert.equal(getManualCritChance(initial, now), 0);
  assert.equal(getManualCritChance({ ...initial, clickPurchasedUpgradeIds: ["manual_10"] }, now), .02);
  assert.equal(getManualCritChance({ ...initial, clickPurchasedUpgradeIds: ["manual_10", "manual_50"] }, now), .05);
  assert.equal(getManualCritChance({
    ...initial,
    clickPurchasedUpgradeIds: ["manual_10", "manual_50", "manual_150"],
    manualCriticalActiveUntil: now + 1,
  }, now), .25);
});

test("critical and double-damage rolls are independent and can stack to x4", () => {
  const initial = createInitialGameState();
  const state = { ...initial, clickPurchasedUpgradeIds: ["manual_10", "manual_50", "manual_100"] };
  assert.equal(MANUAL_CRIT_MULTIPLIER, 2);
  assert.equal(MANUAL_DOUBLE_DAMAGE_MULTIPLIER, 2);
  assert.deepEqual(resolveManualAttack(100, state, 0, 0, 0), { amount: 400, critical: true, doubleDamage: true });
  assert.deepEqual(resolveManualAttack(100, state, 0, .9, 0), { amount: 200, critical: false, doubleDamage: true });
  assert.deepEqual(resolveManualAttack(100, state, 0, .9, .9), { amount: 100, critical: false, doubleDamage: false });
});

test("Critical Surge lasts one minute and then observes a five-minute cooldown", () => {
  const now = 1_000_000;
  const initial = createInitialGameState();
  assert.equal(activateManualCritical(initial, now), initial);

  const unlocked = { ...initial, clickPurchasedUpgradeIds: ["manual_150"] };
  const active = activateManualCritical(unlocked, now);
  assert.equal(active.manualCriticalActiveUntil, now + MANUAL_CRIT_DURATION_SEC * 1000);
  assert.equal(active.manualCriticalCooldownUntil, active.manualCriticalActiveUntil + MANUAL_CRIT_COOLDOWN_SEC * 1000);
  assert.equal(activateManualCritical(active, active.manualCriticalActiveUntil), active);
  assert.notEqual(activateManualCritical(active, active.manualCriticalCooldownUntil), active);
});

test("manual gold bonus is additive with the Solar Purifier passive", () => {
  const initial = createInitialGameState();
  const manual = { ...initial, clickPurchasedUpgradeIds: ["manual_25"] };
  const combined = {
    ...manual,
    weapons: {
      ...manual.weapons,
      sun_weapon: { ...manual.weapons.sun_weapon, owned: true, purchasedUpgradeIds: ["sun_150"] },
    },
  };
  assert.equal(getGoldRewardWithBonuses(manual, 100), 110);
  assert.equal(getGoldRewardWithBonuses(combined, 100), 140);
});

test("regular-enemy pressure stays flat through level 50 and rises only afterward", () => {
  const pressure = (zone) => getEnemyMaxHp(zone, 0) / getEnemyGold(zone);
  assert.ok(Math.abs(pressure(1) - pressure(49)) < .001);
  assert.ok(pressure(51) > pressure(49));
  assert.ok(pressure(60) > pressure(51));
});
