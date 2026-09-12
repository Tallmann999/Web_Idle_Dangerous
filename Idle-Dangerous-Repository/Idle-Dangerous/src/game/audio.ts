import type { WeaponId } from "./clickerV3";
import { readLocalStorage } from "../../Modules/storage/safeLocalStorage";

export const DEFAULT_AUDIO_VOLUME = 0.3;
export const AUDIO_VOLUME_KEYS = {
  music: "clicker-weapon-adventure-music-volume-v1",
  effects: "clicker-weapon-adventure-effects-volume-v1",
};
export const WEAPON_IMPACT_FILES: Record<WeaponId, readonly string[]> = {
  gray_weapon: ["gray-impact-1.mp3", "gray-impact-2.mp3"],
  purple_weapon: ["bioplasma-impact.mp3"],
  blue_weapon: ["crystal-impact.mp3"],
  void_weapon: ["void-impact.mp3"],
  sun_weapon: ["solar-impact.mp3"],
  relic_weapon: ["relic-impact.mp3"],
};
const MUSIC_FILE = "play-fon-loop.mp3";
const EFFECT_FILES = ["coin-drop.mp3", "coin-collect.mp3", "boss-jackpot.mp3", ...Object.values(WEAPON_IMPACT_FILES).flat()];

export function readAudioVolume(channel: keyof typeof AUDIO_VOLUME_KEYS): number {
  const raw = readLocalStorage(AUDIO_VOLUME_KEYS[channel]);
  if (raw === null || raw.trim() === "") return DEFAULT_AUDIO_VOLUME;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : DEFAULT_AUDIO_VOLUME;
}

/** Two gain buses also make the sliders work on mobile browsers. */
export class GameAudio {
  private readonly assetUrl: (path: string) => string;
  private context: AudioContext;
  private musicGain: GainNode;
  private effectsGain: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private effects = new Set<AudioBufferSourceNode>();
  private music: AudioBufferSourceNode | null = null;
  private running = false;
  private disposed = false;
  private grayVariant = 0;
  private lastEffectAt = new Map<string, number>();
  private abort = new AbortController();
  private loadStarted = false;

  constructor(assetUrl: (path: string) => string) {
    this.assetUrl = assetUrl;
    this.context = new AudioContext();
    this.musicGain = this.context.createGain();
    this.effectsGain = this.context.createGain();
    this.musicGain.connect(this.context.destination);
    this.effectsGain.connect(this.context.destination);
    this.setVolumes(DEFAULT_AUDIO_VOLUME, DEFAULT_AUDIO_VOLUME);
  }

  private loadAudio(): void {
    if (this.loadStarted || this.disposed) return;
    this.loadStarted = true;
    for (const file of [MUSIC_FILE, ...EFFECT_FILES]) {
      void fetch(this.assetUrl(`audio/${file}`), { signal: this.abort.signal })
        .then(response => {
          if (!response.ok) throw new Error(`Audio ${response.status}`);
          return response.arrayBuffer();
        })
        .then(data => this.context.decodeAudioData(data))
        .then(buffer => {
          if (this.disposed) return;
          this.buffers.set(file, buffer);
          if (file === MUSIC_FILE) this.startMusic();
        }).catch(() => { /* A missing sound must not interrupt gameplay. */ });
    }
  }

  setVolumes(music: number, effects: number): void {
    this.musicGain.gain.value = Math.max(0, Math.min(1, music));
    this.effectsGain.gain.value = Math.max(0, Math.min(1, effects));
  }

  setRunning(running: boolean): void {
    if (this.disposed) return;
    this.running = running;
    if (running) {
      // Called directly from Start/unmute as well as after visibility changes.
      this.loadAudio();
      void this.context.resume().catch(() => undefined);
      this.startMusic();
    } else {
      this.stopEffects();
      void this.context.suspend().catch(() => undefined);
    }
  }

  private startMusic(): void {
    const buffer = this.buffers.get(MUSIC_FILE);
    if (!this.running || this.music || !buffer || this.disposed) return;
    this.music = this.context.createBufferSource();
    this.music.buffer = buffer;
    this.music.loop = true;
    this.music.connect(this.musicGain);
    this.music.start();
  }

  playImpact(weapon: WeaponId): void {
    const variants = WEAPON_IMPACT_FILES[weapon];
    this.playEffect(variants[weapon === "gray_weapon" ? this.grayVariant++ % variants.length : 0]);
  }

  playEffect(file: string, level = 1, maxDuration?: number): void {
    const buffer = this.buffers.get(file);
    if (!this.running || this.disposed || !buffer || this.context.state !== "running" || this.effectsGain.gain.value === 0) return;
    const now = this.context.currentTime;
    if (now - (this.lastEffectAt.get(file) ?? -Infinity) < 0.07) return;
    this.lastEffectAt.set(file, now);
    // Bound overlapping clicks and coin showers without allocating HTML players.
    if (this.effects.size >= 18) {
      const oldest = this.effects.values().next().value;
      if (oldest) { oldest.stop(); this.effects.delete(oldest); }
    }
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    gain.gain.value = level;
    source.connect(gain);
    gain.connect(this.effectsGain);
    this.effects.add(source);
    source.onended = () => { this.effects.delete(source); source.disconnect(); gain.disconnect(); };
    source.start(0, 0, Math.min(buffer.duration, maxDuration ?? buffer.duration));
  }

  stopEffects(): void {
    this.effects.forEach(source => source.stop());
    this.effects.clear();
    this.lastEffectAt.clear();
  }

  dispose(): void {
    this.disposed = true;
    this.abort.abort();
    this.stopEffects();
    this.music?.stop();
    this.buffers.clear();
    void this.context.close().catch(() => undefined);
  }
}
