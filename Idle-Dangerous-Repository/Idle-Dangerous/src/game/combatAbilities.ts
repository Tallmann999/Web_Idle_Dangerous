export type CombatAbilityId = "abyss" | "wolf";
export type CombatAbilityTimer = { activeUntil: number; cooldownUntil: number; nextHitAt: number };
export type CombatAbilityTimers = Record<CombatAbilityId, CombatAbilityTimer>;

export const COMBAT_ABILITIES = {
  abyss: { weaponId: "void_weapon", upgradeId: "void_150", name: "Бездна", durationSec: 12, cooldownSec: 600, intervalMs: 250, dpsPerHit: 1, hitsPerVolley: 10 },
  wolf: { weaponId: "relic_weapon", upgradeId: "relic_150", name: "Призыв волка", durationSec: 20, cooldownSec: 180, intervalMs: 200, dpsPerHit: 2, hitsPerVolley: 1 },
} as const;

export function emptyCombatAbilities(): CombatAbilityTimers {
  return { abyss: { activeUntil: 0, cooldownUntil: 0, nextHitAt: 0 }, wolf: { activeUntil: 0, cooldownUntil: 0, nextHitAt: 0 } };
}

export function activateCombatAbility(id: CombatAbilityId, timer: CombatAbilityTimer, unlocked: boolean, now: number): CombatAbilityTimer {
  if (!unlocked || timer.activeUntil > now || timer.cooldownUntil > now) return timer;
  const spec = COMBAT_ABILITIES[id];
  const activeUntil = now + spec.durationSec * 1000;
  return { activeUntil, cooldownUntil: activeUntil + spec.cooldownSec * 1000, nextHitAt: now + spec.intervalMs };
}

// At most two hits can be due in one combat heartbeat. Long pauses never cause
// an offline burst, but fractional intervals and the final hit are preserved.
export function consumeCombatAbilityHits(id: CombatAbilityId, timer: CombatAbilityTimer, now: number, canAttack: boolean): { timer: CombatAbilityTimer; hits: number } {
  const interval = COMBAT_ABILITIES[id].intervalMs;
  if (!timer.nextHitAt || timer.nextHitAt > timer.activeUntil || timer.nextHitAt > now) return { timer, hits: 0 };
  const lastDueAt = Math.min(now, timer.activeUntil);
  const due = Math.floor((lastDueAt - timer.nextHitAt) / interval) + 1;
  const nextHitAt = timer.nextHitAt + due * interval;
  return { timer: { ...timer, nextHitAt }, hits: canAttack && now - timer.nextHitAt < 500 ? Math.min(2, due) : 0 };
}

export function normalizeCombatAbilities(value: unknown): CombatAbilityTimers {
  const result = emptyCombatAbilities();
  if (!value || typeof value !== "object") return result;
  for (const id of ["abyss", "wolf"] as const) {
    const candidate = (value as Record<string, unknown>)[id];
    if (!candidate || typeof candidate !== "object") continue;
    for (const key of ["activeUntil", "cooldownUntil", "nextHitAt"] as const) {
      const number = Number((candidate as Record<string, unknown>)[key]);
      result[id][key] = Number.isFinite(number) && number >= 0 ? number : 0;
    }
  }
  return result;
}
