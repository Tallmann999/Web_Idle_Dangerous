import type { IdentityAdapter, PlayerIdentity } from "./types";

export class IdentityModule {
  constructor(private readonly adapter: IdentityAdapter) {}

  get platform(): PlayerIdentity["platform"] {
    return this.adapter.name;
  }

  getCurrent(): Promise<PlayerIdentity> {
    return this.adapter.getCurrent();
  }

  login(): Promise<PlayerIdentity> {
    return this.adapter.login();
  }

  getAccessToken(): Promise<string | null> {
    return this.adapter.getAccessToken?.() ?? Promise.resolve(null);
  }
}
