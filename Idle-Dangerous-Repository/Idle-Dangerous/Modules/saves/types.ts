export interface SaveEnvelope<T = unknown> {
  format: "portable_save_v1";
  schemaVersion: number;
  revision: number;
  updatedAt: string;
  data: T;
}

export interface SaveAdapter {
  readonly name: string;
  load(): Promise<unknown> | unknown;
  save(value: SaveEnvelope): Promise<void> | void;
  clear(): Promise<void> | void;
}

export type SaveMigration = (data: unknown, fromVersion: number, toVersion: number) => unknown;
export type SaveConflictResolver = (candidates: SaveEnvelope[]) => SaveEnvelope;

