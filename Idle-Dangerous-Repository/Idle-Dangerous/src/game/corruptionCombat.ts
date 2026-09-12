import type { CampaignElement } from "./progression.ts";
import { WEAPONS, type WeaponId } from "./weaponArsenal.ts";

export const MATCHED_PHASE_DAMAGE_MULTIPLIER = 2;
export const MISMATCHED_PHASE_DAMAGE_MULTIPLIER = 0.75;
export const LIGHT_CORRUPTION_HP_RATIO = 0.35;
export const HEAVY_CORRUPTION_HP_RATIO = 0.65;

export type CombatPhase = "corruption" | "body";

export type PhaseVitals = {
  bodyHp: number;
  corruptionHp: number;
};

export type PhaseDamageResult = PhaseVitals & {
  appliedDamage: number;
  phaseBeforeHit: CombatPhase;
  corruptionBroken: boolean;
  defeated: boolean;
};

export function getCombatPhase(corruptionHp: number): CombatPhase {
  return corruptionHp > 0 ? "corruption" : "body";
}

export function getPhaseBonusWeaponId(
  phase: CombatPhase,
  corruptionElement: CampaignElement | null,
): WeaponId | null {
  if (phase === "body") return "gray_weapon";
  if (corruptionElement === "bio") return "purple_weapon";
  if (corruptionElement === "crystal") return "blue_weapon";
  return null;
}

export function getWeaponPhaseMultiplier(
  weaponId: WeaponId,
  phase: CombatPhase,
  corruptionElement: CampaignElement | null,
): number {
  const affinity = WEAPONS[weaponId].affinity;
  if (phase === "body") return affinity === "neutral"
    ? MATCHED_PHASE_DAMAGE_MULTIPLIER
    : MISMATCHED_PHASE_DAMAGE_MULTIPLIER;
  return affinity !== "neutral" && affinity === corruptionElement
    ? MATCHED_PHASE_DAMAGE_MULTIPLIER
    : MISMATCHED_PHASE_DAMAGE_MULTIPLIER;
}

export function calculateManualPhaseDamage(
  weaponId: WeaponId,
  phase: CombatPhase,
  corruptionElement: CampaignElement | null,
  baseClickDamage: number,
): number {
  return Math.max(1, Math.round(baseClickDamage * getWeaponPhaseMultiplier(weaponId, phase, corruptionElement)));
}

export function calculateArsenalPhaseDamage(
  unlockedWeaponIds: readonly WeaponId[],
  phase: CombatPhase,
  corruptionElement: CampaignElement | null,
  baseDamagePerWeapon: number,
): number {
  if (baseDamagePerWeapon <= 0 || unlockedWeaponIds.length === 0) return 0;
  const total = unlockedWeaponIds.reduce((sum, weaponId) => (
    sum + baseDamagePerWeapon * getWeaponPhaseMultiplier(weaponId, phase, corruptionElement)
  ), 0);
  return Math.max(1, Math.round(total));
}

export function applyPhaseDamage(vitals: PhaseVitals, damage: number): PhaseDamageResult {
  const normalizedDamage = Math.max(0, damage);
  const phaseBeforeHit = getCombatPhase(vitals.corruptionHp);
  if (phaseBeforeHit === "corruption") {
    const appliedDamage = Math.min(vitals.corruptionHp, normalizedDamage);
    const corruptionHp = Math.max(0, vitals.corruptionHp - normalizedDamage);
    return {
      bodyHp: vitals.bodyHp,
      corruptionHp,
      appliedDamage,
      phaseBeforeHit,
      corruptionBroken: vitals.corruptionHp > 0 && corruptionHp === 0,
      defeated: false,
    };
  }

  const appliedDamage = Math.min(vitals.bodyHp, normalizedDamage);
  const bodyHp = Math.max(0, vitals.bodyHp - normalizedDamage);
  return {
    bodyHp,
    corruptionHp: 0,
    appliedDamage,
    phaseBeforeHit,
    corruptionBroken: false,
    defeated: bodyHp === 0,
  };
}

export function calculateCorruptionHp(bodyHp: number, enemyId: string): number {
  const numericId = Number(enemyId.match(/\d+/)?.[0] ?? 0);
  const ratio = numericId % 2 === 0 ? HEAVY_CORRUPTION_HP_RATIO : LIGHT_CORRUPTION_HP_RATIO;
  return Math.max(1, Math.round(bodyHp * ratio));
}
