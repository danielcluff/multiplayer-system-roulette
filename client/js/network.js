// WebSocket client for multiplayer communication

import { MSG_TYPES } from '../../shared/constants.js';

let ws = null;
let playerId = null;
let messageHandlers = new Map();

/**
 * Get the WebSocket server URL based on current host
 */
function getServerUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname || 'localhost';
  return `${protocol}//${host}:3001`;
}

/**
 * Connect to the game server
 */
export function connect(serverUrl = getServerUrl()) {
  console.log('Connecting to server:', serverUrl);
  return new Promise((resolve, reject) => {
    try {
      ws = new WebSocket(serverUrl);

      ws.onopen = () => {
        console.log('Connected to server');
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      ws.onclose = () => {
        console.log('Disconnected from server');
        triggerHandler('disconnected', {});
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Handle incoming messages
 */
function handleMessage(message) {
  const { type, ...data } = message;

  switch (type) {
    case MSG_TYPES.WAITING:
      playerId = data.playerId;
      triggerHandler('waiting', data);
      break;

    case MSG_TYPES.GAME_START:
      // Server sends playerId in GAME_START message
      playerId = data.playerId;
      triggerHandler('gameStart', data);
      break;

    case MSG_TYPES.TURN_UPDATE:
      triggerHandler('turnUpdate', data);
      break;

    case MSG_TYPES.SPIN_RESULT:
      triggerHandler('spinResult', data);
      break;

    case MSG_TYPES.GAME_OVER:
      triggerHandler('gameOver', { ...data, myPlayerId: playerId });
      break;

    case MSG_TYPES.OPPONENT_DISCONNECTED:
      triggerHandler('opponentDisconnected', data);
      break;

    case MSG_TYPES.ERROR:
      triggerHandler('error', data);
      break;
  }
}

/**
 * Trigger a message handler
 */
function triggerHandler(event, data) {
  const handler = messageHandlers.get(event);
  if (handler) {
    handler(data);
  }
}

/**
 * Register a message handler
 */
export function on(event, handler) {
  messageHandlers.set(event, handler);
}

/**
 * Remove a message handler
 */
export function off(event) {
  messageHandlers.delete(event);
}

/**
 * Send a message to the server
 */
function send(type, data = {}) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...data }));
  }
}

/**
 * Join a game
 */
export function joinGame() {
  send(MSG_TYPES.JOIN);
}

/**
 * Request a spin
 */
export function requestSpin() {
  send(MSG_TYPES.SPIN);
}

/**
 * Get the current player ID
 */
export function getPlayerId() {
  return playerId;
}

/**
 * Check if connected
 */
export function isConnected() {
  return ws && ws.readyState === WebSocket.OPEN;
}

/**
 * Disconnect from the server
 */
export function disconnect() {
  if (ws) {
    ws.close();
    ws = null;
    playerId = null;
  }
}
