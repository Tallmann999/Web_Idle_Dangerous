export type GamePushValue = string | number | boolean;

export interface GamePushPlayerLike {
  ready?: Promise<unknown>;
  isLoggedIn?: boolean;
  id?: string | number;
  name?: string;
  avatar?: string;
  get?(key: string): GamePushValue | undefined;
  set?(key: string, value: GamePushValue): void;
  sync?(options?: Record<string, unknown>): Promise<unknown>;
  login?(options?: Record<string, unknown>): Promise<boolean>;
}

export interface GamePushAnalyticsLike {
  goal?(event: string, value: GamePushValue | Record<string, unknown>): void;
}

export interface GamePushLeaderboardLike {
  publishRecord?(query: Record<string, unknown>): Promise<unknown>;
  fetch?(query?: Record<string, unknown>): Promise<unknown>;
  fetchPlayerRating?(query?: Record<string, unknown>): Promise<unknown>;
  open?(query?: Record<string, unknown>): Promise<void>;
}

export interface GamePushSdkLike {
  analytics?: GamePushAnalyticsLike;
  player?: GamePushPlayerLike;
  leaderboard?: GamePushLeaderboardLike;
  platform?: {
    tag?: string;
    isSupportsCloudSaves?: boolean;
  };
  serverTime?: string;
}

export type GamePushSdkGetter = () => GamePushSdkLike | null;
