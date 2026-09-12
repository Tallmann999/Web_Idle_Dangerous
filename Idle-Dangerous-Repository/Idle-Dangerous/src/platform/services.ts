import { createGameModules, type GamePushSdkLike } from "../../Modules";
import { platformConfig } from "./config";
import { platformBridge } from "./bridge";
import { gamePush } from "./gamepush";

export const gameServices = createGameModules({
  namespace: "mage_cleanse_corruption",
  schemaVersion: 6,
  localSaveKey: "mage-cleanse-world-map-v2",
  ...(platformConfig.isGamePush ? {
    gamePushSaveField: "save_data",
    getGamePushSdk: () => gamePush.getSdk() as GamePushSdkLike | null,
  } : {}),
  ...(platformConfig.isPoki ? {
    getPokiSdk: () => platformBridge.getPokiSdk(),
  } : {}),
  localAnalyticsKey: platformConfig.isPoki
    ? "poki_ignore:mage_cleanse_corruption:analytics"
    : "mage_cleanse_corruption:analytics",
  commonAnalyticsParams: {
    game_id: "mage_cleanse_corruption",
    build_version: "0.2.1-v3-balance",
    platform_id: platformConfig.id,
  },
});
