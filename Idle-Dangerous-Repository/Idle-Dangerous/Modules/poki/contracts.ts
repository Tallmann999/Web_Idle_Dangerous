export interface PokiUserLike {
  username: string;
  avatarUrl: string;
}

export interface PokiSdkLike {
  init?(): Promise<unknown>;
  gameLoadingFinished?(): void;
  gameplayStart?(): void;
  gameplayStop?(): void;
  commercialBreak?(onStart?: () => void): Promise<unknown>;
  rewardedBreak?(onStart?: () => void): Promise<boolean>;
  measure?(category: string, what: string, action: string): void;
  login?(): Promise<void>;
  getUser?(): Promise<PokiUserLike | null>;
  getToken?(): Promise<string | null>;
}

export type PokiSdkGetter = () => PokiSdkLike | null;
