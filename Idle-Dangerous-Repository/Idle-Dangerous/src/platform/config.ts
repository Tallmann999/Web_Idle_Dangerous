export type PlatformId = "local" | "gamepush" | "poki";

type PlatformEnvironment = {
  readonly VITE_PLATFORM?: string;
  readonly VITE_GAMEPUSH_ENABLED?: string;
};

export function resolvePlatformId(environment: PlatformEnvironment): PlatformId {
  const requested = environment.VITE_PLATFORM?.trim().toLowerCase();
  if (requested === "local" || requested === "gamepush" || requested === "poki") return requested;
  return environment.VITE_GAMEPUSH_ENABLED === "true" ? "gamepush" : "local";
}

const buildEnvironment: PlatformEnvironment = import.meta.env ?? {};

export const platformConfig = Object.freeze({
  id: resolvePlatformId(buildEnvironment),
  get isLocal() { return this.id === "local"; },
  get isGamePush() { return this.id === "gamepush"; },
  get isPoki() { return this.id === "poki"; },
});
