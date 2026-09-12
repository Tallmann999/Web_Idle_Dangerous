import type { GamePushSdkGetter } from "../gamepush/contracts";
import type { LeaderboardAdapter, LeaderboardEntry, LeaderboardQuery, LeaderboardResult } from "./types";

export class GamePushLeaderboardAdapter implements LeaderboardAdapter {
  readonly name = "gamepush";

  constructor(
    private readonly getSdk: GamePushSdkGetter,
    private readonly fallback?: LeaderboardAdapter,
  ) {}

  async submitScore(boardId: string, score: number, extraData?: string): Promise<void> {
    const leaderboard = this.getSdk()?.leaderboard;
    if (!leaderboard?.publishRecord) {
      await this.fallback?.submitScore(boardId, score, extraData);
      return;
    }
    await leaderboard.publishRecord({ tag: boardId, score, extraData });
  }

  async getEntries(boardId: string, query: LeaderboardQuery = {}): Promise<LeaderboardResult> {
    const leaderboard = this.getSdk()?.leaderboard;
    if (!leaderboard?.fetch) return this.fallback?.getEntries(boardId, query) ?? { entries: [] };
    const raw = await leaderboard.fetch({
      tag: boardId,
      orderBy: "score",
      order: "DESC",
      limit: query.limit ?? 10,
      showNearest: query.aroundPlayer ?? 3,
      withMe: "first",
    });
    return normalizeResult(raw);
  }

  async open(boardId: string, query: LeaderboardQuery = {}): Promise<void> {
    const leaderboard = this.getSdk()?.leaderboard;
    if (!leaderboard?.open) return;
    await leaderboard.open({
      tag: boardId,
      orderBy: "score",
      order: "DESC",
      limit: query.limit ?? 10,
      showNearest: query.aroundPlayer ?? 3,
      withMe: "first",
    });
  }
}

function normalizeResult(raw: unknown): LeaderboardResult {
  if (!raw || typeof raw !== "object") return { entries: [], raw };
  const source = raw as Record<string, unknown>;
  const arrays = [source.entries, source.players, source.top, source.items];
  const values = arrays.find(Array.isArray) ?? [];
  const entries = (values as unknown[]).map(normalizeEntry).filter((entry): entry is LeaderboardEntry => entry !== null);
  const currentRaw = source.player ?? source.me ?? source.currentPlayer;
  const player = normalizeEntry(currentRaw) ?? entries.find((entry) => entry.isCurrentPlayer);
  return { entries, player, raw };
}

function normalizeEntry(raw: unknown): LeaderboardEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const player = value.player && typeof value.player === "object" ? value.player as Record<string, unknown> : value;
  const score = Number(value.score ?? player.score);
  if (!Number.isFinite(score)) return null;
  return {
    rank: Number(value.rank ?? value.position ?? 0),
    score,
    playerId: String(player.id ?? player.playerId ?? "") || undefined,
    playerName: String(player.name ?? player.playerName ?? "") || undefined,
    avatarUrl: String(player.avatar ?? player.avatarUrl ?? "") || undefined,
    isCurrentPlayer: Boolean(value.isMe ?? value.isCurrentPlayer),
    extraData: typeof value.extraData === "string" ? value.extraData : undefined,
    raw,
  };
}
