import type { BossFailureReason } from "./progression.ts";

export const BOSS_BOOST_DURATION_SEC = 15;
export const BOSS_BOOST_MAX_USES_PER_SESSION = 3;
export const TEST_REWARDED_AD_DURATION_MS = 2_000;
export const BOSS_HP_MULTIPLIER = 20;

export function getBossBoostDamageMultiplier(timeLeft: number): number {
  return timeLeft > 0 ? 2 : 1;
}

export function canUseBossBoost(usesThisSession: number, boostTimeLeft: number): boolean {
  return usesThisSession < BOSS_BOOST_MAX_USES_PER_SESSION && boostTimeLeft <= 0;
}

export function getBossFailureCopy(reason: BossFailureReason): string {
  if (reason === "manual_exit") return "ПОПЫТКА ПРЕРВАНА — БОСС ВОССТАНОВИЛ ЗДОРОВЬЕ";
  if (reason === "session_interrupted") return "НЕЗАВЕРШЁННАЯ ПОПЫТКА СБРОШЕНА — БОСС ВОССТАНОВИЛ ЗДОРОВЬЕ";
  return "ВРЕМЯ ВЫШЛО — БОСС ВОССТАНОВИЛ ЗДОРОВЬЕ";
}
