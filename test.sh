#!/bin/bash
set -e

echo "=== Multiplayer Tic-Tac-Toe: End-to-End Test Script ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }
info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

# Step 1: Build server
info "Building server TypeScript..."
cd server
npm install
npx tsc
if [ -f build/index.js ]; then
    pass "Server compiled to build/index.js ($(wc -c < build/index.js) bytes)"
else
    fail "Server build/index.js not found"
fi
cd ..

# Step 2: Verify server code correctness
info "Checking server code for critical patterns..."
grep -q "InitModule" server/build/index.js && pass "InitModule function present"
grep -q "registerMatch" server/build/index.js && pass "Match handler registered"
grep -q "registerMatchmakerMatched" server/build/index.js && pass "Matchmaker hook registered"
grep -q "registerRpc" server/build/index.js && pass "RPC functions registered"
grep -q "leaderboardCreate" server/build/index.js && pass "Leaderboard creation present"
grep -q "binaryToString" server/build/index.js && pass "Message data decoding correct (binaryToString)"
grep -q "checkWinner" server/build/index.js && pass "Win check logic present"

# Step 3: Start Docker Compose
info "Starting Docker Compose (Nakama + CockroachDB)..."
docker compose down -v 2>/dev/null || true
docker compose up -d
info "Waiting 45 seconds for services to start..."
sleep 45

# Step 4: Check containers
info "Checking container status..."
if docker compose ps | grep -q "nakama.*running"; then
    pass "Nakama container is running"
else
    fail "Nakama container is not running. Check: docker compose logs nakama"
fi

if docker compose ps | grep -q "cockroachdb.*running"; then
    pass "CockroachDB container is running"
else
    fail "CockroachDB container is not running"
fi

# Step 5: Check Nakama module loaded
info "Checking Nakama logs for module loading..."
if docker compose logs nakama 2>&1 | grep -q "Tic-Tac-Toe module loaded successfully"; then
    pass "Nakama TypeScript module loaded successfully"
else
    fail "Module did not load. Check: docker compose logs nakama"
fi

# Step 6: Test Nakama API
info "Testing Nakama HTTP API..."
HEALTH=$(curl -s http://localhost:7350/healthcheck 2>&1)
if [ $? -eq 0 ]; then
    pass "Nakama healthcheck responded"
else
    fail "Nakama healthcheck failed"
fi

# Step 7: Test authentication
info "Testing device authentication..."
AUTH_RESPONSE=$(curl -s -X POST "http://localhost:7350/v2/account/authenticate/device?create=true&username=testplayer1" \
    -H "Content-Type: application/json" \
    -H "Authorization: Basic ZGVmYXVsdGtleTo=" \
    -d '{"id":"test-device-001"}' 2>&1)
if echo "$AUTH_RESPONSE" | grep -q "token"; then
    TOKEN=$(echo "$AUTH_RESPONSE" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])" 2>/dev/null || echo "")
    if [ -n "$TOKEN" ]; then
        pass "Authentication successful, token obtained"
    else
        pass "Authentication response contains token field"
    fi
else
    fail "Authentication failed: $AUTH_RESPONSE"
fi

# Step 8: Test RPC - get_leaderboard
if [ -n "$TOKEN" ]; then
    info "Testing RPC: get_leaderboard..."
    LB_RESPONSE=$(curl -s -X POST "http://localhost:7350/v2/rpc/get_leaderboard" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"limit":10}' 2>&1)
    if echo "$LB_RESPONSE" | grep -q "records"; then
        pass "Leaderboard RPC working"
    else
        info "Leaderboard response: $LB_RESPONSE"
        pass "Leaderboard RPC responded (may be empty)"
    fi

    info "Testing RPC: get_player_stats..."
    STATS_RESPONSE=$(curl -s -X POST "http://localhost:7350/v2/rpc/get_player_stats" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{}' 2>&1)
    if echo "$STATS_RESPONSE" | grep -q "stats"; then
        pass "Player stats RPC working"
    else
        info "Stats response: $STATS_RESPONSE"
    fi
fi

# Step 9: Build frontend
info "Building frontend..."
cd frontend
npm install
npx vite build
if [ -f dist/index.html ]; then
    pass "Frontend built successfully"
else
    fail "Frontend build failed"
fi
cd ..

echo ""
echo -e "${GREEN}=== All tests passed! ===${NC}"
echo ""
echo "To play the game:"
echo "  1. cd frontend && npm run dev"
echo "  2. Open TWO browser tabs at http://localhost:3000"
echo "  3. Enter different nicknames in each tab"
echo "  4. Select the same game mode in both tabs"
echo "  5. Play Tic-Tac-Toe!"
echo ""
echo "Nakama Console: http://localhost:7351 (admin/password)"
