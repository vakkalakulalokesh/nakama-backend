import { useState, useEffect } from 'react';
import { Session } from '@heroiclabs/nakama-js';
import { LeaderboardEntry } from '../types';
import { getClient } from '../nakama';

interface LeaderboardProps {
  session: Session | null;
  onBack: () => void;
}

export default function Leaderboard({ session, onBack }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      if (!session) return;
      try {
        const res = await getClient().rpc(session, 'get_leaderboard', { limit: 50 });
        if (res.payload) {
          const parsed = typeof res.payload === 'string' ? JSON.parse(res.payload) : res.payload;
          setEntries(parsed.records || []);
        }
      } catch (e) {
        console.error('Failed to fetch leaderboard:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [session]);

  const myUserId = session?.user_id;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-game-surface rounded-2xl p-6 shadow-2xl border border-game-card">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-game-gold flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Leaderboard
          </h2>
          <div className="w-6" />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 mx-auto mb-4 rounded-full border-4 border-game-card border-t-game-accent animate-spin" />
            <p className="text-gray-400 text-sm">Loading rankings...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">🏆</p>
            <p className="text-gray-400">No rankings yet. Play a game to get on the board!</p>
          </div>
        ) : (
          <div className="bg-game-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-700">
                  <th className="py-3 px-3 text-left">Rank</th>
                  <th className="py-3 px-3 text-left">Player</th>
                  <th className="py-3 px-3 text-center">W/L/D</th>
                  <th className="py-3 px-3 text-center">Games</th>
                  <th className="py-3 px-3 text-center">Streak</th>
                  <th className="py-3 px-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.userId}
                    className={`border-b border-gray-700/30 last:border-0 transition-colors hover:bg-game-surface/50 ${entry.userId === myUserId ? 'bg-game-accent/10' : ''}`}
                  >
                    <td className="py-3 px-3">
                      {entry.rank <= 3 ? (
                        <span className="text-lg">{entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}</span>
                      ) : (
                        <span className="text-gray-400">{entry.rank}</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-white font-medium">{entry.username}</span>
                      {entry.userId === myUserId && <span className="text-game-accent text-xs ml-1">(you)</span>}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="text-green-400">{entry.stats.wins}</span>
                      <span className="text-gray-600">/</span>
                      <span className="text-red-400">{entry.stats.losses}</span>
                      <span className="text-gray-600">/</span>
                      <span className="text-yellow-400">{entry.stats.draws}</span>
                    </td>
                    <td className="py-3 px-3 text-center text-gray-400">{entry.stats.totalMatches}</td>
                    <td className="py-3 px-3 text-center">
                      {entry.stats.streak > 0 ? (
                        <span className="text-game-gold">{entry.stats.streak}🔥</span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-game-accent font-bold">{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
