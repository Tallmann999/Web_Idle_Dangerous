import { readLocalStorage, writeLocalStorage } from "../storage/safeLocalStorage";
import type { IdentityAdapter, PlayerIdentity } from "./types";

export class LocalIdentityAdapter implements IdentityAdapter {
  readonly name = "local" as const;

  constructor(private readonly storageKey: string) {}

  async getCurrent(): Promise<PlayerIdentity> {
    return { platform: this.name, authenticated: false, playerId: this.getOrCreateId() };
  }

  login(): Promise<PlayerIdentity> {
    return this.getCurrent();
  }

  private getOrCreateId(): string {
    const stored = readLocalStorage(this.storageKey);
    if (stored) return stored;
    const id = globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    writeLocalStorage(this.storageKey, id);
    return id;
  }
}
