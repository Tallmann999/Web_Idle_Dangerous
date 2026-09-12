import type { LeaderboardAdapter, LeaderboardQuery, LeaderboardResult } from "./types";

export class LeaderboardModule {
  private readonly bestScores = new Map<string, number>();

  constructor(private readonly adapter: LeaderboardAdapter) {}

  async submitIfHigher(boardId: string, score: number, extraData?: string): Promise<boolean> {
    if (!/^[a-z][a-z0-9_]*$/.test(boardId)) throw new Error(`Leaderboard id must use snake_case: ${boardId}`);
    if (!Number.isFinite(score) || score < 0) throw new Error("Leaderboard score must be a non-negative number");
    const normalized = Math.floor(score);
    if (normalized <= (this.bestScores.get(boardId) ?? -1)) return false;
    await this.adapter.submitScore(boardId, normalized, extraData);
    this.bestScores.set(boardId, normalized);
    return true;
  }

  getEntries(boardId: string, query?: LeaderboardQuery): Promise<LeaderboardResult> {
    return this.adapter.getEntries(boardId, query);
  }

  open(boardId: string, query?: LeaderboardQuery): Promise<void> {
    return this.adapter.open?.(boardId, query) ?? Promise.resolve();
  }
}

