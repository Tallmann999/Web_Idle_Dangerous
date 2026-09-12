import type { SaveAdapter, SaveConflictResolver, SaveEnvelope, SaveMigration } from "./types";

export interface SaveModuleOptions {
  schemaVersion: number;
  adapters: SaveAdapter[];
  debounceMs?: number;
  migrate?: SaveMigration;
  resolveConflict?: SaveConflictResolver;
}

export class SaveModule {
  private revision = 0;
  private pendingData: unknown;
  private timer: number | null = null;

  constructor(private readonly options: SaveModuleOptions) {
    if (options.adapters.length === 0) throw new Error("SaveModule requires at least one adapter");
  }

  async load<T>(): Promise<T | null> {
    const results = await Promise.allSettled(this.options.adapters.map((adapter) => Promise.resolve(adapter.load())));
    const candidates = results
      .filter((result): result is PromiseFulfilledResult<unknown> => result.status === "fulfilled")
      .map((result) => normalizeEnvelope(result.value))
      .filter((value): value is SaveEnvelope => value !== null);

    if (candidates.length === 0) return null;
    const selected = this.options.resolveConflict?.(candidates) ?? newestSave(candidates);
    this.revision = Math.max(...candidates.map((candidate) => candidate.revision), selected.revision);

    if (selected.schemaVersion > this.options.schemaVersion) {
      throw new Error(`Save schema ${selected.schemaVersion} is newer than supported schema ${this.options.schemaVersion}`);
    }

    const data = selected.schemaVersion === this.options.schemaVersion
      ? selected.data
      : this.options.migrate?.(selected.data, selected.schemaVersion, this.options.schemaVersion) ?? selected.data;

    return data as T;
  }

  async save<T>(data: T): Promise<SaveEnvelope<T>> {
    this.cancelScheduledSave();
    const envelope: SaveEnvelope<T> = {
      format: "portable_save_v1",
      schemaVersion: this.options.schemaVersion,
      revision: ++this.revision,
      updatedAt: new Date().toISOString(),
      data,
    };
    await Promise.allSettled(this.options.adapters.map((adapter) => Promise.resolve(adapter.save(envelope))));
    return envelope;
  }

  scheduleSave<T>(data: T): void {
    this.pendingData = data;
    this.cancelScheduledSave();
    this.timer = window.setTimeout(() => {
      const pending = this.pendingData;
      this.pendingData = undefined;
      this.timer = null;
      void this.save(pending);
    }, this.options.debounceMs ?? 750);
  }

  async flush(): Promise<void> {
    if (this.pendingData === undefined) return;
    const pending = this.pendingData;
    this.pendingData = undefined;
    this.cancelScheduledSave();
    await this.save(pending);
  }

  async clear(): Promise<void> {
    this.pendingData = undefined;
    this.cancelScheduledSave();
    this.revision = 0;
    await Promise.allSettled(this.options.adapters.map((adapter) => Promise.resolve(adapter.clear())));
  }

  private cancelScheduledSave(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }
}

function normalizeEnvelope(value: unknown): SaveEnvelope | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SaveEnvelope>;
  if (candidate.format === "portable_save_v1" && typeof candidate.schemaVersion === "number") {
    return {
      format: "portable_save_v1",
      schemaVersion: candidate.schemaVersion,
      revision: Number(candidate.revision) || 0,
      updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date(0).toISOString(),
      data: candidate.data,
    };
  }

  // Existing projects can be migrated without deleting their old raw localStorage save.
  return {
    format: "portable_save_v1",
    schemaVersion: 1,
    revision: 0,
    updatedAt: new Date(0).toISOString(),
    data: value,
  };
}

function newestSave(candidates: SaveEnvelope[]): SaveEnvelope {
  return [...candidates].sort((left, right) => {
    if (right.revision !== left.revision) return right.revision - left.revision;
    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  })[0];
}

