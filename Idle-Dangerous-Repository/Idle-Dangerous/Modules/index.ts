import { AnalyticsModule, GamePushAnalyticsAdapter, LocalAnalyticsAdapter, PokiAnalyticsAdapter } from "./analytics";
import type { AnalyticsAdapter, AnalyticsParams } from "./analytics";
import type { GamePushSdkGetter } from "./gamepush/contracts";
import { GamePushIdentityAdapter, IdentityModule, LocalIdentityAdapter, PokiIdentityAdapter } from "./identity";
import { GamePushLeaderboardAdapter, LeaderboardModule, LocalLeaderboardAdapter, PokiLeaderboardAdapter } from "./leaderboards";
import type { PokiLeaderboardClient } from "./leaderboards";
import type { PokiSdkGetter } from "./poki/contracts";
import { GamePushSaveAdapter, LocalSaveAdapter, SaveModule } from "./saves";
import type { SaveAdapter, SaveConflictResolver, SaveMigration } from "./saves";
import { TestProgressModule } from "./test-progress";

export * from "./analytics";
export * from "./leaderboards";
export * from "./saves";
export * from "./identity";
export * from "./gamepush/contracts";
export * from "./poki/contracts";
export * from "./test-progress";

export interface CreateGameModulesOptions {
  namespace: string;
  schemaVersion: number;
  getGamePushSdk?: GamePushSdkGetter;
  getPokiSdk?: PokiSdkGetter;
  pokiLeaderboardClient?: PokiLeaderboardClient;
  gamePushSaveField?: string;
  localSaveKey?: string;
  localAnalyticsKey?: string;
  localIdentityKey?: string;
  testProgressKey?: string;
  commonAnalyticsParams?: AnalyticsParams;
  analyticsMaxEvents?: number;
  saveDebounceMs?: number;
  migrateSave?: SaveMigration;
  resolveSaveConflict?: SaveConflictResolver;
}

export function createGameModules(options: CreateGameModulesOptions) {
  const namespace = normalizeNamespace(options.namespace);
  if (options.getGamePushSdk && options.getPokiSdk) {
    throw new Error("Configure either GamePush or Poki modules for a build, not both");
  }

  const defaultAnalyticsKey = options.getPokiSdk ? `poki_ignore:${namespace}:analytics` : `${namespace}:analytics`;
  const localAnalytics = new LocalAnalyticsAdapter(options.localAnalyticsKey ?? defaultAnalyticsKey, options.analyticsMaxEvents);
  const analyticsAdapters: AnalyticsAdapter[] = [localAnalytics];
  if (options.getGamePushSdk) analyticsAdapters.push(new GamePushAnalyticsAdapter(options.getGamePushSdk));
  if (options.getPokiSdk) analyticsAdapters.push(new PokiAnalyticsAdapter(options.getPokiSdk));

  const localSaves = new LocalSaveAdapter(options.localSaveKey ?? `${namespace}:save`);
  const saveAdapters: SaveAdapter[] = [localSaves];
  if (options.getGamePushSdk) {
    saveAdapters.push(new GamePushSaveAdapter(options.getGamePushSdk, options.gamePushSaveField ?? "save_data"));
  }

  const localLeaderboard = new LocalLeaderboardAdapter(`${namespace}:leaderboards`);
  const leaderboardAdapter = options.getGamePushSdk
    ? new GamePushLeaderboardAdapter(options.getGamePushSdk, localLeaderboard)
    : options.getPokiSdk && options.pokiLeaderboardClient
      ? new PokiLeaderboardAdapter(options.getPokiSdk, options.pokiLeaderboardClient, localLeaderboard)
      : localLeaderboard;

  const identityAdapter = options.getGamePushSdk
    ? new GamePushIdentityAdapter(options.getGamePushSdk)
    : options.getPokiSdk
      ? new PokiIdentityAdapter(options.getPokiSdk)
      : new LocalIdentityAdapter(options.localIdentityKey ?? `${namespace}:identity`);

  return {
    analytics: new AnalyticsModule({
      adapters: analyticsAdapters,
      readableAdapter: localAnalytics,
      commonParams: options.commonAnalyticsParams,
    }),
    saves: new SaveModule({
      schemaVersion: options.schemaVersion,
      adapters: saveAdapters,
      debounceMs: options.saveDebounceMs,
      migrate: options.migrateSave,
      resolveConflict: options.resolveSaveConflict,
    }),
    testProgress: new TestProgressModule(
      options.testProgressKey ?? `poki_ignore:${namespace}:test-progress-cartridge`,
      options.schemaVersion,
    ),
    leaderboards: new LeaderboardModule(leaderboardAdapter),
    identity: new IdentityModule(identityAdapter),
  };
}

function normalizeNamespace(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  if (!normalized) throw new Error("Modules namespace cannot be empty");
  return normalized;
}
