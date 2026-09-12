export const MANUAL_AUTO_RESUME_DELAY_MS = 2_000;
export const TRAINING_ACTIVE_SECONDS = 15;
export const TRAINING_CLICKS_PER_SECOND = 5;
export const TRAINING_MIN_HP = 250;

export function getAutoResumeAt(manualAttackAt: number): number {
  return manualAttackAt + MANUAL_AUTO_RESUME_DELAY_MS;
}

export function getAutoResumeRemainingMs(autoResumeAt: number | null, now: number): number {
  if (autoResumeAt === null) return 0;
  return Math.max(0, autoResumeAt - now);
}

export function isForegroundAutoPaused(autoResumeAt: number | null, now: number): boolean {
  return getAutoResumeRemainingMs(autoResumeAt, now) > 0;
}

export function calculateTrainingEnemyHp(manualDamage: number, autoDamagePerSecond: number): number {
  const safeManualDamage = Number.isFinite(manualDamage) ? Math.max(0, manualDamage) : 0;
  const safeAutoDamage = Number.isFinite(autoDamagePerSecond) ? Math.max(0, autoDamagePerSecond) : 0;
  const activeDamagePerSecond = safeManualDamage * TRAINING_CLICKS_PER_SECOND + safeAutoDamage;
  return Math.max(TRAINING_MIN_HP, Math.ceil(activeDamagePerSecond * TRAINING_ACTIVE_SECONDS));
}
