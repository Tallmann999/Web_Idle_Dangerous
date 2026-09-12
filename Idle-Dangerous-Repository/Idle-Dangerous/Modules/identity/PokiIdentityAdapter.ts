import type { PokiSdkGetter } from "../poki/contracts";
import type { IdentityAdapter, PlayerIdentity } from "./types";

export class PokiIdentityAdapter implements IdentityAdapter {
  readonly name = "poki" as const;

  constructor(private readonly getSdk: PokiSdkGetter) {}

  async getCurrent(): Promise<PlayerIdentity> {
    try {
      const user = await this.getSdk()?.getUser?.();
      return {
        platform: this.name,
        authenticated: Boolean(user),
        displayName: user?.username,
        avatarUrl: user?.avatarUrl,
      };
    } catch {
      return { platform: this.name, authenticated: false };
    }
  }

  async login(): Promise<PlayerIdentity> {
    await this.getSdk()?.login?.();
    return this.getCurrent();
  }

  async getAccessToken(): Promise<string | null> {
    try {
      return await this.getSdk()?.getToken?.() ?? null;
    } catch {
      return null;
    }
  }
}
