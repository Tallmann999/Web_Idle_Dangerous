import type { CampaignElement, ProgressionState } from "./progression";

export type WeaponId = "gray_weapon" | "purple_weapon" | "blue_weapon";
export type WeaponAffinity = CampaignElement | "neutral";

export type WeaponDefinition = {
  id: WeaponId;
  name: string;
  shortName: string;
  affinity: WeaponAffinity;
  color: string;
  unlockHint: string;
};

export const WEAPON_ORDER: WeaponId[] = ["gray_weapon", "purple_weapon", "blue_weapon"];

export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  gray_weapon: {
    id: "gray_weapon",
    name: "СЕРАЯ ПУШКА",
    shortName: "СЕРАЯ",
    affinity: "neutral",
    color: "#aeb7b2",
    unlockHint: "ДОСТУПНА СО СТАРТА",
  },
  purple_weapon: {
    id: "purple_weapon",
    name: "ФИОЛЕТОВАЯ ПУШКА",
    shortName: "ФИОЛЕТОВАЯ",
    affinity: "bio",
    color: "#a85cff",
    unlockHint: "ПОБЕДИТЕ БОССА ЛЕСА",
  },
  blue_weapon: {
    id: "blue_weapon",
    name: "ГОЛУБАЯ ПУШКА",
    shortName: "ГОЛУБАЯ",
    affinity: "crystal",
    color: "#39a7ff",
    unlockHint: "ПОБЕДИТЕ БОССА ВЫСОТ",
  },
};

export function getUnlockedWeaponIds(
  progression: ProgressionState,
  acknowledgedWeaponIds: readonly WeaponId[] = WEAPON_ORDER,
): WeaponId[] {
  const unlocked: WeaponId[] = ["gray_weapon"];
  if (progression.bosses.biome_01_boss.defeated && acknowledgedWeaponIds.includes("purple_weapon")) unlocked.push("purple_weapon");
  if (progression.bosses.biome_02_boss.defeated && acknowledgedWeaponIds.includes("blue_weapon")) unlocked.push("blue_weapon");
  return unlocked;
}

export function isWeaponUnlocked(
  progression: ProgressionState,
  acknowledgedWeaponIds: readonly WeaponId[],
  weaponId: WeaponId,
): boolean {
  return getUnlockedWeaponIds(progression, acknowledgedWeaponIds).includes(weaponId);
}

export function getWeaponAffinityMultiplier(weaponId: WeaponId, targetElement: CampaignElement): number {
  const affinity = WEAPONS[weaponId].affinity;
  return affinity !== "neutral" && affinity === targetElement ? 2 : 0.75;
}

export function calculateManualWeaponDamage(
  weaponId: WeaponId,
  targetElement: CampaignElement,
  baseClickDamage: number,
): number {
  return Math.max(1, Math.round(baseClickDamage * getWeaponAffinityMultiplier(weaponId, targetElement)));
}

export function calculateArsenalAutoDamage(
  unlockedWeaponIds: readonly WeaponId[],
  targetElement: CampaignElement,
  baseDamagePerWeapon: number,
): number {
  if (baseDamagePerWeapon <= 0 || unlockedWeaponIds.length === 0) return 0;
  const total = unlockedWeaponIds.reduce((sum, weaponId) => (
    sum + baseDamagePerWeapon * getWeaponAffinityMultiplier(weaponId, targetElement)
  ), 0);
  return Math.max(1, Math.round(total));
}

export function normalizeSelectedWeapon(
  value: unknown,
  progression: ProgressionState,
  acknowledgedWeaponIds: readonly WeaponId[] = WEAPON_ORDER,
): WeaponId {
  const migrated = value === "bio" ? "purple_weapon"
    : value === "crystal" ? "blue_weapon"
      : value === "purge" ? "gray_weapon"
        : value;
  return WEAPON_ORDER.includes(migrated as WeaponId) && isWeaponUnlocked(progression, acknowledgedWeaponIds, migrated as WeaponId)
    ? migrated as WeaponId
    : "gray_weapon";
}

export function normalizePresentedWeaponUnlocks(value: unknown): WeaponId[] {
  if (!Array.isArray(value)) return [];
  return WEAPON_ORDER.filter((weaponId) => weaponId !== "gray_weapon" && value.includes(weaponId));
}

export function getNextWeaponUnlockPresentation(
  progression: ProgressionState,
  presentedWeaponIds: readonly WeaponId[],
): WeaponId | null {
  if (progression.bosses.biome_01_boss.defeated && !presentedWeaponIds.includes("purple_weapon")) {
    return "purple_weapon";
  }
  if (progression.bosses.biome_02_boss.defeated && !presentedWeaponIds.includes("blue_weapon")) {
    return "blue_weapon";
  }
  return null;
}
