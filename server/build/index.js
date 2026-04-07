"use strict";
var OpCode = {
    MOVE: 1,
    STATE: 2,
    DONE: 3,
    REJECTED: 4,
    TIMER: 5,
    MATCH_READY: 7,
};
var GameMode = {
    CLASSIC: 0,
    TIMED: 1,
};
var LEADERBOARD_ID = "tic_tac_toe_ranking";
var STATS_COLLECTION = "player_stats";
var STATS_KEY = "stats";
var TURN_TIME_LIMIT = 30;
var TICK_RATE = 5;
function checkWinner(board) {
    var lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6],
    ];
    for (var i = 0; i < lines.length; i++) {
        var a = lines[i][0], b = lines[i][1], c = lines[i][2];
        if (board[a] !== 0 && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return 0;
}
function isBoardFull(board) {
    for (var i = 0; i < board.length; i++) {
        if (board[i] === 0)
            return false;
    }
    return true;
}
function getDefaultStats() {
    return {
        wins: 0,
        losses: 0,
        draws: 0,
        streak: 0,
        bestStreak: 0,
        totalMatches: 0,
        score: 0,
    };
}
function getNowSeconds() {
    return Math.floor(Date.now() / 1000);
}
var matchInit = function (ctx, logger, nk, params) {
    logger.info("Match init called");
    var gameMode = GameMode.CLASSIC;
    if (params && params["mode"]) {
        gameMode = parseInt(params["mode"]);
        if (isNaN(gameMode))
            gameMode = GameMode.CLASSIC;
    }
    var state = {
        board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        players: {},
        playerOrder: [],
        currentTurn: 0,
        gameOver: false,
        winner: null,
        gameMode: gameMode,
        moveCount: 0,
        lastMoveTime: 0,
        playerTimers: {},
        label: JSON.stringify({ mode: gameMode, open: 1, players: 0 }),
        emptyTicks: 0,
    };
    return {
        state: state,
        tickRate: TICK_RATE,
        label: state.label,
    };
};
var matchJoinAttempt = function (ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
    if (state.gameOver) {
        return { state: state, accept: false, rejectMessage: "Game is already over" };
    }
    var count = 0;
    for (var k in state.players) {
        if (state.players.hasOwnProperty(k))
            count++;
    }
    if (count >= 2) {
        return { state: state, accept: false, rejectMessage: "Match is full" };
    }
    return { state: state, accept: true };
};
var matchJoin = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    for (var i = 0; i < presences.length; i++) {
        var presence = presences[i];
        var userId = presence.userId;
        var username = presence.username;
        var playerCount = 0;
        for (var k in state.players) {
            if (state.players.hasOwnProperty(k))
                playerCount++;
        }
        var mark = playerCount === 0 ? 1 : 2;
        state.players[userId] = {
            odid: userId,
            username: username,
            mark: mark,
        };
        state.playerOrder.push(userId);
        if (state.gameMode === GameMode.TIMED) {
            state.playerTimers[userId] = TURN_TIME_LIMIT;
        }
        logger.info("Player joined: " + username + " as " + (mark === 1 ? "X" : "O"));
    }
    var totalPlayers = 0;
    for (var k in state.players) {
        if (state.players.hasOwnProperty(k))
            totalPlayers++;
    }
    state.label = JSON.stringify({
        mode: state.gameMode,
        open: totalPlayers < 2 ? 1 : 0,
        players: totalPlayers,
    });
    dispatcher.matchLabelUpdate(state.label);
    if (totalPlayers === 2) {
        state.lastMoveTime = getNowSeconds();
        var readyData = JSON.stringify({
            board: state.board,
            players: state.players,
            playerOrder: state.playerOrder,
            currentTurn: state.currentTurn,
            gameMode: state.gameMode,
            playerTimers: state.playerTimers,
        });
        dispatcher.broadcastMessage(OpCode.MATCH_READY, readyData);
        logger.info("Match ready - game starting");
    }
    return { state: state };
};
var matchLeave = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    for (var i = 0; i < presences.length; i++) {
        var presence = presences[i];
        var userId = presence.userId;
        logger.info("Player left: " + (state.players[userId] ? state.players[userId].username : userId));
        var totalPlayers = 0;
        for (var k in state.players) {
            if (state.players.hasOwnProperty(k))
                totalPlayers++;
        }
        if (!state.gameOver && totalPlayers === 2) {
            state.gameOver = true;
            var otherPlayerId = "";
            for (var j = 0; j < state.playerOrder.length; j++) {
                if (state.playerOrder[j] !== userId) {
                    otherPlayerId = state.playerOrder[j];
                    break;
                }
            }
            if (otherPlayerId && state.players[otherPlayerId]) {
                state.winner = otherPlayerId;
                var doneData = JSON.stringify({
                    board: state.board,
                    winner: state.winner,
                    winnerMark: state.players[otherPlayerId].mark,
                    reason: "opponent_left",
                });
                dispatcher.broadcastMessage(OpCode.DONE, doneData);
                updateLeaderboard(nk, logger, state);
            }
        }
        delete state.players[userId];
    }
    var remaining = 0;
    for (var k in state.players) {
        if (state.players.hasOwnProperty(k))
            remaining++;
    }
    if (remaining === 0) {
        return null;
    }
    return { state: state };
};
var matchLoop = function (ctx, logger, nk, dispatcher, tick, state, messages) {
    if (state.gameOver) {
        state.emptyTicks++;
        if (state.emptyTicks > TICK_RATE * 15) {
            return null;
        }
        return { state: state };
    }
    var playerCount = 0;
    for (var k in state.players) {
        if (state.players.hasOwnProperty(k))
            playerCount++;
    }
    if (playerCount < 2) {
        state.emptyTicks++;
        if (state.emptyTicks > TICK_RATE * 120) {
            return null;
        }
        return { state: state };
    }
    state.emptyTicks = 0;
    if (state.gameMode === GameMode.TIMED && state.moveCount > 0) {
        var currentPlayerId = state.playerOrder[state.currentTurn];
        var now = getNowSeconds();
        var elapsed = now - state.lastMoveTime;
        var timerVal = state.playerTimers[currentPlayerId] || TURN_TIME_LIMIT;
        var remaining = timerVal - elapsed;
        if (remaining <= 0) {
            state.gameOver = true;
            var otherIdx = state.currentTurn === 0 ? 1 : 0;
            state.winner = state.playerOrder[otherIdx];
            state.playerTimers[currentPlayerId] = 0;
            var doneData = JSON.stringify({
                board: state.board,
                winner: state.winner,
                winnerMark: state.players[state.winner].mark,
                reason: "timeout",
                playerTimers: state.playerTimers,
            });
            dispatcher.broadcastMessage(OpCode.DONE, doneData);
            updateLeaderboard(nk, logger, state);
            return { state: state };
        }
        if (tick % TICK_RATE === 0) {
            var timerUpdate = {};
            for (var tid in state.playerTimers) {
                if (state.playerTimers.hasOwnProperty(tid)) {
                    if (tid === currentPlayerId) {
                        timerUpdate[tid] = remaining;
                    }
                    else {
                        timerUpdate[tid] = state.playerTimers[tid];
                    }
                }
            }
            var timerData = JSON.stringify({
                currentPlayer: currentPlayerId,
                remainingTime: remaining,
                playerTimers: timerUpdate,
            });
            dispatcher.broadcastMessage(OpCode.TIMER, timerData);
        }
    }
    for (var mi = 0; mi < messages.length; mi++) {
        var message = messages[mi];
        var senderId = message.sender.userId;
        if (message.opCode !== OpCode.MOVE) {
            continue;
        }
        var moveData;
        try {
            moveData = JSON.parse(message.data);
        }
        catch (e) {
            dispatcher.broadcastMessage(OpCode.REJECTED, JSON.stringify({
                reason: "Invalid move data",
            }), [message.sender]);
            continue;
        }
        var position = moveData.position;
        var currentPlayerId = state.playerOrder[state.currentTurn];
        if (senderId !== currentPlayerId) {
            dispatcher.broadcastMessage(OpCode.REJECTED, JSON.stringify({
                reason: "Not your turn",
            }), [message.sender]);
            continue;
        }
        if (position < 0 || position > 8 || state.board[position] !== 0) {
            dispatcher.broadcastMessage(OpCode.REJECTED, JSON.stringify({
                reason: "Invalid position",
            }), [message.sender]);
            continue;
        }
        var playerMark = state.players[senderId].mark;
        state.board[position] = playerMark;
        state.moveCount++;
        if (state.gameMode === GameMode.TIMED) {
            var now = getNowSeconds();
            var elapsed = now - state.lastMoveTime;
            state.playerTimers[senderId] = Math.max(0, (state.playerTimers[senderId] || TURN_TIME_LIMIT) - elapsed);
            state.lastMoveTime = now;
        }
        var winner = checkWinner(state.board);
        if (winner !== 0) {
            state.gameOver = true;
            state.winner = senderId;
            var doneData = JSON.stringify({
                board: state.board,
                winner: state.winner,
                winnerMark: winner,
                reason: "win",
                playerTimers: state.playerTimers,
            });
            dispatcher.broadcastMessage(OpCode.DONE, doneData);
            updateLeaderboard(nk, logger, state);
            return { state: state };
        }
        if (isBoardFull(state.board)) {
            state.gameOver = true;
            state.winner = null;
            var doneData = JSON.stringify({
                board: state.board,
                winner: null,
                winnerMark: 0,
                reason: "draw",
                playerTimers: state.playerTimers,
            });
            dispatcher.broadcastMessage(OpCode.DONE, doneData);
            updateLeaderboard(nk, logger, state);
            return { state: state };
        }
        state.currentTurn = state.currentTurn === 0 ? 1 : 0;
        state.lastMoveTime = getNowSeconds();
        var stateData = JSON.stringify({
            board: state.board,
            currentTurn: state.currentTurn,
            currentPlayerId: state.playerOrder[state.currentTurn],
            moveCount: state.moveCount,
            lastMove: { position: position, mark: playerMark, playerId: senderId },
            playerTimers: state.playerTimers,
        });
        dispatcher.broadcastMessage(OpCode.STATE, stateData);
    }
    return { state: state };
};
var matchSignal = function (ctx, logger, nk, dispatcher, tick, state, data) {
    return { state: state, data: "signal_ok" };
};
var matchTerminate = function (ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
    logger.info("Match terminated");
    return { state: state };
};
function updateLeaderboard(nk, logger, state) {
    for (var pi = 0; pi < state.playerOrder.length; pi++) {
        var userId = state.playerOrder[pi];
        var player = state.players[userId];
        if (!player)
            continue;
        var stats = getDefaultStats();
        try {
            var result = nk.storageRead([{
                    collection: STATS_COLLECTION,
                    key: STATS_KEY,
                    userId: userId,
                }]);
            if (result && result.length > 0 && result[0].value) {
                var val = result[0].value;
                stats = {
                    wins: val.wins || 0,
                    losses: val.losses || 0,
                    draws: val.draws || 0,
                    streak: val.streak || 0,
                    bestStreak: val.bestStreak || 0,
                    totalMatches: val.totalMatches || 0,
                    score: val.score || 0,
                };
            }
        }
        catch (e) {
            logger.warn("Failed to read stats for " + userId + ": " + JSON.stringify(e));
        }
        stats.totalMatches++;
        var scoreIncrement = 0;
        if (state.winner === null) {
            stats.draws++;
            stats.streak = 0;
            scoreIncrement = 50;
        }
        else if (state.winner === userId) {
            stats.wins++;
            stats.streak++;
            if (stats.streak > stats.bestStreak) {
                stats.bestStreak = stats.streak;
            }
            scoreIncrement = 200;
        }
        else {
            stats.losses++;
            stats.streak = 0;
        }
        stats.score += scoreIncrement;
        try {
            nk.storageWrite([{
                    collection: STATS_COLLECTION,
                    key: STATS_KEY,
                    userId: userId,
                    value: {
                        wins: stats.wins,
                        losses: stats.losses,
                        draws: stats.draws,
                        streak: stats.streak,
                        bestStreak: stats.bestStreak,
                        totalMatches: stats.totalMatches,
                        score: stats.score,
                    },
                    permissionRead: 2,
                    permissionWrite: 0,
                }]);
        }
        catch (e) {
            logger.error("Failed to write stats for " + userId + ": " + JSON.stringify(e));
        }
        try {
            nk.leaderboardRecordWrite(LEADERBOARD_ID, userId, player.username, stats.score);
        }
        catch (e) {
            logger.error("Failed to write leaderboard for " + userId + ": " + JSON.stringify(e));
        }
        logger.info("Updated stats for " + player.username + ": W=" + stats.wins + " L=" + stats.losses + " D=" + stats.draws + " score=" + stats.score);
    }
}
var rpcFindMatch = function (ctx, logger, nk, payload) {
    var mode = GameMode.CLASSIC;
    if (payload && payload !== "") {
        try {
            var data = JSON.parse(payload);
            if (data.mode !== undefined) {
                mode = data.mode;
            }
        }
        catch (e) {
            // default
        }
    }
    try {
        var matches = nk.matchList(10, true, null, 0, 1, "+label.open:1 +label.mode:" + mode);
        if (matches && matches.length > 0) {
            return JSON.stringify({ matchId: matches[0].matchId });
        }
    }
    catch (e) {
        logger.warn("matchList failed: " + JSON.stringify(e));
    }
    var matchId = nk.matchCreate("tic_tac_toe", { mode: mode.toString() });
    return JSON.stringify({ matchId: matchId });
};
var rpcGetLeaderboard = function (ctx, logger, nk, payload) {
    var limit = 20;
    if (payload && payload !== "") {
        try {
            var data = JSON.parse(payload);
            if (data.limit)
                limit = Math.min(data.limit, 100);
        }
        catch (e) { }
    }
    try {
        var result = nk.leaderboardRecordsList(LEADERBOARD_ID, [], limit);
        var records = [];
        if (result && result.records) {
            for (var ri = 0; ri < result.records.length; ri++) {
                var record = result.records[ri];
                var stats = getDefaultStats();
                try {
                    var storageResult = nk.storageRead([{
                            collection: STATS_COLLECTION,
                            key: STATS_KEY,
                            userId: record.ownerId,
                        }]);
                    if (storageResult && storageResult.length > 0 && storageResult[0].value) {
                        var val = storageResult[0].value;
                        stats = {
                            wins: val.wins || 0,
                            losses: val.losses || 0,
                            draws: val.draws || 0,
                            streak: val.streak || 0,
                            bestStreak: val.bestStreak || 0,
                            totalMatches: val.totalMatches || 0,
                            score: val.score || 0,
                        };
                    }
                }
                catch (e) { }
                records.push({
                    rank: record.rank,
                    userId: record.ownerId,
                    username: record.username ? (typeof record.username === "object" ? record.username.value : record.username) : "Unknown",
                    score: record.score,
                    stats: stats,
                });
            }
        }
        return JSON.stringify({ records: records });
    }
    catch (e) {
        logger.error("Failed to get leaderboard: " + JSON.stringify(e));
        return JSON.stringify({ records: [] });
    }
};
var rpcGetPlayerStats = function (ctx, logger, nk, payload) {
    var userId = ctx.userId;
    var stats = getDefaultStats();
    try {
        var result = nk.storageRead([{
                collection: STATS_COLLECTION,
                key: STATS_KEY,
                userId: userId,
            }]);
        if (result && result.length > 0 && result[0].value) {
            var val = result[0].value;
            stats = {
                wins: val.wins || 0,
                losses: val.losses || 0,
                draws: val.draws || 0,
                streak: val.streak || 0,
                bestStreak: val.bestStreak || 0,
                totalMatches: val.totalMatches || 0,
                score: val.score || 0,
            };
        }
    }
    catch (e) {
        logger.warn("Failed to read stats: " + JSON.stringify(e));
    }
    var rank = 0;
    try {
        var records = nk.leaderboardRecordsList(LEADERBOARD_ID, [userId], 1);
        if (records && records.ownerRecords && records.ownerRecords.length > 0) {
            rank = records.ownerRecords[0].rank;
        }
    }
    catch (e) { }
    return JSON.stringify({ stats: stats, rank: rank });
};
var matchmakerMatched = function (ctx, logger, nk, matches) {
    var mode = "0";
    if (matches && matches.length > 0) {
        var entry = matches[0];
        var props = entry.stringProperties || entry.properties || {};
        if (props["mode"] === "timed") {
            mode = "1";
        }
    }
    var matchId = nk.matchCreate("tic_tac_toe", { mode: mode });
    logger.info("Matchmaker created authoritative match: " + matchId + " mode: " + mode);
    return matchId;
};
var InitModule = function (ctx, logger, nk, initializer) {
    logger.info("Tic-Tac-Toe module loading...");
    try {
        nk.leaderboardCreate(LEADERBOARD_ID, false, "descending" /* nkruntime.SortOrder.DESCENDING */, "set" /* nkruntime.Operator.SET */);
        logger.info("Leaderboard created: " + LEADERBOARD_ID);
    }
    catch (e) {
        logger.info("Leaderboard already exists or error: " + JSON.stringify(e));
    }
    initializer.registerMatch("tic_tac_toe", {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLeave: matchLeave,
        matchLoop: matchLoop,
        matchSignal: matchSignal,
        matchTerminate: matchTerminate,
    });
    initializer.registerMatchmakerMatched(matchmakerMatched);
    initializer.registerRpc("find_match", rpcFindMatch);
    initializer.registerRpc("get_leaderboard", rpcGetLeaderboard);
    initializer.registerRpc("get_player_stats", rpcGetPlayerStats);
    logger.info("Tic-Tac-Toe module loaded successfully");
};
