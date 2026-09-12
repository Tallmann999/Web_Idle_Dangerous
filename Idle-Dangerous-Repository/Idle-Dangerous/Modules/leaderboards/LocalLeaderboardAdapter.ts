import type { LeaderboardAdapter, LeaderboardQuery, LeaderboardResult } from "./types";
import { readLocalStorage, writeLocalStorage } from "../storage/safeLocalStorage";

type StoredScores = Record<string, number>;

export class LocalLeaderboardAdapter implements LeaderboardAdapter {
  readonly name = "local";

  constructor(private readonly storageKey: string) {}

  async submitScore(boardId: string, score: number): Promise<void> {
    const scores = this.read();
    scores[boardId] = Math.max(scores[boardId] ?? 0, score);
    writeLocalStorage(this.storageKey, JSON.stringify(scores));
  }

  async getEntries(boardId: string, _query?: LeaderboardQuery): Promise<LeaderboardResult> {
    const score = this.read()[boardId];
    if (score === undefined) return { entries: [] };
    const player = { rank: 1, score, playerId: "local-player", playerName: "Local Player", isCurrentPlayer: true };
    return { entries: [player], player };
  }

  private read(): StoredScores {
    try {
      const raw = readLocalStorage(this.storageKey);
      return raw ? JSON.parse(raw) as StoredScores : {};
    } catch {
      return {};
    }
  }
}
