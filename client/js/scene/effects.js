// Spin animation and visual effects

import { GAME_CONFIG } from '../../../shared/constants.js';
import { highlightProcess, showScreenBSOD } from './screens.js';
import { highlightHologramProcess, showHologramBSOD } from './hologram.js';

/**
 * Execute the roulette spin animation
 * Returns a promise that resolves with the final selected index
 */
export function spinRoulette(
  playerId,
  processes,
  targetIndex,
  onTick = null
) {
  return new Promise((resolve) => {
    const activeProcesses = processes.filter(p => !p.isTerminated);
    const processCount = activeProcesses.length;

    if (processCount === 0) {
      resolve(-1);
      return;
    }

    let currentIndex = 0;
    let interval = GAME_CONFIG.MIN_SPIN_INTERVAL;
    const startTime = performance.now();
    const duration = GAME_CONFIG.SPIN_DURATION;

    function tick() {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Update highlighted process on screen and hologram
      highlightProcess(playerId, currentIndex);
      highlightHologramProcess(currentIndex);

      // Callback for external updates
      if (onTick) {
        onTick(currentIndex, activeProcesses[currentIndex]);
      }

      // Check if we've reached the end
      if (progress >= 1) {
        // Snap to target
        highlightProcess(playerId, targetIndex);
        highlightHologramProcess(targetIndex);
        if (onTick) {
          onTick(targetIndex, activeProcesses[targetIndex]);
        }
        resolve(targetIndex);
        return;
      }

      // Move to next process
      currentIndex = (currentIndex + 1) % processCount;

      // Calculate next interval with easing (slow down near the end)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      interval = GAME_CONFIG.MIN_SPIN_INTERVAL +
        (GAME_CONFIG.MAX_SPIN_INTERVAL - GAME_CONFIG.MIN_SPIN_INTERVAL) * easeOut;

      // Near the end, start targeting
      if (progress > 0.8) {
        // Bias towards target in final moments
        const stepsToTarget = (targetIndex - currentIndex + processCount) % processCount;
        if (stepsToTarget <= 3 && stepsToTarget > 0) {
          interval = Math.max(interval, 200);
        }
      }

      setTimeout(tick, interval);
    }

    // Start the spin
    tick();
  });
}

/**
 * Show BSOD effect on a player's screen and hologram
 */
export function triggerBSOD(playerId, failedProcessName) {
  showScreenBSOD(playerId, failedProcessName);
  showHologramBSOD(failedProcessName);
}

/**
 * Show full-screen BSOD overlay (for the loser's view)
 */
export function showFullScreenBSOD(failedProcessName) {
  const bsodElement = document.getElementById('bsod');
  const failedProcessSpan = document.getElementById('failed-process-name');
  const gameElement = document.getElementById('game');

  if (failedProcessSpan) {
    failedProcessSpan.textContent = failedProcessName;
  }

  if (gameElement) {
    gameElement.classList.add('hidden');
  }

  if (bsodElement) {
    bsodElement.classList.remove('hidden');
  }
}

/**
 * Show victory screen
 */
export function showVictoryScreen() {
  const victoryElement = document.getElementById('victory');
  const gameElement = document.getElementById('game');

  if (gameElement) {
    // Don't hide game - winner stays in 3D view
    // gameElement.classList.add('hidden');
  }

  if (victoryElement) {
    victoryElement.classList.remove('hidden');
  }
}

/**
 * Create a glitch effect on a screen (for termination animation)
 */
export function glitchEffect(duration = 500) {
  return new Promise((resolve) => {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
      resolve();
      return;
    }

    // Add glitch class for CSS effect
    canvas.classList.add('glitching');

    setTimeout(() => {
      canvas.classList.remove('glitching');
      resolve();
    }, duration);
  });
}

/**
 * Flash effect on process termination
 */
export function terminationFlash() {
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 0, 0, 0.2);
    pointer-events: none;
    z-index: 1000;
    animation: flashFade 0.3s ease-out forwards;
  `;

  // Add keyframes if not exists
  if (!document.getElementById('flash-keyframes')) {
    const style = document.createElement('style');
    style.id = 'flash-keyframes';
    style.textContent = `
      @keyframes flashFade {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(flash);

  setTimeout(() => {
    flash.remove();
  }, 300);
}
