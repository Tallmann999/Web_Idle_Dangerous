import type { GamePushSdkGetter } from "../gamepush/contracts";
import type { SaveAdapter, SaveEnvelope } from "./types";

export class GamePushSaveAdapter implements SaveAdapter {
  readonly name = "gamepush";

  constructor(
    private readonly getSdk: GamePushSdkGetter,
    private readonly fieldKey: string,
  ) {}

  load(): unknown {
    const player = this.getSdk()?.player;
    if (!player?.get) return null;
    const value = player.get(this.fieldKey);
    if (typeof value !== "string" || !value) return null;
    return JSON.parse(value);
  }

  async save(value: SaveEnvelope): Promise<void> {
    const player = this.getSdk()?.player;
    if (!player?.set || !player.sync) return;
    player.set(this.fieldKey, JSON.stringify(value));
    await player.sync();
  }

  async clear(): Promise<void> {
    const player = this.getSdk()?.player;
    if (!player?.set || !player.sync) return;
    player.set(this.fieldKey, "");
    await player.sync();
  }
}

