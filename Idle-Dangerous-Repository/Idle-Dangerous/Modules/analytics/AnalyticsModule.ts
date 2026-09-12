import type { AnalyticsAdapter, AnalyticsEvent, AnalyticsParams, ReadableAnalyticsAdapter } from "./types";

export interface AnalyticsModuleOptions {
  adapters: AnalyticsAdapter[];
  readableAdapter?: ReadableAnalyticsAdapter;
  commonParams?: AnalyticsParams;
  sessionId?: string;
}

export class AnalyticsModule {
  readonly sessionId: string;
  private commonParams: AnalyticsParams;

  constructor(private readonly options: AnalyticsModuleOptions) {
    this.sessionId = options.sessionId ?? createId("session");
    this.commonParams = { ...options.commonParams };
  }

  setCommonParams(params: AnalyticsParams): void {
    this.commonParams = { ...this.commonParams, ...params };
  }

  async track(name: string, params: AnalyticsParams = {}): Promise<void> {
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      throw new Error(`Analytics event must use snake_case: ${name}`);
    }

    const event: AnalyticsEvent = {
      id: createId("event"),
      name,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      params: { ...this.commonParams, ...params },
    };

    await Promise.allSettled(this.options.adapters.map((adapter) => Promise.resolve(adapter.track(event))));
  }

  getLocalEvents(): AnalyticsEvent[] {
    return this.options.readableAdapter?.read() ?? [];
  }

  clearLocalEvents(): void {
    this.options.readableAdapter?.clear();
  }

  exportJson(filename = "analytics-events.json"): void {
    download(filename, JSON.stringify(this.getLocalEvents(), null, 2), "application/json");
  }

  exportCsv(filename = "analytics-events.csv"): void {
    const rows = this.getLocalEvents().map((event) => ({
      id: event.id,
      name: event.name,
      timestamp: event.timestamp,
      session_id: event.sessionId,
      params: JSON.stringify(event.params),
    }));
    const header = ["id", "name", "timestamp", "session_id", "params"];
    const csv = [header.join(","), ...rows.map((row) => header.map((key) => csvCell(row[key as keyof typeof row])).join(","))].join("\n");
    download(filename, csv, "text/csv;charset=utf-8");
  }
}

function createId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function download(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

