import { useState } from 'react';

interface LoginProps {
  onLogin: (username: string) => Promise<void>;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || loading) return;
    setLoading(true);
    try {
      await onLogin(username.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-game-surface rounded-2xl p-8 shadow-2xl border border-game-card">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">
            <span className="inline-block animate-float">❌</span>
            <span className="inline-block animate-float" style={{ animationDelay: '0.5s' }}>⭕</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Tic-Tac-Toe</h1>
          <p className="text-gray-400 text-sm">Multiplayer</p>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-300 mb-1">Who are you?</h2>
          <p className="text-gray-500 text-sm">Enter a nickname to get started</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nickname"
            maxLength={20}
            className="w-full bg-game-card border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-game-accent focus:ring-1 focus:ring-game-accent transition-all mb-4"
            autoFocus
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!username.trim() || loading}
            className="w-full bg-game-accent hover:bg-game-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-game-bg font-bold py-3 px-6 rounded-xl transition-all duration-200 active:scale-95"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting...
              </span>
            ) : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
