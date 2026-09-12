import type { PokiSdkGetter } from "../poki/contracts";
import type { LeaderboardAdapter, LeaderboardQuery, LeaderboardResult } from "./types";

export interface PokiLeaderboardClient {
  submitScore(token: string, boardId: string, score: number, extraData?: string): Promise<void>;
  getEntries(token: string | null, boardId: string, query?: LeaderboardQuery): Promise<LeaderboardResult>;
}

export class PokiLeaderboardAdapter implements LeaderboardAdapter {
  readonly name = "poki";

  constructor(
    private readonly getSdk: PokiSdkGetter,
    private readonly client: PokiLeaderboardClient,
    private readonly fallback?: LeaderboardAdapter,
  ) {}

  async submitScore(boardId: string, score: number, extraData?: string): Promise<void> {
    const token = await this.getToken();
    if (!token) {
      await this.fallback?.submitScore(boardId, score, extraData);
      return;
    }
    await this.client.submitScore(token, boardId, score, extraData);
  }

  async getEntries(boardId: string, query?: LeaderboardQuery): Promise<LeaderboardResult> {
    const token = await this.getToken();
    return this.client.getEntries(token, boardId, query);
  }

  private async getToken(): Promise<string | null> {
    try {
      return await this.getSdk()?.getToken?.() ?? null;
    } catch {
      return null;
    }
  }
}
