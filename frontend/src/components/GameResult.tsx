import { useEffect, useState } from 'react';
import { Session } from '@heroiclabs/nakama-js';
import { GameResult, LeaderboardEntry } from '../types';
import { getClient } from '../nakama';

interface GameResultProps {
  result: GameResult;
  session: Session | null;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export default function GameResultScreen({ result, session, onPlayAgain, onBackToLobby }: GameResultProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const isWinner = result.winner === result.myUserId;
  const isDraw = result.winner === null;

  useEffect(() => {
    async function fetchLeaderboard() {
      if (!session) return;
      try {
        const res = await getClient().rpc(session, 'get_leaderboard', { limit: 5 });
        if (res.payload) {
          const parsed = typeof res.payload === 'string' ? JSON.parse(res.payload) : res.payload;
          setLeaderboard(parsed.records || []);
        }
      } catch (e) {
        console.error('Failed to fetch leaderboard:', e);
      }
    }
    fetchLeaderboard();
  }, [session]);

  const getReasonText = () => {
    switch (result.reason) {
      case 'timeout': return 'Time ran out!';
      case 'opponent_left': return 'Opponent disconnected';
      default: return '';
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-game-surface rounded-2xl p-6 shadow-2xl border border-game-card mb-4">
        {/* Result Header */}
        <div className="text-center mb-6">
          {isDraw ? (
            <>
              <div className="text-5xl mb-3 animate-float">🤝</div>
              <h2 className="text-3xl font-bold text-yellow-400 mb-1">DRAW!</h2>
              <p className="text-game-accent text-lg font-semibold">+50 pts</p>
            </>
          ) : isWinner ? (
            <>
              <div className="text-5xl mb-3 animate-float">
                {result.winnerMark === 1 ? (
                  <svg className="w-20 h-20 mx-auto" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                    <line x1="4" y1="4" x2="20" y2="20" />
                    <line x1="20" y1="4" x2="4" y2="20" />
                  </svg>
                ) : (
                  <svg className="w-20 h-20 mx-auto" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="3">
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                )}
              </div>
              <h2 className="text-3xl font-bold text-game-gold mb-1">WINNER!</h2>
              <p className="text-game-accent text-lg font-semibold">+200 pts</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-3">😞</div>
              <h2 className="text-3xl font-bold text-red-400 mb-1">YOU LOST</h2>
              <p className="text-gray-500 text-lg">Better luck next time!</p>
            </>
          )}

          {getReasonText() && (
            <p className="text-gray-400 text-sm mt-2">{getReasonText()}</p>
          )}
        </div>

        {/* Final Board */}
        <div className="grid grid-cols-3 gap-2 mb-6 max-w-[200px] mx-auto">
          {result.board.map((cell, idx) => (
            <div key={idx} className="aspect-square flex items-center justify-center bg-game-card rounded-lg border border-gray-700/50">
              {cell === 1 && (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              )}
              {cell === 2 && (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="3">
                  <circle cx="12" cy="12" r="6" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Mini Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="mb-6">
            <h3 className="text-game-gold text-sm font-semibold mb-3 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              Leaderboard
            </h3>
            <div className="bg-game-card rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-700/50">
                    <th className="py-2 px-3 text-left">#</th>
                    <th className="py-2 px-3 text-left">Player</th>
                    <th className="py-2 px-3 text-center">W/L/D</th>
                    <th className="py-2 px-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr
                      key={entry.userId}
                      className={`border-b border-gray-700/30 last:border-0 ${entry.userId === result.myUserId ? 'bg-game-accent/10' : ''}`}
                    >
                      <td className="py-2 px-3 text-gray-400">{entry.rank}</td>
                      <td className="py-2 px-3 text-white font-medium">
                        {entry.username}
                        {entry.userId === result.myUserId && <span className="text-game-accent text-xs ml-1">(you)</span>}
                      </td>
                      <td className="py-2 px-3 text-center text-gray-400">
                        <span className="text-green-400">{entry.stats.wins}</span>/
                        <span className="text-red-400">{entry.stats.losses}</span>/
                        <span className="text-yellow-400">{entry.stats.draws}</span>
                      </td>
                      <td className="py-2 px-3 text-right text-game-accent font-semibold">{entry.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onPlayAgain}
            className="w-full bg-game-accent hover:bg-game-accent-dark text-game-bg font-bold py-3 px-6 rounded-xl transition-all duration-200 active:scale-95"
          >
            Play Again
          </button>
          <button
            onClick={onBackToLobby}
            className="w-full bg-game-card hover:bg-gray-700 text-gray-300 font-semibold py-3 px-6 rounded-xl transition-all duration-200 border border-gray-700 active:scale-95"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
