// Player computer screen meshes with dynamic textures

import * as THREE from 'three';
import { getScene, onAnimate } from './setup.js';

const SCREEN_WIDTH = 3;
const SCREEN_HEIGHT = 2;
const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 342;

class PlayerScreen {
  constructor(playerId, position, rotation = 0) {
    this.playerId = playerId;
    this.processes = [];
    this.highlightedIndex = -1;
    this.showBSOD = false;

    // Create canvas for dynamic texture
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.ctx = this.canvas.getContext('2d');

    // Create texture from canvas
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;

    // Create screen mesh
    const geometry = new THREE.PlaneGeometry(SCREEN_WIDTH, SCREEN_HEIGHT);
    const material = new THREE.MeshStandardMaterial({
      map: this.texture,
      emissive: 0x111111,
      emissiveIntensity: 0.5,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.rotation.y = rotation;

    // Create monitor frame/bezel
    this.createMonitorFrame(position, rotation);

    // Initial render
    this.render();
  }

  createMonitorFrame(position, rotation) {
    const scene = getScene();

    // Bezel
    const bezelGeometry = new THREE.BoxGeometry(
      SCREEN_WIDTH + 0.3,
      SCREEN_HEIGHT + 0.3,
      0.1
    );
    const bezelMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.5,
      metalness: 0.3,
    });
    this.bezel = new THREE.Mesh(bezelGeometry, bezelMaterial);
    this.bezel.position.copy(position);
    this.bezel.position.z -= 0.06;
    this.bezel.rotation.y = rotation;

    // Stand
    const standGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    this.stand = new THREE.Mesh(standGeometry, bezelMaterial);
    this.stand.position.copy(position);
    this.stand.position.y -= SCREEN_HEIGHT / 2 + 0.4;
    this.stand.position.z -= 0.1;

    // Base
    const baseGeometry = new THREE.BoxGeometry(1, 0.1, 0.6);
    this.base = new THREE.Mesh(baseGeometry, bezelMaterial);
    this.base.position.copy(position);
    this.base.position.y -= SCREEN_HEIGHT / 2 + 0.8;
    this.base.position.z -= 0.1;

    scene.add(this.bezel);
    scene.add(this.stand);
    scene.add(this.base);
  }

  addToScene() {
    const scene = getScene();
    scene.add(this.mesh);
  }

  setProcesses(processes) {
    this.processes = processes;
    this.render();
  }

  setHighlightedIndex(index) {
    this.highlightedIndex = index;
    this.render();
  }

  setBSOD(show, failedProcessName = '') {
    this.showBSOD = show;
    this.failedProcessName = failedProcessName;
    this.render();
  }

  render() {
    const ctx = this.ctx;

    if (this.showBSOD) {
      this.renderBSOD();
    } else {
      this.renderProcessList();
    }

    // Update texture
    this.texture.needsUpdate = true;
  }

  renderProcessList() {
    const ctx = this.ctx;
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;

    // Background - Dark Terminal Color (Deep Blue/Black)
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 0, w, h);

    // Decorative Borders (Top)
    ctx.fillStyle = '#4a5a6a';
    ctx.font = '14px monospace';
    const borderChar = 'P';
    const borderStr = borderChar.repeat(Math.floor(w / 10)); 
    ctx.textAlign = 'center';
    ctx.fillText(borderStr, w / 2, 20);

    // Header
    ctx.fillStyle = '#89b4fa'; 
    ctx.font = 'bold 24px monospace';
    ctx.fillText('PID ROULETTE', w / 2, 50);

    // Process list
    const activeProcesses = this.processes.filter(p => !p.isTerminated);
    const rowHeight = 28;
    
    // Scroll logic to keep highlighted item in view
    const visibleCount = 8; // Number of items that fit comfortably
    let startIdx = 0;
    
    if (this.highlightedIndex >= visibleCount) {
      startIdx = this.highlightedIndex - (visibleCount - 1);
    }
    // Ensure we don't scroll past the end unnecessarily (though highlight dictates mostly)
    if (startIdx > activeProcesses.length - visibleCount) {
      startIdx = Math.max(0, activeProcesses.length - visibleCount);
    }
    
    // Refine startIdx if highlighted is specifically targeted to be centered or visible
    if (this.highlightedIndex !== -1) {
       // specific logic to ensure highlight is visible
       if (this.highlightedIndex < startIdx) startIdx = this.highlightedIndex;
       if (this.highlightedIndex >= startIdx + visibleCount) startIdx = this.highlightedIndex - visibleCount + 1;
    }

    const startY = 90;
    const visibleProcesses = activeProcesses.slice(startIdx, startIdx + visibleCount);

    visibleProcesses.forEach((process, i) => {
      const realIndex = startIdx + i;
      const y = startY + i * rowHeight;
      const isHighlighted = realIndex === this.highlightedIndex;

      // PID  Name format
      // Center aligned text
      
      const pidStr = process.pid.toString();
      const nameStr = process.name.length > 30 ? process.name.substring(0, 27) + '...' : process.name;
      const displayStr = `${pidStr}   ${nameStr}`;

      if (isHighlighted) {
        ctx.fillStyle = '#f9e2af'; // Yellow/Gold for highlight
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`> ${displayStr} <`, w / 2, y);
        
        // Add a subtle glow or box if desired, but text highlight is key
        ctx.shadowColor = '#f9e2af';
        ctx.shadowBlur = 10;
        ctx.fillText(`> ${displayStr} <`, w / 2, y);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#cdd6f4'; // Off-white/Grey
        ctx.font = '18px monospace';
        ctx.fillText(displayStr, w / 2, y);
      }
    });

    // Decorative Borders (Bottom)
    ctx.fillStyle = '#4a5a6a';
    ctx.font = '14px monospace';
    const bottomBorder = 'L' + 'p'.repeat(Math.floor(w / 10));
    ctx.fillText(bottomBorder, w / 2, h - 20);
    
    // Add green corner accents or similar if needed, 
    // strictly following the image's text-based feel.
    
    // Reset alignment
    ctx.textAlign = 'start';
  }

  renderBSOD() {
    const ctx = this.ctx;

    // Blue background
    ctx.fillStyle = '#0078d7';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Sad face
    ctx.fillStyle = '#ffffff';
    ctx.font = '60px sans-serif';
    ctx.fillText(':(', 30, 80);

    // Text
    ctx.font = '14px sans-serif';
    ctx.fillText('Your PC ran into a problem.', 30, 120);

    ctx.font = '10px sans-serif';
    ctx.fillText('Stop code: CRITICAL_PROCESS_DIED', 30, 280);
    ctx.fillText(`What failed: ${this.failedProcessName}`, 30, 300);
  }
}

// Store screen instances
let screens = {};

/**
 * Create player screens
 */
export function createPlayerScreens() {
  // Player 1 screen (left)
  screens[1] = new PlayerScreen(
    1,
    new THREE.Vector3(-3.5, 1.5, -2),
    Math.PI / 8
  );
  screens[1].addToScene();

  // Player 2 screen (right)
  screens[2] = new PlayerScreen(
    2,
    new THREE.Vector3(3.5, 1.5, -2),
    -Math.PI / 8
  );
  screens[2].addToScene();

  return screens;
}

/**
 * Get a player's screen
 */
export function getScreen(playerId) {
  return screens[playerId];
}

/**
 * Update a player's process list
 */
export function updateScreenProcesses(playerId, processes) {
  if (screens[playerId]) {
    screens[playerId].setProcesses(processes);
  }
}

/**
 * Highlight a process on a screen
 */
export function highlightProcess(playerId, index) {
  if (screens[playerId]) {
    screens[playerId].setHighlightedIndex(index);
  }
}

/**
 * Show BSOD on a screen
 */
export function showScreenBSOD(playerId, failedProcessName) {
  if (screens[playerId]) {
    screens[playerId].setBSOD(true, failedProcessName);
  }
}

/**
 * Get all screens
 */
export function getAllScreens() {
  return screens;
}
