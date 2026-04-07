import { useState, useEffect } from 'react';
import { ClientGameState } from '../types';

interface GameProps {
  gameState: ClientGameState;
  onSendMove: (position: number) => void;
}

function XMark({ size = 'normal' }: { size?: 'normal' | 'small' }) {
  const sz = size === 'small' ? 'w-4 h-4' : 'w-12 h-12 md:w-16 md:h-16';
  const sw = size === 'small' ? '3' : '4';
  return (
    <svg className={sz} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={sw} strokeLinecap="round">
      <line x1="4" y1="4" x2="20" y2="20" />
      <line x1="20" y1="4" x2="4" y2="20" />
    </svg>
  );
}

function OMark({ size = 'normal' }: { size?: 'normal' | 'small' }) {
  const sz = size === 'small' ? 'w-4 h-4' : 'w-12 h-12 md:w-16 md:h-16';
  const sw = size === 'small' ? '3' : '4';
  return (
    <svg className={sz} viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth={sw}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

export default function Game({ gameState, onSendMove }: GameProps) {
  const [localTimers, setLocalTimers] = useState<{ [uid: string]: number }>({});

  const {
    board, players, playerOrder, currentTurn,
    gameMode, playerTimers, myUserId, myMark,
  } = gameState;

  const isMyTurn = playerOrder[currentTurn] === myUserId;
  const currentPlayerId = playerOrder[currentTurn];
  const opponentId = playerOrder.find(id => id !== myUserId) || '';
  const myPlayer = players[myUserId];
  const opponentPlayer = players[opponentId];

  useEffect(() => {
    setLocalTimers({ ...playerTimers });
  }, [playerTimers]);

  useEffect(() => {
    if (gameMode !== 1) return;

    const interval = setInterval(() => {
      setLocalTimers(prev => {
        const updated = { ...prev };
        if (updated[currentPlayerId] !== undefined && updated[currentPlayerId] > 0) {
          updated[currentPlayerId] = Math.max(0, updated[currentPlayerId] - 1);
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameMode, currentPlayerId]);

  const handleCellClick = (position: number) => {
    if (!isMyTurn || board[position] !== 0) return;
    onSendMove(position);
  };

  const renderCell = (index: number) => {
    const value = board[index];
    const isEmpty = value === 0;
    const canClick = isMyTurn && isEmpty;

    return (
      <button
        key={index}
        onClick={() => handleCellClick(index)}
        disabled={!canClick}
        className={`
          aspect-square flex items-center justify-center
          bg-game-card rounded-xl border-2 transition-all duration-150
          ${canClick ? 'border-game-accent/30 hover:border-game-accent hover:bg-game-surface cursor-pointer active:scale-95' : 'border-gray-700/50 cursor-default'}
          ${!isEmpty ? 'border-gray-700/50' : ''}
        `}
      >
        {value === 1 && <XMark />}
        {value === 2 && <OMark />}
      </button>
    );
  };

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    return `${s}s`;
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Player info bar */}
      <div className="bg-game-surface rounded-2xl p-4 shadow-2xl border border-game-card mb-4">
        <div className="flex items-center justify-between">
          {/* My info */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isMyTurn ? 'bg-game-accent/10 border border-game-accent/30' : ''}`}>
            <div className="flex items-center gap-1">
              {myMark === 1 ? <XMark size="small" /> : <OMark size="small" />}
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{myPlayer?.username || 'You'}</p>
              <p className="text-gray-500 text-xs">(you)</p>
            </div>
          </div>

          <div className="text-gray-500 text-xs font-medium">VS</div>

          {/* Opponent info */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${!isMyTurn ? 'bg-game-accent/10 border border-game-accent/30' : ''}`}>
            <div>
              <p className="text-white text-sm font-semibold text-right">{opponentPlayer?.username || 'Opponent'}</p>
              <p className="text-gray-500 text-xs text-right">(opponent)</p>
            </div>
            <div className="flex items-center gap-1">
              {opponentPlayer?.mark === 1 ? <XMark size="small" /> : <OMark size="small" />}
            </div>
          </div>
        </div>
      </div>

      {/* Turn indicator */}
      <div className="text-center mb-4">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${isMyTurn ? 'bg-game-accent/20 text-game-accent' : 'bg-game-card text-gray-400'}`}>
          {isMyTurn ? (
            <>
              <div className="w-2 h-2 rounded-full bg-game-accent animate-pulse" />
              Your Turn
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-gray-500" />
              Opponent's Turn
            </>
          )}
        </div>
      </div>

      {/* Timer */}
      {gameMode === 1 && (
        <div className="flex justify-between mb-4 px-2">
          <div className={`text-sm font-mono ${currentPlayerId === myUserId ? 'text-game-accent' : 'text-gray-500'}`}>
            {formatTime(localTimers[myUserId] || 0)}
          </div>
          <div className={`text-sm font-mono ${currentPlayerId === opponentId ? 'text-game-accent' : 'text-gray-500'}`}>
            {formatTime(localTimers[opponentId] || 0)}
          </div>
        </div>
      )}

      {/* Game Board */}
      <div className="bg-game-surface rounded-2xl p-4 shadow-2xl border border-game-card">
        <div className="grid grid-cols-3 gap-3">
          {board.map((_, index) => renderCell(index))}
        </div>
      </div>
    </div>
  );
}
