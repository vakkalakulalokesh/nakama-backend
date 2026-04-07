import { useState, useRef, useCallback, useEffect } from 'react';
import { Session, Socket, MatchData } from '@heroiclabs/nakama-js';
import { authenticate, connectSocket, decodeMatchData, disconnectSocket, getClient } from './nakama';
import {
  Screen, GameModeName, OpCode,
  ClientGameState, GameResult,
  MatchReadyData, StateUpdateData, GameDoneData, TimerData, PlayerStats,
} from './types';
import Login from './components/Login';
import Lobby from './components/Lobby';
import Matchmaking from './components/Matchmaking';
import Game from './components/Game';
import GameResultScreen from './components/GameResult';
import Leaderboard from './components/Leaderboard';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState('');
  const [gameMode, setGameMode] = useState<GameModeName>('classic');
  const [matchId, setMatchId] = useState('');
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [error, setError] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const matchIdRef = useRef('');
  const ticketRef = useRef('');

  useEffect(() => {
    matchIdRef.current = matchId;
  }, [matchId]);

  const setupSocketHandlers = useCallback((sock: Socket, userId: string) => {
    sock.onmatchdata = (result: MatchData) => {
      const data = decodeMatchData(result.data);
      const opCode = result.op_code;

      if (opCode === OpCode.MATCH_READY) {
        const ready = data as unknown as MatchReadyData;
        const myMark = ready.players[userId]?.mark || 0;
        setGameState({
          board: ready.board,
          players: ready.players,
          playerOrder: ready.playerOrder,
          currentTurn: ready.currentTurn,
          gameMode: ready.gameMode,
          playerTimers: ready.playerTimers || {},
          myUserId: userId,
          myMark: myMark,
        });
        setScreen('game');
      } else if (opCode === OpCode.STATE) {
        const update = data as unknown as StateUpdateData;
        setGameState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            board: update.board,
            currentTurn: update.currentTurn,
            playerTimers: update.playerTimers || prev.playerTimers,
          };
        });
      } else if (opCode === OpCode.DONE) {
        const done = data as unknown as GameDoneData;
        setGameState(prev => {
          if (!prev) return prev;
          setGameResult({
            winner: done.winner,
            winnerMark: done.winnerMark,
            reason: done.reason,
            board: done.board,
            players: prev.players,
            myUserId: prev.myUserId,
          });
          return { ...prev, board: done.board, playerTimers: done.playerTimers || prev.playerTimers };
        });
        setScreen('result');
      } else if (opCode === OpCode.TIMER) {
        const timer = data as unknown as TimerData;
        setGameState(prev => {
          if (!prev) return prev;
          return { ...prev, playerTimers: timer.playerTimers || prev.playerTimers };
        });
      } else if (opCode === OpCode.REJECTED) {
        console.warn('Move rejected:', (data as Record<string, unknown>).reason);
      }
    };

    sock.onmatchpresence = (_event) => {
      // presence updates handled by MATCH_READY
    };

    sock.ondisconnect = () => {
      console.warn('Socket disconnected');
    };
  }, []);

  const handleLogin = useCallback(async (name: string) => {
    try {
      setError('');
      const sess = await authenticate(name);
      setSession(sess);
      setUsername(sess.username || name);

      const sock = await connectSocket(sess);
      socketRef.current = sock;
      setupSocketHandlers(sock, sess.user_id!);

      setScreen('lobby');
    } catch (e) {
      setError('Failed to connect. Make sure Nakama server is running.');
      console.error('Login error:', e);
    }
  }, [setupSocketHandlers]);

  const handleQuickMatch = useCallback(async (mode: GameModeName) => {
    const sock = socketRef.current;
    if (!sock || !session) return;

    setGameMode(mode);
    setScreen('matchmaking');

    try {
      const matchmaker = await sock.addMatchmaker(
        '+properties.mode:' + mode,
        2,
        2,
        { mode: mode },
        {}
      );
      ticketRef.current = matchmaker.ticket;

      sock.onmatchmakermatched = async (matched) => {
        ticketRef.current = '';
        const mId = matched.match_id;
        if (mId) {
          setMatchId(mId);
          matchIdRef.current = mId;
          await sock.joinMatch(mId);
        } else if (matched.token) {
          const match = await sock.joinMatch(matched.token);
          setMatchId(match.match_id);
          matchIdRef.current = match.match_id;
        }
      };
    } catch (e) {
      setError('Failed to find match');
      setScreen('lobby');
      console.error('Matchmaking error:', e);
    }
  }, [session]);

  const handleCancelMatchmaking = useCallback(async () => {
    const sock = socketRef.current;
    if (sock && ticketRef.current) {
      try {
        await sock.removeMatchmaker(ticketRef.current);
      } catch (_e) {
        // ignore
      }
      ticketRef.current = '';
    }
    setScreen('lobby');
  }, []);

  const handleSendMove = useCallback(async (position: number) => {
    const sock = socketRef.current;
    const mId = matchIdRef.current;
    if (!sock || !mId) return;

    try {
      await sock.sendMatchState(mId, OpCode.MOVE, JSON.stringify({ position }));
    } catch (e) {
      console.error('Failed to send move:', e);
    }
  }, []);

  const handlePlayAgain = useCallback(async () => {
    const sock = socketRef.current;
    const mId = matchIdRef.current;

    if (sock && mId) {
      try {
        await sock.leaveMatch(mId);
      } catch (_e) {
        // ignore
      }
    }
    setMatchId('');
    setGameState(null);
    setGameResult(null);
    handleQuickMatch(gameMode);
  }, [gameMode, handleQuickMatch]);

  const handleBackToLobby = useCallback(async () => {
    const sock = socketRef.current;
    const mId = matchIdRef.current;

    if (sock && mId) {
      try {
        await sock.leaveMatch(mId);
      } catch (_e) {
        // ignore
      }
    }
    setMatchId('');
    setGameState(null);
    setGameResult(null);
    setScreen('lobby');
  }, []);

  const handleLogout = useCallback(async () => {
    await disconnectSocket();
    socketRef.current = null;
    setSession(null);
    setUsername('');
    setMatchId('');
    setGameState(null);
    setGameResult(null);
    setScreen('login');
  }, []);

  const fetchPlayerStats = useCallback(async (): Promise<PlayerStats | null> => {
    if (!session) return null;
    try {
      const result = await getClient().rpc(session, 'get_player_stats', {});
      if (result.payload) {
        const parsed = typeof result.payload === 'string' ? JSON.parse(result.payload) : result.payload;
        const stats = parsed.stats as PlayerStats;
        setPlayerStats(stats);
        return stats;
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
    return null;
  }, [session]);

  return (
    <div className="min-h-screen bg-game-bg flex flex-col items-center justify-center p-4">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-game-danger text-white px-6 py-3 rounded-lg z-50 max-w-sm text-center shadow-lg">
          {error}
          <button onClick={() => setError('')} className="ml-3 font-bold">×</button>
        </div>
      )}

      {screen === 'login' && <Login onLogin={handleLogin} />}
      {screen === 'lobby' && (
        <Lobby
          username={username}
          onQuickMatch={handleQuickMatch}
          onViewLeaderboard={() => setScreen('leaderboard')}
          onLogout={handleLogout}
          playerStats={playerStats}
          fetchStats={fetchPlayerStats}
        />
      )}
      {screen === 'matchmaking' && (
        <Matchmaking gameMode={gameMode} onCancel={handleCancelMatchmaking} />
      )}
      {screen === 'game' && gameState && (
        <Game gameState={gameState} onSendMove={handleSendMove} />
      )}
      {screen === 'result' && gameResult && (
        <GameResultScreen
          result={gameResult}
          session={session}
          onPlayAgain={handlePlayAgain}
          onBackToLobby={handleBackToLobby}
        />
      )}
      {screen === 'leaderboard' && (
        <Leaderboard session={session} onBack={() => setScreen('lobby')} />
      )}
    </div>
  );
}
