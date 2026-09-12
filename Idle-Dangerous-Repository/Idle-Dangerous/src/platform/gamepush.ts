type GamePushEventHandler = (...args: unknown[]) => void;

interface GamePushAds {
  isPreloaderAvailable?: boolean;
  isFullscreenAvailable?: boolean;
  isRewardedAvailable?: boolean;
  isStickyAvailable?: boolean;
  on(event: string, handler: GamePushEventHandler): void;
  showPreloader(): Promise<boolean>;
  showFullscreen(options?: { showCountdownOverlay?: boolean }): Promise<boolean>;
  showRewardedVideo(options?: { showFailedOverlay?: boolean }): Promise<boolean>;
  showSticky(): void;
  closeSticky(): void;
}

interface GamePushPlayer {
  ready: Promise<unknown>;
  sync?: () => Promise<unknown>;
}

interface GamePushSdk {
  ads: GamePushAds;
  player: GamePushPlayer;
}

declare global {
  interface Window {
    onGPInit?: (sdk: GamePushSdk) => void;
  }
}

const SDK_URLS = [
  "https://gs.eponesh.com/sdk/game-score.js",
  "https://s3.gamepush.com/files/gs/sdk/game-score.js",
  "https://s3-eu.gamepush.com/sdk/game-score.js",
  "https://gamepush.com/sdk/game-score.js",
];

function timeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error("GamePush initialization timeout")), milliseconds);
    }),
  ]);
}

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error(`Unable to load GamePush SDK from ${url}`));
    };
    document.head.appendChild(script);
  });
}

class GamePushBridge {
  private sdk: GamePushSdk | null = null;
  private initialization: Promise<boolean> | null = null;

  get isReady() {
    return this.sdk !== null;
  }

  getSdk(): unknown {
    return this.sdk;
  }

  initialize(): Promise<boolean> {
    if (this.initialization) return this.initialization;
    this.initialization = this.initializeSdk();
    return this.initialization;
  }

  private async initializeSdk(): Promise<boolean> {
    const enabled = import.meta.env.VITE_GAMEPUSH_ENABLED === "true";
    const projectId = import.meta.env.VITE_GAMEPUSH_PROJECT_ID?.trim();
    const publicToken = import.meta.env.VITE_GAMEPUSH_PUBLIC_TOKEN?.trim();

    if (!enabled || !projectId || !publicToken) return false;

    let resolveSdk: (sdk: GamePushSdk) => void = () => undefined;
    const sdkReady = new Promise<GamePushSdk>((resolve) => {
      resolveSdk = resolve;
    });
    window.onGPInit = resolveSdk;

    const query = new URLSearchParams({ projectId, publicToken, callback: "onGPInit" });
    let loaded = false;

    for (const sdkUrl of SDK_URLS) {
      try {
        await loadScript(`${sdkUrl}?${query.toString()}`);
        loaded = true;
        break;
      } catch {
        // Try the next official GamePush CDN endpoint.
      }
    }

    if (!loaded) {
      console.warn("GamePush SDK is unavailable; the game will continue in local mode.");
      return false;
    }

    try {
      this.sdk = await timeout(sdkReady, 10_000);
      await timeout(Promise.resolve(this.sdk.player.ready), 10_000);
      return true;
    } catch (error) {
      console.warn("GamePush did not finish initialization; local mode is active.", error);
      this.sdk = null;
      return false;
    }
  }

  async showPreloader(): Promise<boolean> {
    if (!this.sdk?.ads.isPreloaderAvailable) return false;
    return this.sdk.ads.showPreloader();
  }

  async showInterstitial(): Promise<boolean> {
    if (!this.sdk?.ads.isFullscreenAvailable) return false;
    return this.sdk.ads.showFullscreen({ showCountdownOverlay: true });
  }

  async showRewarded(): Promise<boolean> {
    if (!this.sdk?.ads.isRewardedAvailable) return false;
    return this.sdk.ads.showRewardedVideo({ showFailedOverlay: true });
  }

  showSticky(): boolean {
    if (!this.sdk?.ads.isStickyAvailable) return false;
    this.sdk.ads.showSticky();
    return true;
  }

  closeSticky() {
    this.sdk?.ads.closeSticky();
  }

  async syncPlayer() {
    await this.sdk?.player.sync?.();
  }
}

export const gamePush = new GamePushBridge();
