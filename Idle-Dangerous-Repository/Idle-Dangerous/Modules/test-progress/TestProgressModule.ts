import { readLocalStorage, writeLocalStorage } from "../storage/safeLocalStorage.ts";
import type { TestProgressCartridge } from "./types.ts";

export class TestProgressModule {
  private readonly storageKey: string;
  private readonly schemaVersion: number;

  constructor(
    storageKey: string,
    schemaVersion: number,
  ) {
    if (!storageKey.trim()) throw new Error("TestProgressModule requires a storage key");
    this.storageKey = storageKey;
    this.schemaVersion = schemaVersion;
  }

  save<T>(data: T): TestProgressCartridge<T> {
    const cartridge: TestProgressCartridge<T> = {
      format: "portable_test_progress_v1",
      schemaVersion: this.schemaVersion,
      savedAt: new Date().toISOString(),
      data,
    };
    if (!writeLocalStorage(this.storageKey, JSON.stringify(cartridge))) {
      throw new Error("Test progress could not be written to local storage");
    }
    return cartridge;
  }

  load<T>(): TestProgressCartridge<T> | null {
    const raw = readLocalStorage(this.storageKey);
    if (!raw) return null;
    try {
      const candidate = JSON.parse(raw) as Partial<TestProgressCartridge<T>>;
      if (candidate.format !== "portable_test_progress_v1"
        || typeof candidate.schemaVersion !== "number"
        || candidate.schemaVersion > this.schemaVersion
        || typeof candidate.savedAt !== "string"
        || !candidate.data
        || typeof candidate.data !== "object") {
        return null;
      }
      return candidate as TestProgressCartridge<T>;
    } catch {
      return null;
    }
  }
}
