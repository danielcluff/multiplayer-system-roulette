// Main entry point - initializes scene and game

import { initScene } from './scene/setup.js';
import { createPlayerScreens } from './scene/screens.js';
import { createHologram } from './scene/hologram.js';
import { initGame } from './game.js';

/**
 * Initialize the application
 */
async function init() {
  console.log('System Roulette initializing...');

  // Get canvas element
  const canvas = document.getElementById('game-canvas');

  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  // Initialize Three.js scene
  initScene(canvas);
  console.log('Scene initialized');

  // Create player screens
  createPlayerScreens();
  console.log('Player screens created');

  // Create holographic projector
  createHologram();
  console.log('Hologram projector created');

  // Initialize game logic and networking
  initGame();
  console.log('Game initialized');

  console.log('System Roulette ready!');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
