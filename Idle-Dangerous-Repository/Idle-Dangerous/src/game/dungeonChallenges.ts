import { getEnemyGold, getEnemyMaxHp } from "./clickerV3.ts";
import { getBossName } from "./bossRoster.ts";

export const DUNGEON_TIME_LIMIT_SEC = 30;
export const DUNGEON_COOLDOWN_SEC = 10 * 60;
export const DUNGEON_HP_MULTIPLIER = 2;
export const DUNGEON_REWARD_MULTIPLIER = 3;

type DungeonRegionId = 1 | 2 | 3 | 4 | 5 | 6;
type DungeonSlot = 1 | 2 | 3;

export type DungeonId = `region_${DungeonRegionId}_dungeon_${DungeonSlot}`;

export type DungeonDefinition = {
  id: DungeonId;
  regionId: DungeonRegionId;
  slot: DungeonSlot;
  bossZone: number;
  name: string;
  shortName: string;
  hp: number;
  reward: number;
  x: number;
  y: number;
  enemyArtNumber: number;
};

export type DungeonAttempt = {
  dungeonId: DungeonId;
  hp: number;
  maxHp: number;
  timeLeft: number;
  rewardedBoost: boolean;
  status: "fighting" | "failed" | "won";
};

type DungeonSeed = Omit<DungeonDefinition, "hp" | "reward">;

function defineDungeon(seed: DungeonSeed): DungeonDefinition {
  const bossArtOrder = [1, 9, 7, 11, 8, 2, 14, 6, 17, 4, 13, 18];
  const enemyArtNumber = seed.slot === 3 ? 16 : bossArtOrder[(seed.regionId - 1) * 2 + seed.slot - 1];
  return {
    ...seed,
    enemyArtNumber,
    name: getBossName(enemyArtNumber),
    hp: getEnemyMaxHp(seed.bossZone) * DUNGEON_HP_MULTIPLIER,
    reward: getEnemyGold(seed.bossZone) * DUNGEON_REWARD_MULTIPLIER,
  };
}

export const DUNGEON_CHALLENGES: readonly DungeonDefinition[] = [
  defineDungeon({ id: "region_1_dungeon_1", regionId: 1, slot: 1, bossZone: 5, name: "Хранитель сумрачных корней", shortName: "ЛОГОВО КОРНЕЙ", x: 58, y: 12, enemyArtNumber: 6 }),
  defineDungeon({ id: "region_1_dungeon_2", regionId: 1, slot: 2, bossZone: 10, name: "Страж затонувшей чащи", shortName: "ЗАТОПЛЕННАЯ ЧАЩА", x: 78, y: 74, enemyArtNumber: 11 }),

  defineDungeon({ id: "region_2_dungeon_1", regionId: 2, slot: 1, bossZone: 30, name: "Каменный исполин равнин", shortName: "КАМЕННЫЙ КУРГАН", x: 26, y: 14, enemyArtNumber: 16 }),
  defineDungeon({ id: "region_2_dungeon_2", regionId: 2, slot: 2, bossZone: 40, name: "Одинокий владыка степей", shortName: "ЗАБЫТЫЙ КУРГАН", x: 42, y: 80, enemyArtNumber: 26 }),

  defineDungeon({ id: "region_3_dungeon_1", regionId: 3, slot: 1, bossZone: 15, name: "Осколочный колосс", shortName: "КРИСТАЛЬНАЯ ШАХТА", x: 44, y: 16, enemyArtNumber: 31 }),
  defineDungeon({ id: "region_3_dungeon_2", regionId: 3, slot: 2, bossZone: 25, name: "Скованный древний", shortName: "ЛЕДЯНОЙ РАЗЛОМ", x: 36, y: 70, enemyArtNumber: 6 }),

  defineDungeon({ id: "region_4_dungeon_1", regionId: 4, slot: 1, bossZone: 45, name: "Белый пожиратель", shortName: "СНЕЖНАЯ БЕЗДНА", x: 62, y: 16, enemyArtNumber: 11 }),
  defineDungeon({ id: "region_4_dungeon_2", regionId: 4, slot: 2, bossZone: 55, name: "Владыка вечной метели", shortName: "СЕРДЦЕ МЕТЕЛИ", x: 28, y: 60, enemyArtNumber: 26 }),

  defineDungeon({ id: "region_5_dungeon_1", regionId: 5, slot: 1, bossZone: 60, name: "Проклятый древень", shortName: "МЁРТВАЯ РОЩА", x: 54, y: 18, enemyArtNumber: 31 }),
  defineDungeon({ id: "region_5_dungeon_2", regionId: 5, slot: 2, bossZone: 75, name: "Архонт багровой порчи", shortName: "АЛТАРЬ ПОРЧИ", x: 72, y: 74, enemyArtNumber: 11 }),

  defineDungeon({ id: "region_6_dungeon_1", regionId: 6, slot: 1, bossZone: 80, name: "Лавовый левиафан", shortName: "ОГНЕННЫЙ КРАТЕР", x: 46, y: 24, enemyArtNumber: 26 }),
  defineDungeon({ id: "region_6_dungeon_2", regionId: 6, slot: 2, bossZone: 90, name: "Пожиратель разлома", shortName: "СЕРДЦЕ ХАОСА", x: 32, y: 82, enemyArtNumber: 31 }),
  defineDungeon({ id: "region_6_dungeon_3", regionId: 6, slot: 3, bossZone: 105, name: "Пожиратель разлома", shortName: "СЕРДЦЕ ХАОСА", x: 88, y: 44, enemyArtNumber: 16 }),
] as const;

export function getDungeonDefinition(id: DungeonId): DungeonDefinition {
  const dungeon = DUNGEON_CHALLENGES.find((candidate) => candidate.id === id);
  if (!dungeon) throw new Error(`Unknown dungeon: ${id}`);
  return dungeon;
}

export function isDungeonUnlocked(dungeon: DungeonDefinition, highestZone: number): boolean {
  return highestZone > dungeon.bossZone;
}

export function createDungeonAttempt(id: DungeonId, rewardedBoost = false): DungeonAttempt {
  const dungeon = getDungeonDefinition(id);
  return {
    dungeonId: id,
    hp: dungeon.hp,
    maxHp: dungeon.hp,
    timeLeft: DUNGEON_TIME_LIMIT_SEC,
    rewardedBoost,
    status: "fighting",
  };
}

export function damageDungeon(attempt: DungeonAttempt, damage: number): DungeonAttempt {
  if (attempt.status !== "fighting") return attempt;
  const hp = Math.max(0, attempt.hp - Math.max(0, damage));
  return { ...attempt, hp, status: hp <= 0 ? "won" : "fighting" };
}

export function advanceDungeon(
  attempt: DungeonAttempt,
  baseDps: number,
  elapsedSeconds: number,
): DungeonAttempt {
  if (attempt.status !== "fighting") return attempt;
  const elapsed = Math.min(attempt.timeLeft, Math.max(0, elapsedSeconds));
  const multiplier = attempt.rewardedBoost ? 2 : 1;
  const damaged = damageDungeon(attempt, Math.max(0, baseDps) * multiplier * elapsed);
  if (damaged.status === "won") return damaged;
  const timeLeft = Math.max(0, attempt.timeLeft - elapsed);
  return { ...damaged, timeLeft, status: timeLeft <= 0 ? "failed" : "fighting" };
}
