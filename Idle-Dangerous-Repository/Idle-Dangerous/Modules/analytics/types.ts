export type AnalyticsPrimitive = string | number | boolean | null;
export type AnalyticsParams = Record<string, AnalyticsPrimitive | AnalyticsPrimitive[]>;

export interface AnalyticsEvent {
  id: string;
  name: string;
  timestamp: string;
  sessionId: string;
  params: AnalyticsParams;
}

export interface AnalyticsAdapter {
  readonly name: string;
  track(event: AnalyticsEvent): Promise<void> | void;
}

export interface ReadableAnalyticsAdapter extends AnalyticsAdapter {
  read(): AnalyticsEvent[];
  clear(): void;
}

