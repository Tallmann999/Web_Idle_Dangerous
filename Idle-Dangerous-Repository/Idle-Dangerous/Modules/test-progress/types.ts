export interface TestProgressCartridge<T = unknown> {
  format: "portable_test_progress_v1";
  schemaVersion: number;
  savedAt: string;
  data: T;
}

