import { WEAPON_ORDER, type WeaponId } from "./weaponArsenal.ts";

export const WEAPON_LEVEL_CAP = 999;
export const WEAPON_SPECIALIZATION_LEVEL = 150;
export const WEAPON_MILESTONE_DAMAGE_MULTIPLIER = 2;
export const WEAPON_MASTERY_MILESTONES = [10, 25, 50, 100, 150] as const;

export type WeaponMasteryMilestone = typeof WEAPON_MASTERY_MILESTONES[number];
export type WeaponLevels = Record<WeaponId, number>;
export type WeaponMilestonePurchases = Record<WeaponId, WeaponMasteryMilestone[]>;

const WEAPON_LEVEL_BASE_COST: Record<WeaponId, number> = {
  gray_weapon: 12,
  purple_weapon: 30,
  blue_weapon: 75,
};

export function createInitialWeaponLevels(): WeaponLevels {
  return { gray_weapon: 1, purple_weapon: 1, blue_weapon: 1 };
}

export function createInitialWeaponMilestones(): WeaponMilestonePurchases {
  return { gray_weapon: [], purple_weapon: [], blue_weapon: [] };
}

export function normalizeWeaponLevels(value: unknown): WeaponLevels {
  const source = value && typeof value === "object" ? value as Partial<Record<WeaponId, unknown>> : {};
  const initial = createInitialWeaponLevels();
  return Object.fromEntries(WEAPON_ORDER.map((weaponId) => {
    const numeric = Number(source[weaponId]);
    const level = Number.isFinite(numeric) ? Math.floor(numeric) : initial[weaponId];
    return [weaponId, Math.max(1, Math.min(WEAPON_LEVEL_CAP, level))];
  })) as WeaponLevels;
}

export function normalizeWeaponMilestones(value: unknown, levels: WeaponLevels): WeaponMilestonePurchases {
  const source = value && typeof value === "object"
    ? value as Partial<Record<WeaponId, unknown>>
    : {};
  return Object.fromEntries(WEAPON_ORDER.map((weaponId) => {
    const purchased = Array.isArray(source[weaponId]) ? source[weaponId] : [];
    return [weaponId, WEAPON_MASTERY_MILESTONES.filter((milestone) => (
      milestone <= levels[weaponId] && purchased.includes(milestone)
    ))];
  })) as WeaponMilestonePurchases;
}

export function getWeaponLevelCost(weaponId: WeaponId, currentLevel: number): number {
  const level = Math.max(1, Math.min(WEAPON_LEVEL_CAP, Math.floor(currentLevel)));
  return Math.round(WEAPON_LEVEL_BASE_COST[weaponId] * Math.pow(1.075, level - 1));
}

export function getWeaponPowerMultiplier(level: number, purchasedMilestones: readonly number[]): number {
  const safeLevel = Math.max(1, Math.min(WEAPON_LEVEL_CAP, Math.floor(level)));
  const masteryMultiplier = Math.pow(WEAPON_MILESTONE_DAMAGE_MULTIPLIER, purchasedMilestones.length);
  return safeLevel * masteryMultiplier;
}

export function getAvailableWeaponMilestone(
  level: number,
  purchasedMilestones: readonly number[],
): WeaponMasteryMilestone | null {
  return WEAPON_MASTERY_MILESTONES.find((milestone) => (
    milestone <= level && !purchasedMilestones.includes(milestone)
  )) ?? null;
}

export function getNextWeaponMilestone(
  level: number,
  purchasedMilestones: readonly number[],
): WeaponMasteryMilestone | null {
  return WEAPON_MASTERY_MILESTONES.find((milestone) => (
    milestone > level || !purchasedMilestones.includes(milestone)
  )) ?? null;
}

export function getWeaponMilestoneCost(weaponId: WeaponId, milestone: WeaponMasteryMilestone): number {
  const milestoneIndex = WEAPON_MASTERY_MILESTONES.indexOf(milestone);
  return Math.round(getWeaponLevelCost(weaponId, milestone) * (2 + milestoneIndex));
}
