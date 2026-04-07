import { useState, useEffect } from 'react';
import { GameModeName } from '../types';

interface MatchmakingProps {
  gameMode: GameModeName;
  onCancel: () => void;
}

export default function Matchmaking({ gameMode, onCancel }: MatchmakingProps) {
  const [dots, setDots] = useState('');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    const timeInterval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(dotInterval);
      clearInterval(timeInterval);
    };
  }, []);

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <div className="bg-game-surface rounded-2xl p-8 shadow-2xl border border-game-card">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-game-card" />
            <div className="absolute inset-0 rounded-full border-4 border-t-game-accent animate-spin-slow" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">{gameMode === 'timed' ? '⏱️' : '🎮'}</span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">
            Finding a random player{dots}
          </h2>
          <p className="text-gray-400 text-sm">
            {gameMode === 'timed' ? 'Timed Mode' : 'Classic Mode'} - It usually takes 30 seconds
          </p>
        </div>

        <div className="mb-6">
          <p className="text-gray-500 text-sm">{elapsed}s elapsed</p>
        </div>

        <button
          onClick={onCancel}
          className="w-full bg-game-card hover:bg-gray-700 text-gray-300 font-semibold py-3 px-6 rounded-xl transition-all duration-200 border border-gray-700 active:scale-95"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
