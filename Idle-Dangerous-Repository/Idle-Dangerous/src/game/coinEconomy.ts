import { FARM_REWARD_MULTIPLIER } from "./progression.ts";

// Числа временные и принадлежат prototype_balance; этот модуль фиксирует единый поток монет.
export const BASE_ENEMY_COINS = 14;
export const ENEMY_COIN_GROWTH = 1.15;
export const BOSS_COIN_REWARD_MULTIPLIER = 8;
export const CORRUPTED_ENEMY_COIN_MULTIPLIER = 1.5;

export function calculateBaseEnemyCoins(campaignIndex: number): number {
  return Math.round(BASE_ENEMY_COINS * Math.pow(ENEMY_COIN_GROWTH, campaignIndex));
}

export function calculateEnemyCoins(baseCoins: number, farm: boolean, corrupted = false): number {
  const corruptionMultiplier = corrupted ? CORRUPTED_ENEMY_COIN_MULTIPLIER : 1;
  return Math.round(baseCoins * (farm ? FARM_REWARD_MULTIPLIER : 1) * corruptionMultiplier);
}

export function calculateBossCoins(baseCoins: number): number {
  return Math.round(baseCoins * BOSS_COIN_REWARD_MULTIPLIER);
}
