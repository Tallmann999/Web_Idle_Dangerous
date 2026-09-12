import type { SaveAdapter, SaveEnvelope } from "./types";
import { readLocalStorage, removeLocalStorage, writeLocalStorage } from "../storage/safeLocalStorage";

export class LocalSaveAdapter implements SaveAdapter {
  readonly name = "local";

  constructor(private readonly storageKey: string) {}

  load(): unknown {
    const raw = readLocalStorage(this.storageKey);
    return raw ? JSON.parse(raw) : null;
  }

  save(value: SaveEnvelope): void {
    writeLocalStorage(this.storageKey, JSON.stringify(value));
  }

  clear(): void {
    removeLocalStorage(this.storageKey);
  }
}
