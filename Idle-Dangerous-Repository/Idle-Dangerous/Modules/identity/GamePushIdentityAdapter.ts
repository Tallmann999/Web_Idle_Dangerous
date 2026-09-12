import type { GamePushSdkGetter } from "../gamepush/contracts";
import type { IdentityAdapter, PlayerIdentity } from "./types";

export class GamePushIdentityAdapter implements IdentityAdapter {
  readonly name = "gamepush" as const;

  constructor(private readonly getSdk: GamePushSdkGetter) {}

  async getCurrent(): Promise<PlayerIdentity> {
    const player = this.getSdk()?.player;
    return {
      platform: this.name,
      authenticated: Boolean(player?.isLoggedIn),
      playerId: player?.id === undefined ? undefined : String(player.id),
      displayName: player?.name,
      avatarUrl: player?.avatar,
    };
  }

  async login(): Promise<PlayerIdentity> {
    await this.getSdk()?.player?.login?.();
    return this.getCurrent();
  }
}
