export interface LeaderboardEntry {
  rank: number;
  score: number;
  playerId?: string;
  playerName?: string;
  avatarUrl?: string;
  isCurrentPlayer?: boolean;
  extraData?: string;
  raw?: unknown;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  player?: LeaderboardEntry;
  raw?: unknown;
}

export interface LeaderboardQuery {
  limit?: number;
  aroundPlayer?: number;
}

export interface LeaderboardAdapter {
  readonly name: string;
  submitScore(boardId: string, score: number, extraData?: string): Promise<void>;
  getEntries(boardId: string, query?: LeaderboardQuery): Promise<LeaderboardResult>;
  open?(boardId: string, query?: LeaderboardQuery): Promise<void>;
}

