import type { PokiSdkGetter } from "../poki/contracts";
import type { AnalyticsAdapter, AnalyticsEvent } from "./types";

export type PokiEventTuple = readonly [category: string, what: string, action: string];
export type PokiEventMapper = (event: AnalyticsEvent) => PokiEventTuple | null;

export class PokiAnalyticsAdapter implements AnalyticsAdapter {
  readonly name = "poki";

  constructor(
    private readonly getSdk: PokiSdkGetter,
    private readonly mapEvent: PokiEventMapper = defaultPokiEventMapper,
  ) {}

  track(event: AnalyticsEvent): void {
    const measure = this.getSdk()?.measure;
    const mapped = this.mapEvent(event);
    if (!measure || !mapped) return;
    measure(...mapped.map(sanitizePokiEventPart) as [string, string, string]);
  }
}

function defaultPokiEventMapper(event: AnalyticsEvent): PokiEventTuple {
  const action = typeof event.params.action === "string" ? event.params.action : "reached";
  return ["game-event", event.name.replaceAll("_", "-"), action];
}

function sanitizePokiEventPart(value: string): string {
  return value.replaceAll("/", "-").replaceAll("^", "-").slice(0, 80) || "unknown";
}
