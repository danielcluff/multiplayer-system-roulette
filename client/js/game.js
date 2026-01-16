// Game logic and state management

import * as network from './network.js';
import { updateScreenProcesses, highlightProcess, showScreenBSOD, getScreen } from './scene/screens.js';
import { setHologramPlayer, updateHologramProcesses, highlightHologramProcess, showHologramBSOD } from './scene/hologram.js';
import { spinRoulette, showFullScreenBSOD } from './scene/effects.js';
import { GAME_CONFIG } from '../../shared/constants.js';

// Game state
const state = {
  playerId: null,
  processes: [],
  currentTurn: 1,
  isSpinning: false,
  gameOver: false,
};

// Screen position mapping
// Screen 1 = center, Screen 2 = right (60 deg), Screen 6 = left (300 deg)
const SCREEN_CENTER = 1;
const SCREEN_RIGHT = 2;
const SCREEN_LEFT = 6;

/**
 * Map a game player ID to a physical screen ID based on local player's perspective
 * Your screen is always in the center, opponent is to the side
 */
function getScreenIdForPlayer(targetPlayerId) {
  if (state.playerId === 1) {
    // Player 1's view: self = center, opponent (P2) = right
    return targetPlayerId === 1 ? SCREEN_CENTER : SCREEN_RIGHT;
  } else {
    // Player 2's view: self = center, opponent (P1) = left
    return targetPlayerId === 2 ? SCREEN_CENTER : SCREEN_LEFT;
  }
}

// UI Elements
let lobbyScreen, gameScreen, joinBtn, spinBtn, turnIndicator, processCount, currentPlayerSpan, myPlayerIdSpan;

/**
 * Initialize the game
 */
export function initGame() {
  // Get UI elements
  lobbyScreen = document.getElementById('lobby');
  gameScreen = document.getElementById('game');
  joinBtn = document.getElementById('join-btn');
  spinBtn = document.getElementById('spin-btn');
  turnIndicator = document.getElementById('turn-indicator');
  processCount = document.getElementById('count');
  currentPlayerSpan = document.getElementById('current-player');
  myPlayerIdSpan = document.getElementById('my-player-id');

  // Set up button handlers
  joinBtn.addEventListener('click', handleJoinClick);
  spinBtn.addEventListener('click', handleSpinClick);

  // Set up play again button
  const playAgainBtn = document.getElementById('play-again-btn');
  if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }

  // Set up fullscreen button
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', updateFullscreenButton);
  }

  // Set up network handlers
  setupNetworkHandlers();

  // Connect to server
  connectToServer();
}

/**
 * Connect to the game server
 */
async function connectToServer() {
  const statusEl = document.getElementById('lobby-status');

  try {
    await network.connect();
    if (statusEl) statusEl.textContent = 'Connected! Click to join a game.';
    if (joinBtn) joinBtn.disabled = false;
  } catch (err) {
    if (statusEl) statusEl.textContent = 'Failed to connect to server. Please try again.';
    console.error('Connection failed:', err);
  }
}

/**
 * Set up network message handlers
 */
function setupNetworkHandlers() {
  network.on('waiting', handleWaiting);
  network.on('gameStart', handleGameStart);
  network.on('turnUpdate', handleTurnUpdate);
  network.on('spinResult', handleSpinResult);
  network.on('gameOver', handleGameOver);
  network.on('opponentDisconnected', handleOpponentDisconnected);
  network.on('error', handleError);
}

/**
 * Handle join button click
 */
function handleJoinClick() {
  joinBtn.disabled = true;
  const statusEl = document.getElementById('lobby-status');
  if (statusEl) statusEl.textContent = 'Joining game...';
  network.joinGame();
}

/**
 * Handle spin button click
 */
function handleSpinClick() {
  if (state.isSpinning || state.gameOver) return;
  if (state.currentTurn !== state.playerId) return;

  spinBtn.disabled = true;
  network.requestSpin();
}

/**
 * Handle waiting for opponent
 */
function handleWaiting(data) {
  state.playerId = data.playerId;
  const statusEl = document.getElementById('lobby-status');
  if (statusEl) statusEl.textContent = `Waiting for opponent... (You are Player ${data.playerId})`;
}

/**
 * Handle game start
 */
function handleGameStart(data) {
  console.log('GAME_START received:', { playerId: data.playerId, currentTurn: data.currentTurn });

  state.playerId = data.playerId;
  state.processes = data.processes;
  state.currentTurn = data.currentTurn;
  state.gameOver = false;
  state.isSpinning = false;

  console.log('Game state after start:', { myPlayerId: state.playerId, currentTurn: state.currentTurn });

  // Switch to game screen
  lobbyScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');

  // Update both player screens with processes (mapped to correct physical screens)
  const myScreenId = getScreenIdForPlayer(state.playerId);
  const opponentId = state.playerId === 1 ? 2 : 1;
  const opponentScreenId = getScreenIdForPlayer(opponentId);

  updateScreenProcesses(myScreenId, state.processes);
  updateScreenProcesses(opponentScreenId, state.processes);

  // Set hologram to current player
  setHologramPlayer(state.currentTurn);
  updateHologramProcesses(state.processes);

  // Update UI
  updateUI();
}

/**
 * Handle turn update
 */
function handleTurnUpdate(data) {
  state.currentTurn = data.currentTurn;
  state.isSpinning = false;

  // Update hologram to show current spinner
  setHologramPlayer(state.currentTurn);

  updateUI();
}

/**
 * Handle spin result
 */
async function handleSpinResult(data) {
  const { playerId, targetIndex, selectedProcess, processes } = data;

  state.isSpinning = true;
  state.processes = processes;

  // Set hologram to spinning player
  setHologramPlayer(playerId);

  // Get the physical screen ID for the spinning player
  const spinningScreenId = getScreenIdForPlayer(playerId);

  // Get active processes for spin animation
  const activeProcesses = state.processes.filter(p => !p.isTerminated || p.id === selectedProcess.id);

  // Run spin animation on the correct physical screen
  await spinRoulette(spinningScreenId, { filter: () => activeProcesses }, targetIndex);

  // Update screens with new process list (mapped to correct physical screens)
  const myScreenId = getScreenIdForPlayer(state.playerId);
  const opponentId = state.playerId === 1 ? 2 : 1;
  const opponentScreenId = getScreenIdForPlayer(opponentId);

  updateScreenProcesses(myScreenId, state.processes);
  updateScreenProcesses(opponentScreenId, state.processes);
  updateHologramProcesses(state.processes);

  // Update process count
  updateProcessCount();
}

/**
 * Handle game over
 */
function handleGameOver(data) {
  state.gameOver = true;
  state.isSpinning = false;

  const { winner, loser, failedProcess, myPlayerId } = data;

  // Determine if this client is the loser
  const isLoser = loser === state.playerId;

  // Get the physical screen ID for the loser
  const loserScreenId = getScreenIdForPlayer(loser);

  if (isLoser) {
    // Show BSOD on this client's screen mesh (in 3D scene)
    showScreenBSOD(loserScreenId, failedProcess);
    showHologramBSOD(failedProcess);

    // Show full-screen BSOD overlay
    showFullScreenBSOD(failedProcess);
  } else {
    // Winner stays in game view
    // Show BSOD on loser's screen in 3D
    showScreenBSOD(loserScreenId, failedProcess);
    showHologramBSOD(failedProcess);
  }
}

/**
 * Handle opponent disconnect
 */
function handleOpponentDisconnected(data) {
  // Return to lobby
  state.gameOver = true;
  state.playerId = null;
  state.processes = [];

  gameScreen.classList.add('hidden');
  lobbyScreen.classList.remove('hidden');

  const statusEl = document.getElementById('lobby-status');
  if (statusEl) statusEl.textContent = 'Opponent disconnected. Click to join a new game.';
  if (joinBtn) joinBtn.disabled = false;
}

/**
 * Handle errors
 */
function handleError(data) {
  console.error('Game error:', data.message);
}

/**
 * Update UI elements
 */
function updateUI() {
  const isMyTurn = state.currentTurn === state.playerId;

  console.log('updateUI:', { myPlayerId: state.playerId, currentTurn: state.currentTurn, isMyTurn });

  // Show which player you are
  if (myPlayerIdSpan) {
    myPlayerIdSpan.textContent = `Player ${state.playerId}`;
  }

  // Update turn indicator
  if (currentPlayerSpan) {
    currentPlayerSpan.textContent = isMyTurn ? "Your Turn" : `Player ${state.currentTurn}'s Turn`;
  }

  if (turnIndicator) {
    turnIndicator.classList.toggle('your-turn', isMyTurn);
  }

  // Update spin button
  if (spinBtn) {
    spinBtn.disabled = !isMyTurn || state.isSpinning || state.gameOver;
  }

  updateProcessCount();
}

/**
 * Update process count display
 */
function updateProcessCount() {
  if (processCount) {
    const active = state.processes.filter(p => !p.isTerminated).length;
    processCount.textContent = active.toString();
  }
}

/**
 * Get current game state (for debugging)
 */
export function getState() {
  return { ...state };
}

/**
 * Toggle fullscreen mode
 */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

/**
 * Update fullscreen button icon based on state
 */
function updateFullscreenButton() {
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  if (fullscreenBtn) {
    fullscreenBtn.textContent = document.fullscreenElement ? '[x]' : '[ ]';
  }
}
