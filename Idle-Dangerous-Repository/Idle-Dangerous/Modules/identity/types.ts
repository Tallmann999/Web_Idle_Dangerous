export interface PlayerIdentity {
  platform: "local" | "gamepush" | "poki";
  authenticated: boolean;
  playerId?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface IdentityAdapter {
  readonly name: PlayerIdentity["platform"];
  getCurrent(): Promise<PlayerIdentity>;
  login(): Promise<PlayerIdentity>;
  getAccessToken?(): Promise<string | null>;
}
