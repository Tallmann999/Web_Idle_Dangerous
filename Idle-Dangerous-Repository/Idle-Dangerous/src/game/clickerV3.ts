import { emptyCombatAbilities, normalizeCombatAbilities, type CombatAbilityTimers } from "./combatAbilities.ts";

export const SAVE_VERSION = 7;
export const ENEMIES_PER_ZONE = 10;
export const BOSS_ZONE_INTERVAL = 5;
export const BOSS_TIME_LIMIT_SEC = 30;
export const WEAPON_LEVEL_CAP = 999;
export const WEAPON_SPECIALIZATION_LEVEL = 150;
export const GOLD_REWARD_PASSIVE_UPGRADE_ID = "sun_150";
export const GOLD_REWARD_PASSIVE_MULTIPLIER = 1.3;
export const MANUAL_GOLD_UPGRADE_ID = "manual_25";
export const MANUAL_GOLD_REWARD_MULTIPLIER = 1.1;
export const MANUAL_CRIT_DURATION_SEC = 60;
export const MANUAL_CRIT_COOLDOWN_SEC = 300;
export const MANUAL_CRIT_MULTIPLIER = 2;
export const MANUAL_DOUBLE_DAMAGE_MULTIPLIER = 2;

export type WeaponId =
  | "gray_weapon"
  | "purple_weapon"
  | "blue_weapon"
  | "void_weapon"
  | "sun_weapon"
  | "relic_weapon";

export type BulkAmount = 1 | 10 | 25 | 100 | "max";

export type WeaponUpgrade = {
  id: string;
  name: string;
  description: string;
  threshold: number;
  multiplier: number;
  cost: number;
};

export type WeaponDefinition = {
  id: WeaponId;
  name: string;
  shortName: string;
  description: string;
  color: string;
  unlockZone: number;
  purchaseCost: number;
  baseDps: number;
  levelBaseCost: number;
  levelCostGrowth: number;
  upgrades: readonly WeaponUpgrade[];
};

export type ManualUpgrade = {
  id: string;
  name: string;
  description: string;
  threshold: number;
  cost: number;
  icon: string;
  kind: "active" | "passive";
};

export type WeaponState = {
  owned: boolean;
  level: number;
  purchasedUpgradeIds: string[];
};

export type GameStateV3 = {
  version: typeof SAVE_VERSION;
  gold: number;
  zone: number;
  highestZone: number;
  killsInZone: number;
  enemySerial: number;
  enemyHp: number;
  enemyMaxHp: number;
  bossTimeLeft: number;
  selectedWeaponId: WeaponId;
  bulkAmount: BulkAmount;
  clickLevel: number;
  clickPurchasedUpgradeIds: string[];
  manualCriticalActiveUntil: number;
  manualCriticalCooldownUntil: number;
  weapons: Record<WeaponId, WeaponState>;
  dpsBoostUntil: number;
  abilityCooldownUntil: number;
  iceRainActiveUntil: number;
  iceRainCooldownUntil: number;
  combatAbilities: CombatAbilityTimers;
  dungeonCooldowns: Record<string, number>;
  combatAnnouncedDungeonIds: string[];
  totalClicks: number;
  totalKills: number;
  totalGoldEarned: number;
  bossesDefeated: number;
  playSeconds: number;
};

function upgrades(
  prefix: string,
  firstCost: number,
  names: readonly [string, string, string, string, string],
  essence: string,
): readonly WeaponUpgrade[] {
  return [
    { id: `${prefix}_10`, name: names[0], description: `Фокусирует ${essence}. Урон этого оружия увеличивается в 2 раза.`, threshold: 10, multiplier: 2, cost: firstCost },
    { id: `${prefix}_25`, name: names[1], description: `Уплотняет ${essence}. Урон этого оружия дополнительно увеличивается в 2 раза.`, threshold: 25, multiplier: 2, cost: firstCost * 5 },
    { id: `${prefix}_50`, name: names[2], description: `Вводит ${essence} в боевой резонанс. Урон этого оружия увеличивается в 2 раза.`, threshold: 50, multiplier: 2, cost: firstCost * 25 },
    { id: `${prefix}_100`, name: names[3], description: `Пробуждает ${essence}. Урон этого оружия увеличивается в 2 раза.`, threshold: 100, multiplier: 2, cost: firstCost * 150 },
    { id: `${prefix}_150`, name: names[4], description: `Завершает специализацию: ${essence} достигает предельной формы. Урон этого оружия увеличивается в 2 раза. После этого каждый уровень даёт линейное усиление без новых способностей.`, threshold: 150, multiplier: 2, cost: firstCost * 800 },
  ];
}

export const WEAPON_ORDER: readonly WeaponId[] = [
  "gray_weapon",
  "purple_weapon",
  "blue_weapon",
  "void_weapon",
  "sun_weapon",
  "relic_weapon",
];

export const MANUAL_UPGRADES: readonly ManualUpgrade[] = [
  { id: "manual_10", name: "Точный импульс", description: "Даёт ручным выстрелам 2% шанс нанести критический урон ×2.", threshold: 10, cost: 120, icon: "critical", kind: "passive" },
  { id: "manual_25", name: "Золотая хватка", description: "+10% золота за победу над любым монстром, включая боссов и данжи.", threshold: 25, cost: 2_400, icon: "gold-bag", kind: "passive" },
  { id: "manual_50", name: "Острое зрение", description: "Повышает базовый шанс критического ручного выстрела с 2% до 5%.", threshold: 50, cost: 120_000, icon: "agility", kind: "passive" },
  { id: "manual_100", name: "Двойной разряд", description: "Даёт каждому ручному выстрелу отдельный 5% шанс нанести двойной урон.", threshold: 100, cost: 250_000_000, icon: "strength", kind: "passive" },
  { id: "manual_150", name: "Крит", description: "На 1 минуту добавляет 20% к шансу критического ручного выстрела. Перезарядка начинается после действия и длится 5 минут.", threshold: 150, cost: 640_000_000_000, icon: "critical", kind: "active" },
] as const;

const RUNAWAY_MIGRATION_LEVEL_CAP: Record<WeaponId, number> = {
  gray_weapon: 20,
  purple_weapon: 10,
  blue_weapon: 4,
  void_weapon: 1,
  sun_weapon: 1,
  relic_weapon: 1,
};

const RUNAWAY_MIGRATION_MIN_ZONE: Record<WeaponId, number> = {
  gray_weapon: 1,
  purple_weapon: 5,
  blue_weapon: 10,
  void_weapon: 14,
  sun_weapon: 20,
  relic_weapon: 22,
};

export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  gray_weapon: {
    id: "gray_weapon", name: "Серый импульсник", shortName: "ИМПУЛЬСНИК",
    description: "Надёжное оружие очищающего корпуса", color: "#b8c3bd",
    unlockZone: 1, purchaseCost: 0, baseDps: 1, levelBaseCost: 5, levelCostGrowth: 1.075,
    upgrades: upgrades("gray", 120, ["Стабилизатор", "Импульсная камера", "Боевой резонатор", "Протокол Омега", "Ловкость"], "импульсный сердечник").map((upgrade) => (
      upgrade.threshold === WEAPON_SPECIALIZATION_LEVEL
        ? { ...upgrade, description: "Урон Серого импульсника увеличивается в 2 раза. Ловкость: каждый уровень после 150-го дополнительно даёт +10% к DPS этого оружия. Бонусы складываются." }
        : upgrade
    )),
  },
  purple_weapon: {
    id: "purple_weapon", name: "Биоплазменный жезл", shortName: "БИОПЛАЗМА",
    description: "Живая энергия заражённого леса", color: "#bd72ff",
    unlockZone: 5, purchaseCost: 150, baseDps: 8, levelBaseCost: 20, levelCostGrowth: 1.075,
    upgrades: upgrades("purple", 480, ["Живая мембрана", "Плазменный кокон", "Споровый резонанс", "Сердце биоплазмы", "Скорость"], "живую биоплазму").map((upgrade) => upgrade.threshold === 150 ? { ...upgrade, description: "Урон жезла увеличивается в 2 раза. Каждый уровень после 150-го дополнительно повышает скорость его автоматических атак на 1%, увеличивая DPS жезла. Бонусы складываются." } : upgrade),
  },
  blue_weapon: {
    id: "blue_weapon", name: "Кристальная винтовка", shortName: "КРИСТАЛЛ",
    description: "Сжатый луч ледяных высот", color: "#5fc7ff",
    unlockZone: 12, purchaseCost: 2_500, baseDps: 55, levelBaseCost: 110, levelCostGrowth: 1.075,
    upgrades: upgrades("blue", 3_500, ["Ледяная линза", "Глубокая заморозка", "Осколочный резонанс", "Абсолютный ноль", "Ледяной дождь"], "ледяной кристалл").map((upgrade) => (
      upgrade.threshold === WEAPON_SPECIALIZATION_LEVEL
        ? { ...upgrade, description: "Урон Кристальной винтовки увеличивается в 2 раза. Открывает умение «Ледяной дождь»: град ледяных снарядов наносит урон ручной атаки." }
        : upgrade
    )),
  },
  void_weapon: {
    id: "void_weapon", name: "Пушка Бездны", shortName: "БЕЗДНА",
    description: "Разрывает саму ткань порчи", color: "#ff678f",
    unlockZone: 20, purchaseCost: 40_000, baseDps: 420, levelBaseCost: 1_300, levelCostGrowth: 1.075,
    upgrades: upgrades("void", 42_000, ["Магматическая трещина", "Давление Бездны", "Фиолетовое извержение", "Сингулярность", "Бездна"], "магму Бездны").map((upgrade) => upgrade.threshold === 150 ? { ...upgrade, description: "Урон пушки увеличивается в 2 раза. Бездна: 10 глаз стреляют со всех сторон, каждый по 4 раза в секунду. Попадание наносит ×1 общего DPS. Длительность 12 секунд, затем перезарядка 10 минут." } : upgrade),
  },
  sun_weapon: {
    id: "sun_weapon", name: "Солнечный очиститель", shortName: "СОЛНЦЕ",
    description: "Сжигает тьму концентрированным светом", color: "#ffcc64",
    unlockZone: 30, purchaseCost: 1_200_000, baseDps: 3_600, levelBaseCost: 18_000, levelCostGrowth: 1.075,
    upgrades: upgrades("sun", 620_000, ["Солнечная катушка", "Высокое напряжение", "Цепная дуга", "Корона звезды", "Мешок золота"], "солнечный разряд").map((upgrade) => upgrade.threshold === 150 ? { ...upgrade, description: "Урон очистителя увеличивается в 2 раза. Мешок золота: +30% золота за победу над любым монстром, включая боссов и данжи." } : upgrade),
  },
  relic_weapon: {
    id: "relic_weapon", name: "Реликтовый разлом", shortName: "РЕЛИКТ",
    description: "Орудие забытой эпохи магов", color: "#76ffd0",
    unlockZone: 40, purchaseCost: 30_000_000, baseDps: 31_000, levelBaseCost: 260_000, levelCostGrowth: 1.075,
    upgrades: upgrades("relic", 9_500_000, ["Гелевая оболочка", "Живой полимер", "Реликтовая реакция", "Память эпохи", "Призыв волка"], "реликтовый гель").map((upgrade) => upgrade.threshold === 150 ? { ...upgrade, description: "Урон разлома увеличивается в 2 раза. Призывает волка на 20 секунд: 5 ударов в секунду, каждый с уроном ×2 общего DPS. Затем перезарядка 3 минуты." } : upgrade),
  },
};

export function isBossZone(zone: number): boolean {
  return Math.max(1, Math.floor(zone)) % BOSS_ZONE_INTERVAL === 0;
}

export function getBiomeForZone(zone: number): { name: string; shortName: string; color: string } {
  const band = Math.floor((Math.max(1, zone) - 1) / 10) % 3;
  if (band === 1) return { name: "Кристальные высоты", shortName: "ВЫСОТЫ", color: "#183653" };
  if (band === 2) return { name: "Пепельная пустошь", shortName: "ПУСТОШЬ", color: "#452531" };
  return { name: "Заражённый лес", shortName: "ЛЕС", color: "#20382a" };
}

export function getEnemyMaxHp(zone: number, enemySerial = 0): number {
  const safeZone = Math.max(1, Math.floor(zone));
  // Through level 50 HP follows the same 1.48 growth as rewards. Difficulty
  // starts separating from income only after level 50, at a deliberate 1.58.
  const earlyLevels = Math.min(safeZone - 1, 49);
  const lateLevels = Math.max(0, safeZone - 50);
  // Ease in after 50: -3% HP per level, reaching -30% at level 60.
  const lateGameRelief = 1 - 0.3 * Math.min(1, lateLevels / 10);
  const base = 10 * Math.pow(1.48, earlyLevels) * Math.pow(1.58, lateLevels) * lateGameRelief;
  if (isBossZone(safeZone)) return Math.max(1, Math.round(base * 12));
  return Math.max(1, Math.round(base * (1 + (enemySerial % ENEMIES_PER_ZONE) * 0.035)));
}

export function getEnemyGold(zone: number): number {
  const safeZone = Math.max(1, Math.floor(zone));
  const base = Math.max(1, Math.round(3 * Math.pow(1.48, safeZone - 1)));
  return isBossZone(safeZone) ? base * 10 : base;
}

export function getGoldRewardMultiplier(state: Pick<GameStateV3, "weapons"> & Partial<Pick<GameStateV3, "clickPurchasedUpgradeIds">>): number {
  const solarBonus = state.weapons.sun_weapon.owned && state.weapons.sun_weapon.purchasedUpgradeIds.includes(GOLD_REWARD_PASSIVE_UPGRADE_ID)
    ? GOLD_REWARD_PASSIVE_MULTIPLIER - 1
    : 0;
  const manualBonus = state.clickPurchasedUpgradeIds?.includes(MANUAL_GOLD_UPGRADE_ID)
    ? MANUAL_GOLD_REWARD_MULTIPLIER - 1
    : 0;
  return 1 + solarBonus + manualBonus;
}

export function getGoldRewardWithBonuses(state: Pick<GameStateV3, "weapons"> & Partial<Pick<GameStateV3, "clickPurchasedUpgradeIds">>, baseReward: number): number {
  return Math.max(0, Math.round(baseReward * getGoldRewardMultiplier(state)));
}

export function createInitialWeaponStates(): Record<WeaponId, WeaponState> {
  return WEAPON_ORDER.reduce((states, id) => {
    states[id] = {
      owned: id === "gray_weapon",
      level: id === "gray_weapon" ? 1 : 0,
      purchasedUpgradeIds: [],
    };
    return states;
  }, {} as Record<WeaponId, WeaponState>);
}

export function createInitialGameState(): GameStateV3 {
  const enemyMaxHp = getEnemyMaxHp(1, 0);
  return {
    version: SAVE_VERSION,
    gold: 0,
    zone: 1,
    highestZone: 1,
    killsInZone: 0,
    enemySerial: 0,
    enemyHp: enemyMaxHp,
    enemyMaxHp,
    bossTimeLeft: 0,
    selectedWeaponId: "gray_weapon",
    bulkAmount: 1,
    clickLevel: 1,
    clickPurchasedUpgradeIds: [],
    manualCriticalActiveUntil: 0,
    manualCriticalCooldownUntil: 0,
    weapons: createInitialWeaponStates(),
    dpsBoostUntil: 0,
    abilityCooldownUntil: 0,
    iceRainActiveUntil: 0,
    iceRainCooldownUntil: 0,
    combatAbilities: emptyCombatAbilities(),
    dungeonCooldowns: {},
    combatAnnouncedDungeonIds: [],
    totalClicks: 0,
    totalKills: 0,
    totalGoldEarned: 0,
    bossesDefeated: 0,
    playSeconds: 0,
  };
}

export function getWeaponLevelCost(weaponId: WeaponId, currentLevel: number): number {
  const weapon = WEAPONS[weaponId];
  const level = Math.max(1, Math.floor(currentLevel));
  return Math.max(1, Math.round(weapon.levelBaseCost * Math.pow(weapon.levelCostGrowth, level - 1)));
}

export function getWeaponDps(weaponId: WeaponId, state: WeaponState): number {
  if (!state.owned || state.level <= 0) return 0;
  const weapon = WEAPONS[weaponId];
  const upgradeMultiplier = weapon.upgrades.reduce((total, upgrade) => (
    state.purchasedUpgradeIds.includes(upgrade.id) ? total * upgrade.multiplier : total
  ), 1);
  // V3 balance: levels are intentionally linear. Exponential power belongs to the
  // zone curve and discrete upgrades; stacking another per-level exponent here
  // makes income grow faster than costs and causes a runaway economy.
  const masteryLevels = Math.max(0, state.level - WEAPON_SPECIALIZATION_LEVEL);
  const specializationBonus = weaponId === "gray_weapon" && state.purchasedUpgradeIds.includes("gray_150")
    ? 1 + masteryLevels * .1
    : weaponId === "purple_weapon" && state.purchasedUpgradeIds.includes("purple_150")
      ? 1 + masteryLevels * .01
      : 1;
  return weapon.baseDps * state.level * upgradeMultiplier * specializationBonus;
}

export function getTotalArsenalDps(state: Pick<GameStateV3, "weapons">): number {
  return WEAPON_ORDER.reduce((total, id) => total + getWeaponDps(id, state.weapons[id]), 0);
}

export function getGlobalClickDamage(state: Pick<GameStateV3, "clickLevel">): number {
  const level = Math.max(1, Math.floor(state.clickLevel));
  return Math.max(1, Math.round(level * Math.pow(1.12, level - 1)));
}

export function getClickLevelCost(currentLevel: number): number {
  const level = Math.max(1, Math.floor(currentLevel));
  return Math.max(1, Math.round(8 * Math.pow(1.16, level - 1)));
}

export function getManualCritChance(
  state: Pick<GameStateV3, "clickPurchasedUpgradeIds" | "manualCriticalActiveUntil">,
  now: number,
): number {
  const baseChance = state.clickPurchasedUpgradeIds.includes("manual_50")
    ? .05
    : state.clickPurchasedUpgradeIds.includes("manual_10") ? .02 : 0;
  return Math.min(1, baseChance + (state.manualCriticalActiveUntil > now ? .2 : 0));
}

export type ManualAttackResult = { amount: number; critical: boolean; doubleDamage: boolean };

export function resolveManualAttack(
  baseDamage: number,
  state: Pick<GameStateV3, "clickPurchasedUpgradeIds" | "manualCriticalActiveUntil">,
  now: number,
  criticalRoll = Math.random(),
  doubleDamageRoll = Math.random(),
): ManualAttackResult {
  const critical = criticalRoll < getManualCritChance(state, now);
  const doubleDamage = state.clickPurchasedUpgradeIds.includes("manual_100") && doubleDamageRoll < .05;
  return {
    amount: Math.max(0, baseDamage) * (critical ? MANUAL_CRIT_MULTIPLIER : 1) * (doubleDamage ? MANUAL_DOUBLE_DAMAGE_MULTIPLIER : 1),
    critical,
    doubleDamage,
  };
}

export function buyManualUpgrade(state: GameStateV3, upgradeId: string): GameStateV3 {
  const upgrade = MANUAL_UPGRADES.find((item) => item.id === upgradeId);
  if (!upgrade || state.clickPurchasedUpgradeIds.includes(upgrade.id)
    || state.clickLevel < upgrade.threshold || state.gold < upgrade.cost) return state;
  return {
    ...state,
    gold: state.gold - upgrade.cost,
    clickPurchasedUpgradeIds: [...state.clickPurchasedUpgradeIds, upgrade.id],
  };
}

export function activateManualCritical(state: GameStateV3, now: number): GameStateV3 {
  if (!state.clickPurchasedUpgradeIds.includes("manual_150")
    || state.manualCriticalActiveUntil > now || state.manualCriticalCooldownUntil > now) return state;
  const activeUntil = now + MANUAL_CRIT_DURATION_SEC * 1000;
  return {
    ...state,
    manualCriticalActiveUntil: activeUntil,
    manualCriticalCooldownUntil: activeUntil + MANUAL_CRIT_COOLDOWN_SEC * 1000,
  };
}

export function getNextWeaponUpgrade(weaponId: WeaponId, state: WeaponState): WeaponUpgrade | null {
  return WEAPONS[weaponId].upgrades.find((upgrade) => !state.purchasedUpgradeIds.includes(upgrade.id)) ?? null;
}

export type LevelQuote = { levels: number; cost: number };

export function getWeaponLevelQuote(
  weaponId: WeaponId,
  state: WeaponState,
  gold: number,
  bulkAmount: BulkAmount,
): LevelQuote {
  if (!state.owned) return { levels: 0, cost: WEAPONS[weaponId].purchaseCost };
  const limit = bulkAmount === "max" ? WEAPON_LEVEL_CAP : bulkAmount;
  let cost = 0;
  let levels = 0;
  while (levels < limit && state.level + levels < WEAPON_LEVEL_CAP) {
    const nextCost = getWeaponLevelCost(weaponId, state.level + levels);
    if (bulkAmount === "max" && cost + nextCost > gold) break;
    cost += nextCost;
    levels += 1;
  }
  return { levels, cost };
}

export function buyWeaponOrLevels(state: GameStateV3, weaponId: WeaponId): GameStateV3 {
  const current = state.weapons[weaponId];
  const weapon = WEAPONS[weaponId];
  if (!current.owned) {
    if (state.highestZone < weapon.unlockZone || state.gold < weapon.purchaseCost) return state;
    return {
      ...state,
      gold: state.gold - weapon.purchaseCost,
      weapons: { ...state.weapons, [weaponId]: { owned: true, level: 1, purchasedUpgradeIds: [] } },
    };
  }
  const quote = getWeaponLevelQuote(weaponId, current, state.gold, state.bulkAmount);
  if (quote.levels <= 0 || state.gold < quote.cost) return state;
  return {
    ...state,
    gold: state.gold - quote.cost,
    weapons: { ...state.weapons, [weaponId]: { ...current, level: current.level + quote.levels } },
  };
}

export function buyWeaponUpgrade(state: GameStateV3, weaponId: WeaponId, upgradeId?: string): GameStateV3 {
  const current = state.weapons[weaponId];
  if (!current.owned) return state;
  const upgrade = upgradeId
    ? WEAPONS[weaponId].upgrades.find((item) => item.id === upgradeId) ?? null
    : getNextWeaponUpgrade(weaponId, current);
  if (upgrade && current.purchasedUpgradeIds.includes(upgrade.id)) return state;
  if (!upgrade || current.level < upgrade.threshold || state.gold < upgrade.cost) return state;
  return {
    ...state,
    gold: state.gold - upgrade.cost,
    weapons: {
      ...state.weapons,
      [weaponId]: { ...current, purchasedUpgradeIds: [...current.purchasedUpgradeIds, upgrade.id] },
    },
  };
}

export function buyClickLevel(state: GameStateV3): GameStateV3 {
  const cost = getClickLevelCost(state.clickLevel);
  if (state.gold < cost) return state;
  return { ...state, gold: state.gold - cost, clickLevel: state.clickLevel + 1 };
}

function spawnAt(state: GameStateV3, zone: number, killsInZone: number, enemySerial: number): GameStateV3 {
  const enemyMaxHp = getEnemyMaxHp(zone, enemySerial);
  return {
    ...state,
    zone,
    highestZone: Math.max(state.highestZone, zone),
    killsInZone,
    enemySerial,
    enemyHp: enemyMaxHp,
    enemyMaxHp,
    bossTimeLeft: isBossZone(zone) ? BOSS_TIME_LIMIT_SEC : 0,
  };
}

export function defeatCurrentEnemy(state: GameStateV3): GameStateV3 {
  const reward = getGoldRewardWithBonuses(state, getEnemyGold(state.zone));
  const boss = isBossZone(state.zone);
  const rewarded = {
    ...state,
    gold: state.gold + reward,
    totalGoldEarned: state.totalGoldEarned + reward,
    totalKills: state.totalKills + 1,
    bossesDefeated: state.bossesDefeated + (boss ? 1 : 0),
  };
  if (boss) {
    const unlocked = { ...rewarded, highestZone: Math.max(rewarded.highestZone, state.zone + 1) };
    return spawnAt(unlocked, Math.max(1, state.zone - 1), 0, state.enemySerial + 1);
  }

  const nextKills = state.killsInZone + 1;
  if (nextKills < ENEMIES_PER_ZONE) return spawnAt(rewarded, state.zone, nextKills, state.enemySerial + 1);
  const unlocked = { ...rewarded, highestZone: Math.max(rewarded.highestZone, state.zone + 1) };
  return spawnAt(unlocked, state.zone, 0, state.enemySerial + 1);
}

export function damageEnemy(state: GameStateV3, damage: number, manual = false): GameStateV3 {
  const amount = Math.max(0, damage);
  const next = { ...state, enemyHp: Math.max(0, state.enemyHp - amount), totalClicks: state.totalClicks + (manual ? 1 : 0) };
  return next.enemyHp <= 0 ? defeatCurrentEnemy(next) : next;
}

function advanceRegularAfkDamage(state: GameStateV3, damage: number): GameStateV3 {
  let next = state;
  let remainingDamage = Math.max(0, damage);
  if (remainingDamage < next.enemyHp) return { ...next, enemyHp: next.enemyHp - remainingDamage };

  remainingDamage -= next.enemyHp;
  next = defeatCurrentEnemy(next);

  // Enemy health repeats every ten serials. Whole cycles are awarded in one
  // operation so a long-lived background tab does not need thousands of loops.
  const cycleDamage = Array.from({ length: ENEMIES_PER_ZONE }, (_, index) => (
    getEnemyMaxHp(next.zone, next.enemySerial + index)
  )).reduce((sum, hp) => sum + hp, 0);
  const cycles = cycleDamage > 0 ? Math.floor(remainingDamage / cycleDamage) : 0;
  if (cycles > 0) {
    const kills = cycles * ENEMIES_PER_ZONE;
    const reward = getGoldRewardWithBonuses(next, getEnemyGold(next.zone)) * kills;
    const enemySerial = next.enemySerial + kills;
    const enemyMaxHp = getEnemyMaxHp(next.zone, enemySerial);
    next = {
      ...next,
      gold: next.gold + reward,
      totalGoldEarned: next.totalGoldEarned + reward,
      totalKills: next.totalKills + kills,
      highestZone: Math.max(next.highestZone, next.zone + 1),
      enemySerial,
      enemyHp: enemyMaxHp,
      enemyMaxHp,
    };
    remainingDamage -= cycleDamage * cycles;
  }

  for (let index = 0; index < ENEMIES_PER_ZONE && remainingDamage >= next.enemyHp; index += 1) {
    remainingDamage -= next.enemyHp;
    next = defeatCurrentEnemy(next);
  }
  return remainingDamage > 0 ? { ...next, enemyHp: Math.max(0.0001, next.enemyHp - remainingDamage) } : next;
}

/** Advances automatic combat by real wall-clock time while the browser tab is in the background. */
export function advanceAfkCombat(state: GameStateV3, dps: number, elapsedSeconds: number): GameStateV3 {
  const safeDps = Math.max(0, dps);
  let remainingSeconds = Math.max(0, elapsedSeconds);
  if (remainingSeconds <= 0) return state;
  let next = state;

  if (isBossZone(next.zone)) {
    const available = Math.min(remainingSeconds, next.bossTimeLeft);
    const timeToDefeat = next.enemyHp / safeDps;
    if (timeToDefeat <= available) {
      remainingSeconds -= timeToDefeat;
      next = defeatCurrentEnemy({ ...next, enemyHp: 0, bossTimeLeft: Math.max(0, next.bossTimeLeft - timeToDefeat) });
    } else {
      remainingSeconds -= available;
      next = {
        ...next,
        enemyHp: Math.max(0.0001, next.enemyHp - safeDps * available),
        bossTimeLeft: Math.max(0, next.bossTimeLeft - available),
      };
      if (next.bossTimeLeft > 0) return next;
      next = failBoss(next);
    }
  }

  return !isBossZone(next.zone) && remainingSeconds > 0
    ? advanceRegularAfkDamage(next, safeDps * remainingSeconds)
    : next;
}

export function failBoss(state: GameStateV3): GameStateV3 {
  if (!isBossZone(state.zone)) return state;
  return spawnAt(state, Math.max(1, state.zone - 1), 0, state.enemySerial + 1);
}

export function enterZone(state: GameStateV3, zone: number): GameStateV3 {
  const targetZone = Math.max(1, Math.min(state.highestZone, Math.floor(zone)));
  if (isBossZone(targetZone) && targetZone < state.highestZone) return state;
  return spawnAt(state, targetZone, 0, state.enemySerial + 1);
}

export function normalizeGameState(value: unknown): GameStateV3 {
  const initial = createInitialGameState();
  if (!value || typeof value !== "object") return initial;
  const raw = value as Record<string, unknown>;
  const sourceWeapons = raw.weapons && typeof raw.weapons === "object" ? raw.weapons as Record<string, unknown> : {};
  const legacyLevels = raw.weaponLevels && typeof raw.weaponLevels === "object" ? raw.weaponLevels as Record<string, unknown> : {};
  const legacyPresented = Array.isArray(raw.presentedWeaponUnlockIds) ? raw.presentedWeaponUnlockIds : [];
  const rawHighestZone = clampInteger(raw.highestZone, 1, 1_000_000);
  const rawGold = safeNumber(raw.gold ?? raw.coins, 0);
  const runawayBalanceSave = Number(raw.version) === 3 && (
    rawHighestZone > 20
    || rawGold > 1_000_000_000
    || WEAPON_ORDER.some((id) => {
      const candidate = sourceWeapons[id];
      return candidate && typeof candidate === "object" && Number((candidate as Partial<WeaponState>).level) > 150;
    })
  );
  const weapons = createInitialWeaponStates();

  for (const id of WEAPON_ORDER) {
    const candidate = sourceWeapons[id] && typeof sourceWeapons[id] === "object"
      ? sourceWeapons[id] as Partial<WeaponState>
      : null;
    const legacyOwned = id === "gray_weapon" || legacyPresented.includes(id);
    const savedLevel = candidate
      ? clampInteger(candidate.level, candidate.owned ? 1 : 0, WEAPON_LEVEL_CAP)
      : legacyOwned ? clampInteger(legacyLevels[id], 1, WEAPON_LEVEL_CAP) : 0;
    const level = runawayBalanceSave && savedLevel > 0
      ? Math.min(savedLevel, RUNAWAY_MIGRATION_LEVEL_CAP[id])
      : savedLevel;
    const purchased = candidate && Array.isArray(candidate.purchasedUpgradeIds)
      ? WEAPONS[id].upgrades.filter((upgrade) => candidate.purchasedUpgradeIds?.includes(upgrade.id) && upgrade.threshold <= level).map((upgrade) => upgrade.id)
      : [];
    weapons[id] = { owned: candidate ? candidate.owned === true : legacyOwned, level, purchasedUpgradeIds: purchased };
    if (!weapons[id].owned) weapons[id].level = 0;
  }

  const migratedMinimumZone = WEAPON_ORDER.reduce((minimum, id) => (
    weapons[id].owned ? Math.max(minimum, RUNAWAY_MIGRATION_MIN_ZONE[id]) : minimum
  ), 1);
  const highestZone = runawayBalanceSave
    ? Math.min(25, Math.max(migratedMinimumZone, Math.round(Math.sqrt(rawHighestZone) * 1.75)))
    : rawHighestZone;
  const savedZone = Math.min(highestZone, clampInteger(raw.zone, 1, 1_000_000));
  const zone = runawayBalanceSave && isBossZone(savedZone) ? Math.max(1, savedZone - 1) : savedZone;
  const enemySerial = clampInteger(raw.enemySerial, 0, Number.MAX_SAFE_INTEGER);
  const enemyMaxHp = getEnemyMaxHp(zone, enemySerial);
  const savedHp = safeNumber(raw.enemyHp, enemyMaxHp);
  const selected = WEAPON_ORDER.includes(raw.selectedWeaponId as WeaponId) && weapons[raw.selectedWeaponId as WeaponId].owned
    ? raw.selectedWeaponId as WeaponId
    : "gray_weapon";
  const bulk = raw.bulkAmount === "max" || raw.bulkAmount === 10 || raw.bulkAmount === 25 || raw.bulkAmount === 100 ? raw.bulkAmount : 1;
  const migratedGoldCap = getEnemyGold(zone) * ENEMIES_PER_ZONE * 2;

  return {
    version: SAVE_VERSION,
    gold: runawayBalanceSave ? Math.min(rawGold, migratedGoldCap) : rawGold,
    zone,
    highestZone,
    killsInZone: isBossZone(zone) ? 0 : clampInteger(raw.killsInZone, 0, ENEMIES_PER_ZONE - 1),
    enemySerial,
    enemyHp: Math.max(0.0001, Math.min(enemyMaxHp, savedHp)),
    enemyMaxHp,
    bossTimeLeft: isBossZone(zone) ? Math.min(BOSS_TIME_LIMIT_SEC, safeNumber(raw.bossTimeLeft, BOSS_TIME_LIMIT_SEC)) : 0,
    selectedWeaponId: selected,
    bulkAmount: bulk,
    clickLevel: runawayBalanceSave
      ? Math.min(clampInteger(raw.clickLevel ?? raw.powerLevel, 1, WEAPON_LEVEL_CAP), 10)
      : clampInteger(raw.clickLevel ?? raw.powerLevel, 1, WEAPON_LEVEL_CAP),
    clickPurchasedUpgradeIds: Array.isArray(raw.clickPurchasedUpgradeIds)
      ? MANUAL_UPGRADES.filter((upgrade) => (raw.clickPurchasedUpgradeIds as unknown[]).includes(upgrade.id)
        && upgrade.threshold <= clampInteger(raw.clickLevel ?? raw.powerLevel, 1, WEAPON_LEVEL_CAP)).map((upgrade) => upgrade.id)
      : [],
    manualCriticalActiveUntil: safeNumber(raw.manualCriticalActiveUntil, 0),
    manualCriticalCooldownUntil: safeNumber(raw.manualCriticalCooldownUntil, 0),
    weapons,
    dpsBoostUntil: safeNumber(raw.dpsBoostUntil, 0),
    abilityCooldownUntil: safeNumber(raw.abilityCooldownUntil, 0),
    iceRainActiveUntil: safeNumber(raw.iceRainActiveUntil, 0),
    iceRainCooldownUntil: safeNumber(raw.iceRainCooldownUntil, 0),
    combatAbilities: normalizeCombatAbilities(raw.combatAbilities),
    dungeonCooldowns: raw.dungeonCooldowns && typeof raw.dungeonCooldowns === "object"
      ? Object.fromEntries(Object.entries(raw.dungeonCooldowns as Record<string, unknown>)
        .filter(([, until]) => Number.isFinite(Number(until)) && Number(until) > 0)
        .map(([id, until]) => [id, Number(until)]))
      : {},
    combatAnnouncedDungeonIds: Array.isArray(raw.combatAnnouncedDungeonIds)
      ? [...new Set(raw.combatAnnouncedDungeonIds.filter((id): id is string => typeof id === "string"))]
      : [],
    totalClicks: clampInteger(raw.totalClicks, 0, Number.MAX_SAFE_INTEGER),
    totalKills: clampInteger(raw.totalKills, 0, Number.MAX_SAFE_INTEGER),
    totalGoldEarned: safeNumber(raw.totalGoldEarned ?? raw.totalCoinsEarned, 0),
    bossesDefeated: clampInteger(raw.bossesDefeated, 0, Number.MAX_SAFE_INTEGER),
    playSeconds: clampInteger(raw.playSeconds, 0, Number.MAX_SAFE_INTEGER),
  };
}

function safeNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function clampInteger(value: unknown, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(safeNumber(value, min))));
}
