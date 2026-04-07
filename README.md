# Multiplayer Tic-Tac-Toe with Nakama Backend

A production-ready, real-time multiplayer Tic-Tac-Toe game with **server-authoritative architecture** using [Nakama](https://heroiclabs.com/) as the backend infrastructure. The frontend is built with React + TypeScript + Tailwind CSS, optimized for mobile devices.

## Architecture & Design Decisions

```
┌────────────────────┐       WebSocket        ┌─────────────────────────┐
│   React Frontend   │ ◄───────────────────► │   Nakama Game Server     │
│  (Vite + Tailwind) │    Real-time comms     │  (TypeScript Runtime)    │
│                    │                        │                          │
│  • Login           │    HTTP/gRPC           │  • Match Handler         │
│  • Lobby           │ ◄───────────────────► │  • Matchmaking           │
│  • Game Board      │    REST API calls      │  • Leaderboard           │
│  • Leaderboard     │                        │  • Player Stats          │
│  • Game Result     │                        │  • Timer Management      │
└────────────────────┘                        └────────────┬─────────────┘
                                                           │
                                                           ▼
                                              ┌─────────────────────────┐
                                              │     CockroachDB         │
                                              │  (Persistent Storage)   │
                                              └─────────────────────────┘
```

### Key Design Choices

- **Server-Authoritative**: All game state management and move validation happens on the server. The client sends move intentions; the server validates, applies, and broadcasts the authoritative state. This prevents client-side cheating.
- **Nakama Authoritative Matches**: Uses Nakama's authoritative match handler for the game loop, running at 5 ticks/second for responsive gameplay.
- **Nakama Matchmaker**: Built-in matchmaker with query-based matching. Players are paired by game mode (classic vs. timed). The server `matchmakerMatched` hook automatically creates authoritative matches when players are paired.
- **Nakama Leaderboard + Storage**: Uses Nakama's built-in leaderboard system for global rankings and the storage engine for detailed player statistics (W/L/D, streaks).
- **React + Tailwind**: Single-page application with responsive mobile-first design. State management via React hooks (no external state library needed for this scope).
- **CockroachDB**: Distributed SQL database used by Nakama for persistence (matches, leaderboards, user data, storage objects).

## Features

### Core Features
- **Server-Authoritative Game Logic**: All moves validated server-side; clients receive authoritative state updates
- **Real-time Multiplayer**: WebSocket-based communication for instant game state updates
- **Automatic Matchmaking**: Queue-based matchmaker that pairs players by game mode
- **Game Room Support**: Create, discover, and join game rooms
- **Player Authentication**: Device-based authentication with custom usernames
- **Graceful Disconnect Handling**: Opponent wins on disconnect; matches cleaned up after timeout

### Bonus Features
- **Concurrent Game Support**: Multiple simultaneous matches with proper game room isolation via Nakama's match system
- **Leaderboard System**: Global ranking with W/L/D stats, win streaks, and score tracking
- **Timer-Based Game Mode**: 30-second turn timer with automatic forfeit on timeout, countdown displayed in UI
- **Responsive Mobile UI**: Dark-themed interface optimized for mobile and desktop

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS 3 |
| Backend | Nakama 3.21.1 (TypeScript runtime) |
| Database | CockroachDB (latest v23.1) |
| Client SDK | @heroiclabs/nakama-js 2.8.0 |
| Containerization | Docker Compose |

## Project Structure

```
nakama-backend/
├── docker-compose.yml          # Nakama + CockroachDB services
├── Makefile                    # Build/run shortcuts
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── types/
│   │   └── nakama-runtime/     # Nakama runtime type definitions (bundled)
│   ├── src/
│   │   └── main.ts             # Server-side game logic (match handler, RPCs, leaderboard)
│   └── build/
│       └── index.js            # Compiled JS loaded by Nakama
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   ├── .env                    # Nakama connection config
│   └── src/
│       ├── App.tsx             # Main app with screen routing
│       ├── nakama.ts           # Nakama client service
│       ├── types.ts            # Shared type definitions
│       └── components/
│           ├── Login.tsx       # Username entry screen
│           ├── Lobby.tsx       # Game mode selection + stats
│           ├── Matchmaking.tsx # Finding opponent screen
│           ├── Game.tsx        # Game board with real-time play
│           ├── GameResult.tsx  # Win/lose/draw screen + mini leaderboard
│           └── Leaderboard.tsx # Global rankings table
└── README.md
```

## Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v16+ and npm
- [Docker](https://www.docker.com/) and Docker Compose

### 1. Clone the Repository

```bash
git clone <repository-url>
cd nakama-backend
```

### 2. Build the Server Module

The Nakama runtime type definitions are bundled in `server/types/nakama-runtime/` so no extra downloads are needed.

```bash
cd server
npm install
npx tsc
cd ..
```

### 3. Start Nakama Server

```bash
docker compose up -d
```

Wait ~30 seconds for CockroachDB and Nakama to initialize. Check logs:

```bash
docker compose logs nakama
```

You should see: `Tic-Tac-Toe module loaded successfully`

Nakama Console is available at: http://localhost:7351 (default credentials: admin/password)

### 4. Install & Run Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at: http://localhost:3000

### Quick Start (Makefile)

```bash
make build       # Build server + frontend
make start       # Start Docker containers
make dev-frontend # Run frontend dev server
```

## API / Server Configuration

### Nakama Server
| Service | Port | Description |
|---------|------|-------------|
| HTTP API | 7350 | REST API and WebSocket |
| gRPC API | 7349 | gRPC interface |
| Console | 7351 | Admin dashboard |
| CockroachDB | 26257 | Database |

### Server Key
Default server key: `defaultkey` (configure in docker-compose.yml)

### RPC Endpoints
| RPC ID | Description | Payload |
|--------|-------------|---------|
| `find_match` | Find or create a match | `{"mode": 0}` (0=classic, 1=timed) |
| `get_leaderboard` | Get top players | `{"limit": 20}` |
| `get_player_stats` | Get current player's stats | `{}` |

### Match OpCodes
| Code | Direction | Description |
|------|-----------|-------------|
| 1 (MOVE) | Client → Server | Send move `{"position": 0-8}` |
| 2 (STATE) | Server → Client | Board state update |
| 3 (DONE) | Server → Client | Game over with result |
| 4 (REJECTED) | Server → Client | Invalid move rejected |
| 5 (TIMER) | Server → Client | Timer update (timed mode) |
| 7 (MATCH_READY) | Server → Client | Both players joined, game starts |

### Environment Variables (Frontend)
Configure in `frontend/.env`:
```
VITE_NAKAMA_HOST=localhost
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_SSL=false
VITE_NAKAMA_SERVER_KEY=defaultkey
```

## How to Test Multiplayer

### Local Testing (Two Browser Tabs)

1. Start the Nakama server: `docker compose up -d`
2. Start the frontend: `cd frontend && npm run dev`
3. Open **two browser tabs** at http://localhost:3000
4. In Tab 1: Enter a nickname (e.g., "Alice") and click Continue
5. In Tab 2: Enter a different nickname (e.g., "Bob") and click Continue
6. In both tabs: Select "Classic Mode" or "Timed Mode" and click the button
7. Both players will be matched automatically
8. Play the game! Take turns clicking cells
9. After the game ends, check the leaderboard

### Testing Scenarios

- **Normal Game**: Play a full game to win/draw. Verify scores update.
- **Timed Mode**: Select timed mode. Wait for the 30s timer to expire and verify auto-forfeit.
- **Disconnect**: Close one tab during a game. The other player should win automatically.
- **Concurrent Games**: Open 4+ tabs and start multiple games simultaneously.
- **Leaderboard**: Play multiple games and verify W/L/D stats and rankings.
- **Invalid Moves**: Try clicking an occupied cell or clicking when it's not your turn (should be blocked by UI).

## Deployment

### Deploy to a Cloud Provider (AWS/GCP/Azure/DigitalOcean)

#### Option 1: Docker Compose on a VM

1. **Provision a VM** (e.g., AWS EC2 t3.medium, DigitalOcean 2GB Droplet)

2. **Install Docker & Docker Compose** on the VM

3. **Clone the repository** on the VM:
   ```bash
   git clone <repository-url>
   cd nakama-backend
   ```

4. **Build the server module**:
   ```bash
   make build-server
   ```

5. **Update docker-compose.yml** for production:
   - Set strong database passwords
   - Update `--session.token_expiry_sec`
   - Set `--logger.level INFO`

6. **Start the server**:
   ```bash
   docker compose up -d
   ```

7. **Build and deploy the frontend**:
   ```bash
   cd frontend
   # Update .env with your server's public IP/domain
   echo "VITE_NAKAMA_HOST=your-server-domain.com" > .env.production
   echo "VITE_NAKAMA_PORT=7350" >> .env.production
   echo "VITE_NAKAMA_SSL=true" >> .env.production
   echo "VITE_NAKAMA_SERVER_KEY=defaultkey" >> .env.production
   npm run build
   ```

8. **Serve the frontend** using nginx, Vercel, Netlify, or any static hosting:
   ```bash
   # Using nginx
   cp -r dist/* /var/www/html/
   ```

#### Option 2: Deploy Frontend to Vercel/Netlify

1. Push the `frontend/` directory to a Git repository
2. Connect to Vercel/Netlify
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variables for Nakama connection

### Production Checklist

- [ ] Use HTTPS/WSS (set `VITE_NAKAMA_SSL=true`)
- [ ] Configure firewall (open ports 7350, 7351 only as needed)
- [ ] Set strong `--socket.server_key` in Nakama config
- [ ] Use persistent storage volume for CockroachDB
- [ ] Set up monitoring/logging
- [ ] Configure CORS if frontend is on a different domain

## Scoring System

| Outcome | Points |
|---------|--------|
| Win | +200 |
| Draw | +50 |
| Loss | +0 |

The leaderboard ranks players by total accumulated score. Player statistics (wins, losses, draws, current streak, best streak) are tracked persistently.

## License

MIT
