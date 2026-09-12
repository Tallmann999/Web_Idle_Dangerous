import { readLocalStorage, writeLocalStorage } from "../../Modules/storage/safeLocalStorage";

export type GraphicsQuality = "auto" | "high" | "medium" | "economy";
export type ResolvedGraphicsQuality = Exclude<GraphicsQuality, "auto">;

export type VfxBudget = {
  shots: number;
  damageNumbers: number;
  coins: number;
  iceRainShots: number;
  audioChannels: number;
};

export const GRAPHICS_QUALITY_STORAGE_KEY = "clicker-weapon-adventure-graphics-quality-v1";

export const VFX_BUDGETS: Record<ResolvedGraphicsQuality, VfxBudget> = {
  high: { shots: 6, damageNumbers: 17, coins: 72, iceRainShots: 6, audioChannels: 6 },
  medium: { shots: 4, damageNumbers: 12, coins: 36, iceRainShots: 6, audioChannels: 4 },
  economy: { shots: 3, damageNumbers: 8, coins: 16, iceRainShots: 6, audioChannels: 3 },
};

type NavigatorWithDeviceMemory = Navigator & { deviceMemory?: number };

export function detectGraphicsQuality(): ResolvedGraphicsQuality {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "high";

  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as NavigatorWithDeviceMemory).deviceMemory;
  const coarsePointer = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion || coarsePointer || cores <= 4 || (memory !== undefined && memory <= 4)) return "economy";
  if (cores <= 8 || (memory !== undefined && memory <= 8)) return "medium";
  return "high";
}

export function resolveGraphicsQuality(quality: GraphicsQuality): ResolvedGraphicsQuality {
  return quality === "auto" ? detectGraphicsQuality() : quality;
}

export function readGraphicsQuality(): GraphicsQuality {
  if (typeof window === "undefined") return "auto";
  const value = readLocalStorage(GRAPHICS_QUALITY_STORAGE_KEY);
  return value === "high" || value === "medium" || value === "economy" || value === "auto" ? value : "auto";
}

export function writeGraphicsQuality(quality: GraphicsQuality): void {
  writeLocalStorage(GRAPHICS_QUALITY_STORAGE_KEY, quality);
}

export class AudioChannelPool {
  private channels: HTMLAudioElement[] = [];
  private cursor = 0;

  constructor(private readonly sourceUrl: string, size: number) {
    this.resize(size);
  }

  resize(size: number): void {
    const safeSize = Math.max(1, Math.floor(size));
    while (this.channels.length < safeSize) {
      const channel = new Audio(this.sourceUrl);
      channel.preload = "auto";
      this.channels.push(channel);
    }
    while (this.channels.length > safeSize) {
      this.channels.pop()?.pause();
    }
    this.cursor %= this.channels.length;
  }

  play(volume: number): void {
    const channel = this.channels[this.cursor];
    this.cursor = (this.cursor + 1) % this.channels.length;
    channel.pause();
    channel.currentTime = 0;
    channel.volume = Math.max(0, Math.min(1, volume));
    void channel.play().catch(() => undefined);
  }

  stopAll(): void {
    this.channels.forEach((channel) => {
      channel.pause();
      channel.currentTime = 0;
    });
  }
}
