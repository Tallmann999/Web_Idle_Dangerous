export const ICE_RAIN_WEAPON_ID = "blue_weapon";
export const ICE_RAIN_UPGRADE_ID = "blue_150";
export const ICE_RAIN_DURATION_SEC = 15;
export const ICE_RAIN_COOLDOWN_SEC = 10 * 60;
export const ICE_RAIN_PROJECTILES_PER_VOLLEY = 3;
export const ICE_RAIN_PROJECTILES_PER_SECOND = 5.5 * ICE_RAIN_PROJECTILES_PER_VOLLEY;
export const ICE_RAIN_INTERVAL_MS = Math.round(1000 * ICE_RAIN_PROJECTILES_PER_VOLLEY / ICE_RAIN_PROJECTILES_PER_SECOND);
export const ICE_RAIN_PROJECTILE_TRAVEL_MS = 240;

export type IceRainActivation = {
  activeUntil: number;
  cooldownUntil: number;
};

export function isIceRainUnlocked(purchasedUpgradeIds: readonly string[]): boolean {
  return purchasedUpgradeIds.includes(ICE_RAIN_UPGRADE_ID);
}

export function createIceRainActivation(now: number): IceRainActivation {
  const activeUntil = now + ICE_RAIN_DURATION_SEC * 1000;
  return {
    activeUntil,
    cooldownUntil: activeUntil + ICE_RAIN_COOLDOWN_SEC * 1000,
  };
}

export function canActivateIceRain(
  unlocked: boolean,
  activeUntil: number,
  cooldownUntil: number,
  now: number,
): boolean {
  return unlocked && activeUntil <= now && cooldownUntil <= now;
}
