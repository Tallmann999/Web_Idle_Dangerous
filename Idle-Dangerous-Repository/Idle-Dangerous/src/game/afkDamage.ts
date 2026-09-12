import { getGlobalClickDamage, getTotalArsenalDps, type GameStateV3 } from "./clickerV3.ts";
import { COMBAT_ABILITIES } from "./combatAbilities.ts";
import { ICE_RAIN_INTERVAL_MS, ICE_RAIN_PROJECTILES_PER_VOLLEY } from "./iceRainAbility.ts";

/** Account for active effects only during their remaining lifetime, without replaying their VFX. */
export function getAfkDamage(state: GameStateV3, from: number, to: number): number {
  if (to <= from) return 0;
  const dps = getTotalArsenalDps(state);
  const boostedMs = Math.max(0, Math.min(to, state.dpsBoostUntil) - from);
  let damage = dps * (to - from + boostedMs) / 1000;
  for (const id of ["abyss", "wolf"] as const) {
    const spec = COMBAT_ABILITIES[id];
    const timer = state.combatAbilities[id];
    if (!state.weapons[spec.weaponId].purchasedUpgradeIds.includes(spec.upgradeId) || !timer.nextHitAt) continue;
    const first = Math.max(timer.nextHitAt, timer.nextHitAt + Math.max(0, Math.floor((from - timer.nextHitAt) / spec.intervalMs) + 1) * spec.intervalMs);
    const countThrough = (end: number) => Math.max(0, Math.floor((Math.min(end, timer.activeUntil) - first) / spec.intervalMs) + 1);
    const hits = countThrough(to);
    const boostedHits = countThrough(Math.min(to, state.dpsBoostUntil - 1));
    damage += (hits + boostedHits) * spec.hitsPerVolley * spec.dpsPerHit * dps;
  }
  if (state.weapons.blue_weapon.purchasedUpgradeIds.includes("blue_150")) {
    const iceMs = Math.max(0, Math.min(to, state.iceRainActiveUntil) - from);
    damage += iceMs / ICE_RAIN_INTERVAL_MS * ICE_RAIN_PROJECTILES_PER_VOLLEY * getGlobalClickDamage(state);
  }
  return damage;
}
