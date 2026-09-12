import { FARM_REWARD_MULTIPLIER, type CampaignElement, type NormalPointId, type PointProgress } from "./progression.ts";

export const POINT_ENEMY_POOLS: Readonly<Record<NormalPointId, readonly string[]>> = {
  biome_01_point_01: ["enemy-01", "enemy-03", "enemy-06", "enemy-07", "enemy-09", "enemy-11", "enemy-13", "enemy-14", "enemy-18", "enemy-20"],
  biome_01_point_02: ["enemy-06", "enemy-07", "enemy-09", "enemy-11", "enemy-13", "enemy-18", "enemy-20", "enemy-21", "enemy-24", "enemy-34"],
  biome_02_point_01: ["enemy-02", "enemy-05", "enemy-08", "enemy-10", "enemy-15", "enemy-16", "enemy-19", "enemy-22", "enemy-23", "enemy-25"],
  biome_02_point_02: ["enemy-05", "enemy-08", "enemy-10", "enemy-15", "enemy-16", "enemy-19", "enemy-22", "enemy-23", "enemy-25", "enemy-29"],
};

// Ритм идёт сквозь обе точки биома: три обычные встречи, затем одна заражённая.
// Поэтому во второй точке заражёнными становятся локальные встречи 2/6/10.
const CORRUPTED_POOL_INDICES: Readonly<Record<NormalPointId, readonly number[]>> = {
  biome_01_point_01: [3, 7],
  biome_01_point_02: [1, 5, 9],
  biome_02_point_01: [3, 7],
  biome_02_point_02: [1, 5, 9],
};

const POINT_CORRUPTION_ELEMENTS: Readonly<Record<NormalPointId, CampaignElement>> = {
  biome_01_point_01: "bio",
  biome_01_point_02: "bio",
  biome_02_point_01: "crystal",
  biome_02_point_02: "crystal",
};

export function getPointEnemyPool(pointId: NormalPointId): readonly string[] {
  return POINT_ENEMY_POOLS[pointId];
}

export function getEncounterCorruptionElement(pointId: NormalPointId, enemyId: string): CampaignElement | null {
  const poolIndex = POINT_ENEMY_POOLS[pointId].indexOf(enemyId);
  return CORRUPTED_POOL_INDICES[pointId].includes(poolIndex) ? POINT_CORRUPTION_ELEMENTS[pointId] : null;
}

export function pickPointEnemy(
  pointId: NormalPointId,
  progress: PointProgress,
  previousId?: string,
  random: () => number = Math.random,
): string {
  const pool = getPointEnemyPool(pointId);
  if (!progress.cleared) return pool[Math.min(progress.defeatedEnemies, pool.length - 1)];

  const candidates = pool.length > 1 ? pool.filter((id) => id !== previousId) : pool;
  const randomIndex = Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)));
  return candidates[randomIndex] ?? pool[0];
}

export function calculateFarmReward(baseReward: number): number {
  return Math.round(baseReward * FARM_REWARD_MULTIPLIER);
}
