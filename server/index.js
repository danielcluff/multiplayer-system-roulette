// WebSocket server for System Roulette multiplayer

import { WebSocketServer } from 'ws';
import { MSG_TYPES, GAME_CONFIG, CRITICAL_PROCESSES, PROCESS_PREFIXES, PROCESS_EXTENSIONS } from '../shared/constants.js';

const PORT = process.env.PORT || 3001;

// Simple ID generator
function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Game rooms storage
const rooms = new Map();
let roomIdCounter = 1;

// Create WebSocket server (listen on all interfaces)
const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' });

console.log(`System Roulette server running on port ${PORT}`);
console.log(`Accessible on the network at ws://<your-ip>:${PORT}`);

/**
 * Generate a process pool (server-side to ensure sync)
 */
function generateProcessPool(count = GAME_CONFIG.PROCESS_COUNT) {
  const processes = [];

  // Add some critical processes
  const criticalCount = Math.floor(Math.random() * 3) + 2;
  const shuffledCritical = [...CRITICAL_PROCESSES].sort(() => Math.random() - 0.5);

  for (let i = 0; i < criticalCount && i < shuffledCritical.length; i++) {
    processes.push({
      id: generateId(),
      name: shuffledCritical[i],
      pid: Math.floor(Math.random() * 60000) + 4,
      isCritical: true,
      isTerminated: false,
    });
  }

  // Fill with non-critical processes
  while (processes.length < count) {
    const prefix = PROCESS_PREFIXES[Math.floor(Math.random() * PROCESS_PREFIXES.length)];
    const ext = PROCESS_EXTENSIONS[Math.floor(Math.random() * PROCESS_EXTENSIONS.length)];
    const suffix = Math.random() > 0.5 ? `_${Math.floor(Math.random() * 10000)}` : '';
    const name = `${prefix}${suffix}${ext}`;

    if (!processes.some(p => p.name === name)) {
      processes.push({
        id: generateId(),
        name,
        pid: Math.floor(Math.random() * 60000) + 4,
        isCritical: false,
        isTerminated: false,
      });
    }
  }

  return processes.sort(() => Math.random() - 0.5);
}

/**
 * Create a new game room
 */
function createRoom() {
  const roomId = roomIdCounter++;
  // Randomly decide max spins before forced BSOD (5 or 6)
  const maxSpins = Math.random() < 0.5 ? 5 : 6;
  const room = {
    id: roomId,
    players: [],
    processes: [],
    currentTurn: 1,
    gameStarted: false,
    gameOver: false,
    spinCount: 0,
    maxSpins: maxSpins,
  };
  rooms.set(roomId, room);
  console.log(`Created room ${roomId} with max spins: ${maxSpins}`);
  return room;
}

/**
 * Find an available room or create a new one
 */
function findOrCreateRoom() {
  // Look for a room waiting for a second player
  for (const room of rooms.values()) {
    if (room.players.length === 1 && !room.gameStarted) {
      return room;
    }
  }
  return createRoom();
}

/**
 * Send a message to a specific client
 */
function send(ws, type, data = {}) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, ...data }));
  }
}

/**
 * Broadcast to all players in a room
 */
function broadcast(room, type, data = {}) {
  room.players.forEach(player => {
    send(player.ws, type, data);
  });
}

/**
 * Start a game in a room
 */
function startGame(room) {
  room.gameStarted = true;
  room.processes = generateProcessPool();

  // Randomly decide who goes first
  room.currentTurn = Math.random() < 0.5 ? 1 : 2;

  console.log(`Starting game in room ${room.id}. First turn: Player ${room.currentTurn}`);
  console.log(`Players in room: ${room.players.map(p => `Player ${p.id}`).join(', ')}`);

  // Send personalized GAME_START to each player with their own playerId
  room.players.forEach(player => {
    console.log(`Sending GAME_START to Player ${player.id}`);
    send(player.ws, MSG_TYPES.GAME_START, {
      playerId: player.id,
      processes: room.processes,
      currentTurn: room.currentTurn,
    });
  });
}

/**
 * Handle a spin action
 */
function handleSpin(room, playerId) {
  if (room.gameOver) return;
  if (room.currentTurn !== playerId) {
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      send(player.ws, MSG_TYPES.ERROR, { message: 'Not your turn!' });
    }
    return;
  }

  // Increment spin count
  room.spinCount++;
  console.log(`Spin ${room.spinCount}/${room.maxSpins} in room ${room.id}`);

  // Get active processes
  const activeProcesses = room.processes.filter(p => !p.isTerminated);
  if (activeProcesses.length === 0) {
    // Shouldn't happen, but handle it
    room.gameOver = true;
    broadcast(room, MSG_TYPES.GAME_OVER, { winner: null, reason: 'No processes left' });
    return;
  }

  let selectedProcess;
  let targetIndex;

  // Force a critical process if we've reached max spins
  if (room.spinCount >= room.maxSpins) {
    console.log(`Forcing critical process selection in room ${room.id}`);
    const criticalProcesses = activeProcesses.filter(p => p.isCritical);
    if (criticalProcesses.length > 0) {
      selectedProcess = criticalProcesses[Math.floor(Math.random() * criticalProcesses.length)];
      targetIndex = activeProcesses.findIndex(p => p.id === selectedProcess.id);
    } else {
      // No critical processes left, pick random (shouldn't happen with proper setup)
      targetIndex = Math.floor(Math.random() * activeProcesses.length);
      selectedProcess = activeProcesses[targetIndex];
    }
  } else {
    // Normal random selection
    targetIndex = Math.floor(Math.random() * activeProcesses.length);
    selectedProcess = activeProcesses[targetIndex];
  }

  // Mark as terminated
  const processInList = room.processes.find(p => p.id === selectedProcess.id);
  if (processInList) {
    processInList.isTerminated = true;
  }

  // Check if critical
  if (selectedProcess.isCritical) {
    room.gameOver = true;
    const winnerId = playerId === 1 ? 2 : 1;

    broadcast(room, MSG_TYPES.SPIN_RESULT, {
      playerId,
      targetIndex,
      selectedProcess,
      processes: room.processes,
    });

    // Slight delay before game over announcement
    setTimeout(() => {
      broadcast(room, MSG_TYPES.GAME_OVER, {
        winner: winnerId,
        loser: playerId,
        failedProcess: selectedProcess.name,
      });
    }, GAME_CONFIG.SPIN_DURATION + 500);
  } else {
    // Switch turns
    room.currentTurn = playerId === 1 ? 2 : 1;

    broadcast(room, MSG_TYPES.SPIN_RESULT, {
      playerId,
      targetIndex,
      selectedProcess,
      processes: room.processes,
    });

    // Send turn update after spin completes
    setTimeout(() => {
      broadcast(room, MSG_TYPES.TURN_UPDATE, {
        currentTurn: room.currentTurn,
      });
    }, GAME_CONFIG.SPIN_DURATION + 200);
  }
}

/**
 * Handle player disconnect
 */
function handleDisconnect(ws) {
  for (const room of rooms.values()) {
    const playerIndex = room.players.findIndex(p => p.ws === ws);
    if (playerIndex !== -1) {
      const disconnectedPlayer = room.players[playerIndex];
      room.players.splice(playerIndex, 1);

      // Notify remaining player
      if (room.players.length > 0 && !room.gameOver) {
        broadcast(room, MSG_TYPES.OPPONENT_DISCONNECTED, {
          playerId: disconnectedPlayer.id,
        });
      }

      // Clean up empty rooms
      if (room.players.length === 0) {
        rooms.delete(room.id);
      }

      break;
    }
  }
}

// Handle new connections
wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case MSG_TYPES.JOIN: {
          const room = findOrCreateRoom();
          const playerId = room.players.length + 1;

          room.players.push({
            id: playerId,
            ws,
          });

          // Store room reference on ws for cleanup
          ws.room = room;
          ws.playerId = playerId;

          console.log(`Player ${playerId} joined room ${room.id}`);

          if (room.players.length === 1) {
            send(ws, MSG_TYPES.WAITING, { playerId, roomId: room.id });
          } else if (room.players.length === 2) {
            // Both players joined, start the game
            try {
              startGame(room);
            } catch (err) {
              console.error('Error starting game:', err);
            }
          }
          break;
        }

        case MSG_TYPES.SPIN: {
          if (ws.room && ws.playerId) {
            handleSpin(ws.room, ws.playerId);
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    handleDisconnect(ws);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});
