export type Screen = 'login' | 'lobby' | 'matchmaking' | 'game' | 'result' | 'leaderboard';
export type GameModeName = 'classic' | 'timed';

export const OpCode = {
  MOVE: 1,
  STATE: 2,
  DONE: 3,
  REJECTED: 4,
  TIMER: 5,
  MATCH_READY: 7,
} as const;

export interface PlayerInfo {
  odid: string;
  username: string;
  mark: number; // 1=X, 2=O
}

export interface MatchReadyData {
  board: number[];
  players: { [userId: string]: PlayerInfo };
  playerOrder: string[];
  currentTurn: number;
  gameMode: number;
  playerTimers: { [userId: string]: number };
}

export interface StateUpdateData {
  board: number[];
  currentTurn: number;
  currentPlayerId: string;
  moveCount: number;
  lastMove: { position: number; mark: number; playerId: string };
  playerTimers: { [userId: string]: number };
}

export interface GameDoneData {
  board: number[];
  winner: string | null;
  winnerMark: number;
  reason: 'win' | 'draw' | 'timeout' | 'opponent_left';
  playerTimers?: { [userId: string]: number };
}

export interface TimerData {
  currentPlayer: string;
  remainingTime: number;
  playerTimers: { [userId: string]: number };
}

export interface ClientGameState {
  board: number[];
  players: { [userId: string]: PlayerInfo };
  playerOrder: string[];
  currentTurn: number;
  gameMode: number;
  playerTimers: { [userId: string]: number };
  myUserId: string;
  myMark: number;
}

export interface GameResult {
  winner: string | null;
  winnerMark: number;
  reason: string;
  board: number[];
  players: { [userId: string]: PlayerInfo };
  myUserId: string;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  bestStreak: number;
  totalMatches: number;
  score: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
  stats: PlayerStats;
}
