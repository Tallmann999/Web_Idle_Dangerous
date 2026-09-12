import type { AnalyticsEvent, ReadableAnalyticsAdapter } from "./types";
import { readLocalStorage, removeLocalStorage, writeLocalStorage } from "../storage/safeLocalStorage";

export class LocalAnalyticsAdapter implements ReadableAnalyticsAdapter {
  readonly name = "local";

  constructor(
    private readonly storageKey: string,
    private readonly maxEvents = 5_000,
  ) {}

  track(event: AnalyticsEvent): void {
    const events = this.read();
    events.push(event);
    const trimmed = events.slice(-this.maxEvents);
    writeLocalStorage(this.storageKey, JSON.stringify(trimmed));
  }

  read(): AnalyticsEvent[] {
    try {
      const raw = readLocalStorage(this.storageKey);
      if (!raw) return [];
      const value = JSON.parse(raw) as unknown;
      return Array.isArray(value) ? value.filter(isAnalyticsEvent) : [];
    } catch {
      return [];
    }
  }

  clear(): void {
    removeLocalStorage(this.storageKey);
  }
}

function isAnalyticsEvent(value: unknown): value is AnalyticsEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<AnalyticsEvent>;
  return typeof event.id === "string" && typeof event.name === "string" && typeof event.timestamp === "string";
}
