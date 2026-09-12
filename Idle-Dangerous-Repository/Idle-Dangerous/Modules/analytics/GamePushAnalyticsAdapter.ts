import type { GamePushSdkGetter } from "../gamepush/contracts";
import type { AnalyticsAdapter, AnalyticsEvent } from "./types";

export class GamePushAnalyticsAdapter implements AnalyticsAdapter {
  readonly name = "gamepush";

  constructor(private readonly getSdk: GamePushSdkGetter) {}

  track(event: AnalyticsEvent): void {
    const analytics = this.getSdk()?.analytics;
    if (!analytics?.goal) return;
    analytics.goal(event.name, {
      ...event.params,
      event_id: event.id,
      session_id: event.sessionId,
      event_timestamp: event.timestamp,
    });
  }
}
