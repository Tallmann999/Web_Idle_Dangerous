import type { WeaponMasteryMilestone } from "./weaponProgression.ts";

export const SUPERCLICK_UNLOCK_MILESTONE = 25;
export const SUPERCLICK_RATE_PER_SECOND = 10;
export const SUPERCLICK_AD_DURATION_SEC = 2;
export const SUPERCLICK_DURATION_SEC = 3 * 60;
export const SUPERCLICK_COOLDOWN_SEC = 10 * 60;
export const SUPERCLICK_INTERVAL_MS = 1000 / SUPERCLICK_RATE_PER_SECOND;

export type SuperclickActivation = {
  activeUntil: number;
  cooldownUntil: number;
};

export function isSuperclickUnlocked(purchasedMilestones: readonly WeaponMasteryMilestone[]): boolean {
  return purchasedMilestones.includes(SUPERCLICK_UNLOCK_MILESTONE);
}

export function createSuperclickActivation(now: number): SuperclickActivation {
  const activeUntil = now + SUPERCLICK_DURATION_SEC * 1000;
  return {
    activeUntil,
    cooldownUntil: activeUntil + SUPERCLICK_COOLDOWN_SEC * 1000,
  };
}

export function isSuperclickActive(activeUntil: number, now: number): boolean {
  return activeUntil > now;
}

export function getSuperclickRemainingSec(until: number, now: number): number {
  return Math.max(0, Math.ceil((until - now) / 1000));
}

export function canActivateSuperclick(
  unlocked: boolean,
  activeUntil: number,
  cooldownUntil: number,
  now: number,
): boolean {
  return unlocked && !isSuperclickActive(activeUntil, now) && cooldownUntil <= now;
}

export function normalizeSuperclickTimestamp(value: unknown, now: number, maxFutureSec: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= now) return 0;
  return Math.min(Math.floor(numeric), now + maxFutureSec * 1000);
}
