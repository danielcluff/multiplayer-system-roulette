// Holographic projector that mirrors the current spinner's screen

import * as THREE from 'three';
import { getScene, onAnimate } from './setup.js';

const HOLOGRAM_WIDTH = 2.5;
const HOLOGRAM_HEIGHT = 1.8;
const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 368;

class HolographicProjector {
  constructor() {
    this.currentPlayerId = 1;
    this.processes = [];
    this.highlightedIndex = -1;
    this.showBSOD = false;
    this.failedProcessName = '';

    // Create canvas for dynamic texture
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.ctx = this.canvas.getContext('2d');

    // Create texture from canvas
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;

    // Create hologram display (semi-transparent floating panel)
    const geometry = new THREE.PlaneGeometry(HOLOGRAM_WIDTH, HOLOGRAM_HEIGHT);
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    this.display = new THREE.Mesh(geometry, material);
    this.display.position.set(0, 2.5, 0);

    // Create projector base
    this.createProjectorBase();

    // Create hologram glow effect
    this.createGlowEffect();

    // Create particle system
    this.createParticles();

    // Initial render
    this.render();

    // Register animation
    this.unsubscribeAnimate = onAnimate(this.animate.bind(this));
  }

  createProjectorBase() {
    const scene = getScene();

    // Pedestal cylinder
    const pedestalGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.5, 16);
    const pedestalMaterial = new THREE.MeshStandardMaterial({
      color: 0x333344,
      metalness: 0.8,
      roughness: 0.2,
    });
    this.pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
    this.pedestal.position.set(0, 0.25, 0);
    scene.add(this.pedestal);

    // Emitter ring on top
    const ringGeometry = new THREE.TorusGeometry(0.25, 0.05, 8, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      transparent: true,
      opacity: 0.8,
    });
    this.emitterRing = new THREE.Mesh(ringGeometry, ringMaterial);
    this.emitterRing.rotation.x = Math.PI / 2;
    this.emitterRing.position.set(0, 0.52, 0);
    scene.add(this.emitterRing);
  }

  createGlowEffect() {
    const scene = getScene();

    // Vertical beam of light
    const beamGeometry = new THREE.CylinderGeometry(0.1, 0.3, 2, 16, 1, true);
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    this.beam = new THREE.Mesh(beamGeometry, beamMaterial);
    this.beam.position.set(0, 1.5, 0);
    scene.add(this.beam);
  }

  createParticles() {
    const scene = getScene();

    // Create particle geometry
    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const radius = 0.5 + Math.random() * 0.5;
      const theta = Math.random() * Math.PI * 2;
      const y = Math.random() * 2;

      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = 0.5 + y;
      positions[i * 3 + 2] = Math.sin(theta) * radius;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x00ffaa,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geometry, material);
    scene.add(this.particles);
  }

  addToScene() {
    const scene = getScene();
    scene.add(this.display);
  }

  setCurrentPlayer(playerId) {
    this.currentPlayerId = playerId;
    this.render();
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

    this.texture.needsUpdate = true;
  }

  renderProcessList() {
    const ctx = this.ctx;
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;

    // Transparent dark background with blue tint for hologram feel
    ctx.fillStyle = 'rgba(26, 26, 36, 0.85)';
    ctx.fillRect(0, 0, w, h);

    // Decorative Borders (Top) - Hologram Blue/Cyan
    ctx.fillStyle = 'rgba(0, 255, 255, 0.6)'; // Cyan-ish
    ctx.font = '14px monospace';
    const borderChar = 'P';
    const borderStr = borderChar.repeat(Math.floor(w / 10)); 
    ctx.textAlign = 'center';
    
    // Add glow to text
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 8;
    ctx.fillText(borderStr, w / 2, 20);

    // Header
    ctx.fillStyle = 'rgba(137, 180, 250, 0.9)'; // Light Blue
    ctx.font = 'bold 24px monospace';
    ctx.fillText('PID ROULETTE', w / 2, 50);

    // Process list
    const activeProcesses = this.processes.filter(p => !p.isTerminated);
    const rowHeight = 28;
    
    // Scroll logic (same as screen)
    const visibleCount = 8; 
    let startIdx = 0;
    
    if (this.highlightedIndex >= visibleCount) {
      startIdx = this.highlightedIndex - (visibleCount - 1);
    }
    if (startIdx > activeProcesses.length - visibleCount) {
      startIdx = Math.max(0, activeProcesses.length - visibleCount);
    }
    
    if (this.highlightedIndex !== -1) {
       if (this.highlightedIndex < startIdx) startIdx = this.highlightedIndex;
       if (this.highlightedIndex >= startIdx + visibleCount) startIdx = this.highlightedIndex - visibleCount + 1;
    }

    const startY = 90;
    const visibleProcesses = activeProcesses.slice(startIdx, startIdx + visibleCount);

    visibleProcesses.forEach((process, i) => {
      const realIndex = startIdx + i;
      const y = startY + i * rowHeight;
      const isHighlighted = realIndex === this.highlightedIndex;

      const pidStr = process.pid.toString();
      const nameStr = process.name.length > 30 ? process.name.substring(0, 27) + '...' : process.name;
      const displayStr = `${pidStr}   ${nameStr}`;

      if (isHighlighted) {
        // Highlight logic
        ctx.fillStyle = 'rgba(249, 226, 175, 1)'; // Yellow/Gold
        ctx.font = 'bold 18px monospace';
        ctx.shadowColor = '#f9e2af';
        ctx.shadowBlur = 15; // Stronger glow for hologram highlight
        ctx.fillText(`> ${displayStr} <`, w / 2, y);
      } else {
        // Normal text
        ctx.fillStyle = 'rgba(205, 214, 244, 0.8)'; // Off-white/Grey, slight transparency
        ctx.font = '18px monospace';
        ctx.shadowColor = '#00ffff'; // Subtle blue glow for normal text
        ctx.shadowBlur = 3;
        ctx.fillText(displayStr, w / 2, y);
      }
    });

    // Decorative Borders (Bottom)
    ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
    ctx.font = '14px monospace';
    const bottomBorder = 'L' + 'p'.repeat(Math.floor(w / 10));
    ctx.shadowBlur = 8;
    ctx.fillText(bottomBorder, w / 2, h - 20);

    // Reset styles
    ctx.textAlign = 'start';
    ctx.shadowBlur = 0;
    
    // Add scanlines for hologram effect
    ctx.fillStyle = 'rgba(0, 255, 255, 0.03)';
    for (let i = 0; i < h; i += 4) {
        ctx.fillRect(0, i, w, 2);
    }
  }

  renderBSOD() {
    const ctx = this.ctx;

    // Blue background with slight transparency
    ctx.fillStyle = 'rgba(0, 120, 215, 0.95)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Glitch effect border
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(5, 5, CANVAS_WIDTH - 10, CANVAS_HEIGHT - 10);
    ctx.setLineDash([]);

    // Sad face
    ctx.fillStyle = '#ffffff';
    ctx.font = '80px sans-serif';
    ctx.fillText(':(', 30, 100);

    // Error text
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('SYSTEM FAILURE', 30, 150);

    ctx.font = '14px sans-serif';
    ctx.fillText('Critical process terminated', 30, 180);

    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#ff4444';
    ctx.fillText(`KILLED: ${this.failedProcessName}`, 30, 240);

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText('Stop code: CRITICAL_PROCESS_DIED', 30, 320);
  }

  animate(time) {
    // Rotate particles slowly
    if (this.particles) {
      this.particles.rotation.y = time * 0.3;
    }

    // Pulse the emitter ring
    if (this.emitterRing) {
      const pulse = 0.8 + Math.sin(time * 3) * 0.2;
      this.emitterRing.material.opacity = pulse;
    }

    // Gentle float animation on display
    if (this.display) {
      this.display.position.y = 2.5 + Math.sin(time * 1.5) * 0.05;
    }
  }

  dispose() {
    if (this.unsubscribeAnimate) {
      this.unsubscribeAnimate();
    }
  }
}

let hologramInstance = null;

/**
 * Create the holographic projector
 */
export function createHologram() {
  hologramInstance = new HolographicProjector();
  hologramInstance.addToScene();
  return hologramInstance;
}

/**
 * Get the hologram instance
 */
export function getHologram() {
  return hologramInstance;
}

/**
 * Update hologram to show a specific player's data
 */
export function setHologramPlayer(playerId) {
  if (hologramInstance) {
    hologramInstance.setCurrentPlayer(playerId);
  }
}

/**
 * Update hologram processes
 */
export function updateHologramProcesses(processes) {
  if (hologramInstance) {
    hologramInstance.setProcesses(processes);
  }
}

/**
 * Highlight a process on the hologram
 */
export function highlightHologramProcess(index) {
  if (hologramInstance) {
    hologramInstance.setHighlightedIndex(index);
  }
}

/**
 * Show BSOD on hologram
 */
export function showHologramBSOD(failedProcessName) {
  if (hologramInstance) {
    hologramInstance.setBSOD(true, failedProcessName);
  }
}
