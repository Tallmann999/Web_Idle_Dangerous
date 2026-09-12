export const PROGRESSION_STATE_VERSION = 2;
export const ENEMIES_PER_POINT = 10;
export const BOSS_TIME_LIMIT_SEC = 45;
export const FARM_REWARD_MULTIPLIER = 0.8;
// Временный быстрый маршрут прототипа. После завершения всех фич целевой маршрут: 3 точки в biome_01 и 4 в biome_02.
export const POINTS_PER_BIOME = 2;
export const TOTAL_NORMAL_POINTS = 4;

export type BiomeId = "biome_01" | "biome_02";
export type CampaignElement = "bio" | "crystal";
export type NormalPointId =
  | "biome_01_point_01"
  | "biome_01_point_02"
  | "biome_02_point_01"
  | "biome_02_point_02";
export type BossPointId = "biome_01_boss" | "biome_02_boss";
export type CampaignNodeId = NormalPointId | BossPointId;
export type BossFailureReason = "time_expired" | "manual_exit" | "session_interrupted";

export type PointProgress = {
  defeatedEnemies: number;
  cleared: boolean;
  firstClearRewardGranted: boolean;
};

export type BossProgress = {
  revealed: boolean;
  defeated: boolean;
  attempts: number;
  rewardGranted: boolean;
  lastFailureReason: BossFailureReason | null;
};

export type ProgressionState = {
  version: typeof PROGRESSION_STATE_VERSION;
  points: Record<NormalPointId, PointProgress>;
  bosses: Record<BossPointId, BossProgress>;
  prototypeCompleted: boolean;
  completionScreenDismissed: boolean;
};

type CampaignNodeBase = {
  id: CampaignNodeId;
  biomeId: BiomeId;
  name: string;
  shortName: string;
  x: number;
  y: number;
  element: CampaignElement;
};

export type NormalCampaignNode = CampaignNodeBase & {
  type: "normal";
  id: NormalPointId;
  pointNumber: number;
  campaignIndex: number;
};

export type BossCampaignNode = CampaignNodeBase & {
  type: "boss";
  id: BossPointId;
};

export type CampaignNode = NormalCampaignNode | BossCampaignNode;

export const BIOMES: Record<BiomeId, { name: string; shortName: string; color: string; element: CampaignElement }> = {
  biome_01: { name: "ЗАРАЖЁННЫЙ ЛЕС", shortName: "ЛЕС", color: "#1a281d", element: "bio" },
  biome_02: { name: "КРИСТАЛЬНЫЕ ВЫСОТЫ", shortName: "ВЫСОТЫ", color: "#14253d", element: "crystal" },
};

const NORMAL_NODES: NormalCampaignNode[] = [
  { id: "biome_01_point_01", type: "normal", biomeId: "biome_01", pointNumber: 1, campaignIndex: 0, name: "Лесная опушка", shortName: "ТОЧКА 1", x: 13, y: 78, element: "bio" },
  { id: "biome_01_point_02", type: "normal", biomeId: "biome_01", pointNumber: 2, campaignIndex: 1, name: "Сердце леса", shortName: "ТОЧКА 2", x: 29, y: 60, element: "bio" },
  { id: "biome_02_point_01", type: "normal", biomeId: "biome_02", pointNumber: 1, campaignIndex: 2, name: "Подножие высот", shortName: "ТОЧКА 1", x: 68, y: 30, element: "crystal" },
  { id: "biome_02_point_02", type: "normal", biomeId: "biome_02", pointNumber: 2, campaignIndex: 3, name: "Кристальный престол", shortName: "ТОЧКА 2", x: 84, y: 45, element: "crystal" },
];

const BOSS_NODES: BossCampaignNode[] = [
  { id: "biome_01_boss", type: "boss", biomeId: "biome_01", name: "Хранитель заражённого леса", shortName: "БОСС ЛЕСА", x: 46, y: 43, element: "bio" },
  { id: "biome_02_boss", type: "boss", biomeId: "biome_02", name: "Владыка кристальных высот", shortName: "БОСС ВЫСОТ", x: 72, y: 68, element: "crystal" },
];

export const CAMPAIGN_NODES: CampaignNode[] = [
  ...NORMAL_NODES.slice(0, 2),
  BOSS_NODES[0],
  ...NORMAL_NODES.slice(2),
  BOSS_NODES[1],
];

export const CAMPAIGN_EDGES: Array<[CampaignNodeId, CampaignNodeId]> = [
  ["biome_01_point_01", "biome_01_point_02"],
  ["biome_01_point_02", "biome_01_boss"],
  ["biome_01_boss", "biome_02_point_01"],
  ["biome_02_point_01", "biome_02_point_02"],
  ["biome_02_point_02", "biome_02_boss"],
];

export function createInitialProgression(): ProgressionState {
  const points = Object.fromEntries(NORMAL_NODES.map((node) => [node.id, {
    defeatedEnemies: 0,
    cleared: false,
    firstClearRewardGranted: false,
  }])) as Record<NormalPointId, PointProgress>;
  const bosses = Object.fromEntries(BOSS_NODES.map((node) => [node.id, {
    revealed: false,
    defeated: false,
    attempts: 0,
    rewardGranted: false,
    lastFailureReason: null,
  }])) as Record<BossPointId, BossProgress>;
  return {
    version: PROGRESSION_STATE_VERSION,
    points,
    bosses,
    prototypeCompleted: false,
    completionScreenDismissed: false,
  };
}

export function getCampaignNode(id: CampaignNodeId): CampaignNode {
  const node = CAMPAIGN_NODES.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`Unknown campaign node: ${id}`);
  return node;
}

export function getNormalPointsForBiome(biomeId: BiomeId): NormalCampaignNode[] {
  return NORMAL_NODES.filter((node) => node.biomeId === biomeId);
}

export function getBossForBiome(biomeId: BiomeId): BossCampaignNode {
  return BOSS_NODES.find((node) => node.biomeId === biomeId)!;
}

export function isNodeVisible(state: ProgressionState, nodeId: CampaignNodeId): boolean {
  void state;
  void nodeId;
  return true;
}

export function isNodeAvailable(state: ProgressionState, nodeId: CampaignNodeId): boolean {
  const node = getCampaignNode(nodeId);
  if (!isNodeVisible(state, nodeId)) return false;
  if (node.type === "boss") return state.bosses[node.id].revealed && !state.bosses[node.id].defeated;
  if (node.biomeId === "biome_02" && !state.bosses.biome_01_boss.defeated) return false;
  const biomePoints = getNormalPointsForBiome(node.biomeId);
  const index = biomePoints.findIndex((candidate) => candidate.id === node.id);
  return index === 0 || state.points[biomePoints[index - 1].id].cleared;
}

export function isNodeCompleted(state: ProgressionState, nodeId: CampaignNodeId): boolean {
  const node = getCampaignNode(nodeId);
  return node.type === "boss" ? state.bosses[node.id].defeated : state.points[node.id].cleared;
}

export function countClearedPoints(state: ProgressionState, biomeId?: BiomeId): number {
  return NORMAL_NODES.filter((node) => (!biomeId || node.biomeId === biomeId) && state.points[node.id].cleared).length;
}

export function recordNormalVictory(state: ProgressionState, pointId: NormalPointId): { state: ProgressionState; firstClear: boolean; farm: boolean } {
  const point = state.points[pointId];
  if (!point) return { state, firstClear: false, farm: false };
  if (point.cleared) return { state, firstClear: false, farm: true };

  const defeatedEnemies = Math.min(ENEMIES_PER_POINT, point.defeatedEnemies + 1);
  const firstClear = defeatedEnemies === ENEMIES_PER_POINT;
  const points = {
    ...state.points,
    [pointId]: {
      defeatedEnemies,
      cleared: firstClear,
      firstClearRewardGranted: firstClear,
    },
  };
  const next: ProgressionState = { ...state, points };
  const node = getCampaignNode(pointId) as NormalCampaignNode;
  const biomePoints = getNormalPointsForBiome(node.biomeId);
  const allCleared = biomePoints.every((candidate) => points[candidate.id].cleared);
  if (!allCleared) return { state: next, firstClear, farm: false };

  const boss = getBossForBiome(node.biomeId);
  return {
    state: {
      ...next,
      bosses: {
        ...next.bosses,
        [boss.id]: { ...next.bosses[boss.id], revealed: true },
      },
    },
    firstClear,
    farm: false,
  };
}

export function startBossAttempt(state: ProgressionState, bossId: BossPointId): ProgressionState {
  const boss = state.bosses[bossId];
  if (!boss.revealed || boss.defeated) return state;
  return {
    ...state,
    bosses: {
      ...state.bosses,
      [bossId]: { ...boss, attempts: boss.attempts + 1, lastFailureReason: null },
    },
  };
}

export function failBossAttempt(state: ProgressionState, bossId: BossPointId, reason: BossFailureReason): ProgressionState {
  const boss = state.bosses[bossId];
  if (!boss.revealed || boss.defeated) return state;
  return {
    ...state,
    bosses: {
      ...state.bosses,
      [bossId]: { ...boss, lastFailureReason: reason },
    },
  };
}

export function defeatBoss(state: ProgressionState, bossId: BossPointId): ProgressionState {
  const boss = state.bosses[bossId];
  if (!boss.revealed || boss.defeated) return state;
  const bosses = {
    ...state.bosses,
    [bossId]: { ...boss, defeated: true, rewardGranted: true, lastFailureReason: null },
  };
  return {
    ...state,
    bosses,
    prototypeCompleted: bossId === "biome_02_boss" || state.prototypeCompleted,
    completionScreenDismissed: bossId === "biome_02_boss" ? false : state.completionScreenDismissed,
  };
}

export function dismissCompletionScreen(state: ProgressionState): ProgressionState {
  if (!state.prototypeCompleted) return state;
  return { ...state, completionScreenDismissed: true };
}

export function normalizeProgression(value: unknown): ProgressionState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<ProgressionState>;
  const rawVersion = Number((value as { version?: unknown }).version);
  if ((rawVersion !== 1 && rawVersion !== PROGRESSION_STATE_VERSION) || !raw.points || !raw.bosses) return null;

  const initial = createInitialProgression();
  const points = { ...initial.points };
  for (const node of NORMAL_NODES) {
    const candidate = raw.points[node.id];
    if (!candidate || typeof candidate !== "object") return null;
    const defeatedEnemies = clampInteger(candidate.defeatedEnemies, 0, ENEMIES_PER_POINT);
    const cleared = candidate.cleared === true || defeatedEnemies === ENEMIES_PER_POINT;
    points[node.id] = {
      defeatedEnemies: cleared ? ENEMIES_PER_POINT : defeatedEnemies,
      cleared,
      firstClearRewardGranted: cleared && candidate.firstClearRewardGranted === true,
    };
  }

  const bosses = { ...initial.bosses };
  for (const node of BOSS_NODES) {
    const candidate = raw.bosses[node.id];
    if (!candidate || typeof candidate !== "object") return null;
    const allCleared = getNormalPointsForBiome(node.biomeId).every((point) => points[point.id].cleared);
    if (candidate.defeated === true && !allCleared) return null;
    const defeated = candidate.defeated === true;
    bosses[node.id] = {
      revealed: allCleared,
      defeated,
      attempts: clampInteger(candidate.attempts, 0, Number.MAX_SAFE_INTEGER),
      rewardGranted: defeated && candidate.rewardGranted === true,
      lastFailureReason: isBossFailureReason(candidate.lastFailureReason) ? candidate.lastFailureReason : null,
    };
  }

  const biomeOnePoints = getNormalPointsForBiome("biome_01");
  const biomeTwoPoints = getNormalPointsForBiome("biome_02");
  if (!isSequential(points, biomeOnePoints)) return null;
  if (!bosses.biome_01_boss.defeated && biomeTwoPoints.some((node) => points[node.id].defeatedEnemies > 0)) return null;
  if (!isSequential(points, biomeTwoPoints)) return null;

  return {
    version: PROGRESSION_STATE_VERSION,
    points,
    bosses,
    prototypeCompleted: bosses.biome_02_boss.defeated,
    completionScreenDismissed: bosses.biome_02_boss.defeated && raw.completionScreenDismissed === true,
  };
}

export function getNextGoal(state: ProgressionState): string {
  for (const biomeId of ["biome_01", "biome_02"] as const) {
    if (biomeId === "biome_02" && !state.bosses.biome_01_boss.defeated) break;
    const nextPoint = getNormalPointsForBiome(biomeId).find((node) => !state.points[node.id].cleared);
    if (nextPoint) return `Очистите: ${nextPoint.name}`;
    const boss = getBossForBiome(biomeId);
    if (!state.bosses[boss.id].defeated) return `Победите: ${boss.name}`;
  }
  return "Прототип завершён — можно вернуться к фарму";
}

export function getDefaultFarmPoint(state: ProgressionState): NormalPointId {
  const cleared = [...NORMAL_NODES].reverse().find((node) => state.points[node.id].cleared);
  return cleared?.id ?? "biome_01_point_01";
}

function isSequential(points: Record<NormalPointId, PointProgress>, nodes: NormalCampaignNode[]): boolean {
  let previousCleared = true;
  for (const node of nodes) {
    const point = points[node.id];
    if (!previousCleared && (point.defeatedEnemies > 0 || point.cleared)) return false;
    previousCleared = point.cleared;
  }
  return true;
}

function isBossFailureReason(value: unknown): value is BossFailureReason {
  return value === "time_expired" || value === "manual_exit" || value === "session_interrupted";
}

function clampInteger(value: unknown, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(max, Math.max(min, Math.floor(numeric)));
}
