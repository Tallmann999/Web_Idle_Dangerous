import type { PokiSdkLike } from "../../Modules/poki/contracts.ts";
import { platformConfig, type PlatformId } from "./config.ts";
import { gamePush } from "./gamepush.ts";

export type PlatformState = "LOADING" | "READY" | "PLAYING" | "STOPPED" | "AD";

export interface PlatformAdapter {
  initialize(): Promise<boolean>;
  loadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  commercialBreak(onStart?: () => void): Promise<boolean>;
  rewardedBreak(onStart?: () => void): Promise<boolean>;
  getPokiSdk?(): PokiSdkLike | null;
}

type PlatformEventDispatcher = (eventName: "mage:platform-pause" | "mage:platform-resume") => void;

const noOp = () => undefined;

class LocalAdapter implements PlatformAdapter {
  async initialize() { return true; }
  loadingFinished() { noOp(); }
  gameplayStart() { noOp(); }
  gameplayStop() { noOp(); }
  async commercialBreak() { return false; }
  async rewardedBreak() { return false; }
}

class GamePushAdapter implements PlatformAdapter {
  async initialize() {
    const ready = await gamePush.initialize();
    if (ready) await gamePush.showPreloader();
    return ready;
  }
  loadingFinished() { noOp(); }
  gameplayStart() { noOp(); }
  gameplayStop() { noOp(); }
  commercialBreak() { return gamePush.showInterstitial(); }
  rewardedBreak() { return gamePush.showRewarded(); }
}

class PokiAdapter implements PlatformAdapter {
  private sdk: PokiSdkLike | null = null;

  async initialize() {
    this.sdk = window.PokiSDK ?? null;
    if (!this.sdk?.init) return false;
    await this.sdk.init();
    return true;
  }
  loadingFinished() { this.sdk?.gameLoadingFinished?.(); }
  gameplayStart() { this.sdk?.gameplayStart?.(); }
  gameplayStop() { this.sdk?.gameplayStop?.(); }
  async commercialBreak(onStart?: () => void) {
    if (!this.sdk?.commercialBreak) return false;
    await this.sdk.commercialBreak(onStart);
    return true;
  }
  async rewardedBreak(onStart?: () => void) {
    return this.sdk?.rewardedBreak ? this.sdk.rewardedBreak(onStart) : false;
  }
  getPokiSdk() { return this.sdk; }
}

declare global {
  interface Window {
    PokiSDK?: PokiSdkLike;
  }
}

function createAdapter(platformId: PlatformId): PlatformAdapter {
  if (platformId === "poki") return new PokiAdapter();
  if (platformId === "gamepush") return new GamePushAdapter();
  return new LocalAdapter();
}

function dispatchPlatformEvent(eventName: "mage:platform-pause" | "mage:platform-resume") {
  window.dispatchEvent(new Event(eventName));
}

export class PlatformBridge {
  private readonly adapter: PlatformAdapter;
  private readonly dispatch: PlatformEventDispatcher;
  private readonly debug: boolean;
  private stateValue: PlatformState = "LOADING";
  private initialization: Promise<boolean> | null = null;
  private initialized = false;
  private loadingReported = false;
  private adInProgress: Promise<boolean> | null = null;

  constructor(
    adapter: PlatformAdapter,
    dispatch: PlatformEventDispatcher = dispatchPlatformEvent,
    debug = Boolean(import.meta.env?.DEV),
  ) {
    this.adapter = adapter;
    this.dispatch = dispatch;
    this.debug = debug;
  }

  get state() { return this.stateValue; }
  get isReady() { return this.initialized; }
  get isAdPlaying() { return this.stateValue === "AD"; }
  getPokiSdk() { return this.adapter.getPokiSdk?.() ?? null; }

  initialize(): Promise<boolean> {
    if (this.initialization) return this.initialization;
    this.initialization = this.initializeOnce();
    return this.initialization;
  }

  private async initializeOnce() {
    try {
      this.initialized = await this.adapter.initialize();
    } catch (error) {
      this.initialized = false;
      console.warn("Platform SDK initialization failed; the game will continue without it.", error);
    }
    this.log("initialize", this.initialized);
    return this.initialized;
  }

  loadingFinished() {
    if (this.loadingReported) return;
    this.loadingReported = true;
    this.stateValue = "READY";
    if (this.initialized) this.safely("gameLoadingFinished", () => this.adapter.loadingFinished());
    this.log("loadingFinished");
  }

  gameplayStart() {
    if (!this.loadingReported || this.stateValue === "PLAYING" || this.stateValue === "AD") return;
    this.stateValue = "PLAYING";
    if (this.initialized) this.safely("gameplayStart", () => this.adapter.gameplayStart());
    this.log("gameplayStart");
  }

  gameplayStop() {
    if (this.stateValue !== "PLAYING") return;
    this.stateValue = "STOPPED";
    if (this.initialized) this.safely("gameplayStop", () => this.adapter.gameplayStop());
    this.log("gameplayStop");
  }

  commercialBreak() { return this.runAd("commercial"); }
  rewardedBreak() { return this.runAd("rewarded"); }

  private runAd(kind: "commercial" | "rewarded"): Promise<boolean> {
    if (this.adInProgress) return this.adInProgress;
    this.adInProgress = this.runAdOnce(kind).finally(() => { this.adInProgress = null; });
    return this.adInProgress;
  }

  private async runAdOnce(kind: "commercial" | "rewarded") {
    if (!this.initialized) return false;
    const resumeGameplay = this.stateValue === "PLAYING";
    if (resumeGameplay) this.gameplayStop();
    const returnState: PlatformState = this.loadingReported ? "STOPPED" : "LOADING";
    this.stateValue = "AD";
    this.dispatch("mage:platform-pause");
    this.log(`${kind}Break:start`);
    try {
      return kind === "rewarded"
        ? await this.adapter.rewardedBreak(() => this.log("rewardedBreak:onStart"))
        : await this.adapter.commercialBreak(() => this.log("commercialBreak:onStart"));
    } catch (error) {
      console.warn(`${kind} ad failed; no reward was granted.`, error);
      return false;
    } finally {
      this.stateValue = returnState;
      this.dispatch("mage:platform-resume");
      if (resumeGameplay) this.gameplayStart();
      this.log(`${kind}Break:finish`);
    }
  }

  private safely(label: string, action: () => void) {
    try { action(); } catch (error) { console.warn(`Platform event ${label} failed.`, error); }
  }

  private log(event: string, value?: unknown) {
    if (this.debug) console.debug(`[platform:${platformConfig.id}] ${event}`, value ?? this.stateValue);
  }
}

export const platformBridge = new PlatformBridge(createAdapter(platformConfig.id));
