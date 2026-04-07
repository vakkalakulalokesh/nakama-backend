import { useEffect } from 'react';
import { GameModeName, PlayerStats } from '../types';

interface LobbyProps {
  username: string;
  onQuickMatch: (mode: GameModeName) => void;
  onViewLeaderboard: () => void;
  onLogout: () => void;
  playerStats: PlayerStats | null;
  fetchStats: () => Promise<PlayerStats | null>;
}

export default function Lobby({ username, onQuickMatch, onViewLeaderboard, onLogout, playerStats, fetchStats }: LobbyProps) {
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-game-surface rounded-2xl p-6 shadow-2xl border border-game-card mb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-400 text-sm">Welcome back,</p>
            <h2 className="text-xl font-bold text-white">{username}</h2>
          </div>
          <button
            onClick={onLogout}
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            Logout
          </button>
        </div>

        {playerStats && playerStats.totalMatches > 0 && (
          <div className="bg-game-card rounded-xl p-4 mb-6">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-green-400 text-lg font-bold">{playerStats.wins}</p>
                <p className="text-gray-500 text-xs">Wins</p>
              </div>
              <div>
                <p className="text-red-400 text-lg font-bold">{playerStats.losses}</p>
                <p className="text-gray-500 text-xs">Losses</p>
              </div>
              <div>
                <p className="text-yellow-400 text-lg font-bold">{playerStats.draws}</p>
                <p className="text-gray-500 text-xs">Draws</p>
              </div>
              <div>
                <p className="text-game-accent text-lg font-bold">{playerStats.score}</p>
                <p className="text-gray-500 text-xs">Score</p>
              </div>
            </div>
            {playerStats.streak > 0 && (
              <p className="text-center text-game-gold text-sm mt-2">
                {playerStats.streak} win streak!
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Quick Match</h3>

          <button
            onClick={() => onQuickMatch('classic')}
            className="w-full bg-game-accent hover:bg-game-accent-dark text-game-bg font-bold py-4 px-6 rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-between"
          >
            <div className="text-left">
              <div className="text-base">Classic Mode</div>
              <div className="text-xs opacity-75 font-normal">No time limit - play at your pace</div>
            </div>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => onQuickMatch('timed')}
            className="w-full bg-game-card hover:bg-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 active:scale-95 border border-gray-700 flex items-center justify-between"
          >
            <div className="text-left">
              <div className="text-base">Timed Mode</div>
              <div className="text-xs text-gray-400 font-normal">30 seconds per move</div>
            </div>
            <svg className="w-5 h-5 text-game-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>

      <button
        onClick={onViewLeaderboard}
        className="w-full bg-game-surface hover:bg-game-card text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 border border-game-card flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5 text-game-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
        Leaderboard
      </button>
    </div>
  );
}
