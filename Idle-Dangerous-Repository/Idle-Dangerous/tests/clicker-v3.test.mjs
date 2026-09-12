import assert from "node:assert/strict";
import test from "node:test";
import {
  BOSS_TIME_LIMIT_SEC,
  ENEMIES_PER_ZONE,
  GOLD_REWARD_PASSIVE_MULTIPLIER,
  GOLD_REWARD_PASSIVE_UPGRADE_ID,
  WEAPON_LEVEL_CAP,
  WEAPONS,
  advanceAfkCombat,
  buyWeaponOrLevels,
  buyWeaponUpgrade,
  createInitialGameState,
  damageEnemy,
  enterZone,
  failBoss,
  getGlobalClickDamage,
  getGoldRewardWithBonuses,
  getTotalArsenalDps,
  getWeaponDps,
  isBossZone,
  normalizeGameState,
} from "../src/game/clickerV3.ts";

test("weapons are bought with gold and every owned weapon joins total DPS", () => {
  const initial = createInitialGameState();
  assert.equal(initial.weapons.gray_weapon.owned, true);
  assert.equal(initial.weapons.purple_weapon.owned, false);
  assert.equal(getTotalArsenalDps(initial), 1);

  const funded = { ...initial, highestZone: WEAPONS.purple_weapon.unlockZone, gold: WEAPONS.purple_weapon.purchaseCost };
  const purchased = buyWeaponOrLevels(funded, "purple_weapon");
  assert.equal(purchased.weapons.purple_weapon.owned, true);
  assert.equal(purchased.gold, 0);
  assert.equal(getTotalArsenalDps(purchased), 1 + WEAPONS.purple_weapon.baseDps);
});

test("selected gun is absent from the global click damage formula", () => {
  const initial = createInitialGameState();
  const damage = getGlobalClickDamage({ ...initial, clickLevel: 14 });
  assert.equal(getGlobalClickDamage({ ...initial, clickLevel: 14, selectedWeaponId: "gray_weapon" }), damage);
  assert.equal(getGlobalClickDamage({ ...initial, clickLevel: 14, selectedWeaponId: "relic_weapon" }), damage);
});

test("shown dungeon map announcements survive save normalization once per dungeon", () => {
  const initial = createInitialGameState();
  assert.deepEqual(initial.combatAnnouncedDungeonIds, []);

  const normalized = normalizeGameState({
    ...initial,
    combatAnnouncedDungeonIds: ["region_1_dungeon_1", "region_1_dungeon_1", 17, "region_2_dungeon_1"],
  });
  assert.deepEqual(normalized.combatAnnouncedDungeonIds, ["region_1_dungeon_1", "region_2_dungeon_1"]);
});

test("weapon upgrades require their level threshold and a separate purchase", () => {
  const initial = createInitialGameState();
  const upgrade = WEAPONS.gray_weapon.upgrades[0];
  const leveled = {
    ...initial,
    gold: upgrade.cost,
    weapons: { ...initial.weapons, gray_weapon: { ...initial.weapons.gray_weapon, level: upgrade.threshold } },
  };
  const before = getTotalArsenalDps(leveled);
  const purchased = buyWeaponUpgrade(leveled, "gray_weapon");
  assert.ok(getTotalArsenalDps(purchased) > before);
  assert.equal(purchased.gold, 0);
  assert.deepEqual(purchased.weapons.gray_weapon.purchasedUpgradeIds, [upgrade.id]);
});

test("every reached weapon upgrade can be purchased from its own slot", () => {
  const initial = createInitialGameState();
  const upgrade = WEAPONS.gray_weapon.upgrades[2];
  const leveled = {
    ...initial,
    gold: upgrade.cost,
    weapons: { ...initial.weapons, gray_weapon: { ...initial.weapons.gray_weapon, level: upgrade.threshold } },
  };
  const purchased = buyWeaponUpgrade(leveled, "gray_weapon", upgrade.id);
  assert.deepEqual(purchased.weapons.gray_weapon.purchasedUpgradeIds, [upgrade.id]);
  assert.equal(purchased.gold, 0);
});

test("weapon levels grow linearly instead of creating an exponential runaway", () => {
  const weaponState = { owned: true, level: 250, purchasedUpgradeIds: [] };
  assert.equal(getWeaponDps("gray_weapon", weaponState), 250);
  assert.equal(getWeaponDps("purple_weapon", weaponState), 2_000);

  const fullyUpgraded = {
    ...weaponState,
    purchasedUpgradeIds: WEAPONS.gray_weapon.upgrades.map((upgrade) => upgrade.id),
  };
  assert.equal(getWeaponDps("gray_weapon", fullyUpgraded), 88_000);
  assert.ok(Math.abs(getWeaponDps("gray_weapon", { ...fullyUpgraded, level: 251 }) - 251 * 32 * 11.1) < 1e-8);
});

test("weapon abilities end at level 150 while numeric levels continue to 999", () => {
  assert.deepEqual(WEAPONS.gray_weapon.upgrades.map((upgrade) => upgrade.threshold), [10, 25, 50, 100, 150]);
  assert.equal(WEAPONS.gray_weapon.upgrades.reduce((total, upgrade) => total * upgrade.multiplier, 1), 32);
  assert.equal(WEAPON_LEVEL_CAP, 999);

  const initial = createInitialGameState();
  const level998 = {
    ...initial,
    gold: Number.MAX_VALUE,
    bulkAmount: 100,
    weapons: {
      ...initial.weapons,
      gray_weapon: { ...initial.weapons.gray_weapon, level: 998 },
    },
  };
  const capped = buyWeaponOrLevels(level998, "gray_weapon");
  assert.equal(capped.weapons.gray_weapon.level, 999);
  assert.equal(buyWeaponOrLevels(capped, "gray_weapon"), capped);
});

test("the solar level 150 passive adds thirty percent to every monster reward", () => {
  const initial = createInitialGameState();
  const passiveState = {
    ...initial,
    weapons: {
      ...initial.weapons,
      sun_weapon: {
        ...initial.weapons.sun_weapon,
        owned: true,
        level: 150,
        purchasedUpgradeIds: [GOLD_REWARD_PASSIVE_UPGRADE_ID],
      },
    },
  };
  assert.equal(GOLD_REWARD_PASSIVE_MULTIPLIER, 1.3);
  assert.equal(getGoldRewardWithBonuses(initial, 100), 100);
  assert.equal(getGoldRewardWithBonuses({ ...initial, weapons: { ...initial.weapons, gray_weapon: { owned: true, level: 150, purchasedUpgradeIds: ["gray_150"] } } }, 100), 100);
  assert.equal(getGoldRewardWithBonuses(passiveState, 100), 130);

  const defeated = damageEnemy({ ...passiveState, enemyHp: 1, enemyMaxHp: 1 }, 1);
  assert.equal(defeated.gold, 4);
  assert.equal(defeated.totalGoldEarned, 4);
});

test("post-150 agility and speed are additive, weapon-local and purchase-gated", () => {
  const plain = { owned: true, level: 151, purchasedUpgradeIds: [] };
  assert.equal(getWeaponDps("gray_weapon", plain), 151);
  for (const [weapon, upgrade, rate] of [["gray_weapon", "gray_150", .1], ["purple_weapon", "purple_150", .01]]) {
    for (const level of [150, 151, 160, 999]) {
      const result = getWeaponDps(weapon, { ...plain, level, purchasedUpgradeIds: [upgrade] });
      const expected = WEAPONS[weapon].baseDps * level * 2 * (1 + (level - 150) * rate);
      assert.ok(Math.abs(result - expected) < 1e-7);
    }
  }
});

test("the Crystal Rifle level 150 upgrade unlocks Ice Rain", () => {
  const upgrade = WEAPONS.blue_weapon.upgrades.find((item) => item.threshold === 150);
  assert.equal(upgrade?.id, "blue_150");
  assert.equal(upgrade?.name, "Ледяной дождь");
  assert.match(upgrade?.description ?? "", /Открывает умение/);
});

test("new weapons require both their route zone and their gold price", () => {
  const initial = createInitialGameState();
  const weapon = WEAPONS.purple_weapon;
  const richButEarly = { ...initial, gold: weapon.purchaseCost };
  assert.equal(buyWeaponOrLevels(richButEarly, weapon.id), richButEarly);

  const unlockedAndFunded = { ...richButEarly, highestZone: weapon.unlockZone };
  assert.equal(buyWeaponOrLevels(unlockedAndFunded, weapon.id).weapons[weapon.id].owned, true);
});

test("runaway V3 saves are compressed once without removing purchased weapons", () => {
  const initial = createInitialGameState();
  const allGrayUpgrades = WEAPONS.gray_weapon.upgrades.map((upgrade) => upgrade.id);
  const migrated = normalizeGameState({
    ...initial,
    version: 3,
    gold: 157_000_000_000_000,
    zone: 73,
    highestZone: 73,
    weapons: {
      ...initial.weapons,
      gray_weapon: { owned: true, level: 254, purchasedUpgradeIds: allGrayUpgrades },
      purple_weapon: { owned: true, level: 247, purchasedUpgradeIds: [] },
      blue_weapon: { owned: true, level: 229, purchasedUpgradeIds: [] },
      void_weapon: { owned: true, level: 171, purchasedUpgradeIds: [] },
    },
  });

  assert.equal(migrated.version, 7);
  assert.equal(migrated.highestZone, 15);
  assert.equal(migrated.zone, 14);
  assert.ok(migrated.gold < 20_000);
  assert.equal(migrated.weapons.purple_weapon.owned, true);
  assert.ok(migrated.weapons.gray_weapon.level < 60);
  assert.ok(getTotalArsenalDps(migrated) < 5_000);
});

test("normal zones contain exactly ten enemies and every fifth zone is a boss", () => {
  let state = createInitialGameState();
  for (let zone = 1; zone <= 4; zone += 1) {
    for (let enemy = 0; enemy < ENEMIES_PER_ZONE; enemy += 1) state = damageEnemy(state, state.enemyHp);
    assert.equal(state.zone, zone);
    assert.equal(state.highestZone, zone + 1);
    state = enterZone(state, zone + 1);
  }
  assert.equal(state.zone, 5);
  assert.equal(isBossZone(state.zone), true);
  assert.equal(state.bossTimeLeft, BOSS_TIME_LIMIT_SEC);
});

test("clearing a zone unlocks the next route point but keeps farming in place", () => {
  let state = createInitialGameState();
  for (let enemy = 0; enemy < ENEMIES_PER_ZONE; enemy += 1) state = damageEnemy(state, state.enemyHp);
  assert.equal(state.zone, 1);
  assert.equal(state.highestZone, 2);
  assert.equal(state.killsInZone, 0);
});

test("overpowered auto damage can farm repeatedly without moving the route", () => {
  let state = enterZone({ ...createInitialGameState(), highestZone: 31 }, 21);
  for (let enemy = 0; enemy < ENEMIES_PER_ZONE * 3; enemy += 1) {
    state = damageEnemy(state, Number.MAX_SAFE_INTEGER);
  }
  assert.equal(state.zone, 21);
  assert.equal(state.highestZone, 31);
  assert.equal(state.killsInZone, 0);
});

test("defeating a boss unlocks the next point and returns to a safe farm zone", () => {
  const initial = createInitialGameState();
  const boss = { ...initial, zone: 5, highestZone: 5, enemyHp: 1, enemyMaxHp: 1, bossTimeLeft: BOSS_TIME_LIMIT_SEC };
  const defeated = damageEnemy(boss, 1);
  assert.equal(defeated.zone, 4);
  assert.equal(defeated.highestZone, 6);
  assert.equal(defeated.bossesDefeated, 1);
});

test("boss failure returns to the previous farm zone and keeps retry access", () => {
  let state = createInitialGameState();
  state = { ...state, zone: 5, highestZone: 5, bossTimeLeft: BOSS_TIME_LIMIT_SEC };
  const failed = failBoss(state);
  assert.equal(failed.zone, 4);
  assert.equal(failed.highestZone, 5);
  assert.equal(failed.killsInZone, 0);
  assert.equal(isBossZone(failed.zone), false);
});

test("zone navigation never enters a locked zone", () => {
  const initial = createInitialGameState();
  assert.equal(enterZone(initial, 999).zone, 1);
  const progressed = { ...initial, highestZone: 8 };
  assert.equal(enterZone(progressed, 6).zone, 6);
  assert.equal(enterZone(progressed, 9).zone, 8);
  assert.equal(enterZone(progressed, 5), progressed);
});

test("AFK combat farms every enemy covered by elapsed browser time", () => {
  const initial = createInitialGameState();
  const advanced = advanceAfkCombat(initial, 100, 10);
  assert.ok(advanced.totalKills > ENEMIES_PER_ZONE);
  assert.ok(advanced.gold > initial.gold);
  assert.ok(advanced.totalGoldEarned > initial.totalGoldEarned);
  assert.equal(advanced.highestZone, 2);
  assert.equal(advanced.zone, 1);
});

test("AFK combat resolves campaign bosses by their real time limit", () => {
  const initial = createInitialGameState();
  const boss = enterZone({ ...initial, highestZone: 5 }, 5);
  const winningDps = boss.enemyHp / 10;
  const won = advanceAfkCombat(boss, winningDps, 20);
  assert.equal(won.zone, 4);
  assert.equal(won.highestZone, 6);
  assert.equal(won.bossesDefeated, 1);

  const failed = advanceAfkCombat(boss, 0.01, BOSS_TIME_LIMIT_SEC + 5);
  assert.equal(failed.zone, 4);
  assert.equal(failed.highestZone, 5);
  assert.equal(failed.bossesDefeated, 0);
});
