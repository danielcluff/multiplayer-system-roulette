// Holographic projector that mirrors the current spinner's screen

import * as THREE from 'three';
import { getScene, onAnimate } from './setup.js';

const HOLOGRAM_WIDTH = 5.0; // Bigger (was 3.2)
const HOLOGRAM_HEIGHT = 3.5; // Bigger (was 2.4)
const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 384; // 4:3ish ratio

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
    // We'll use a curved plane (Cylinder segment) for a "high tech" feel
    // Actually, simple plane is easier to read, let's stick to plane but maybe multiple layers?
    // Let's go with a Plane but add a "tech frame" geometry around it
    const planeGeo = new THREE.PlaneGeometry(HOLOGRAM_WIDTH, HOLOGRAM_HEIGHT);
    
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.display = new THREE.Mesh(planeGeo, material);
    this.display.position.set(0, 3.5, 0); // Lift it up (was 2.5) to clear tilted screens
    
    // Create projector base (Fancy mechanism in the hole)
    this.createProjectorBase();

    // Create hologram glow effect & rays
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
    
    this.baseGroup = new THREE.Group();
    scene.add(this.baseGroup);

    // Main central emitter spike
    const spikeGeo = new THREE.ConeGeometry(0.2, 1.5, 8);
    const spikeMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.3,
        metalness: 0.9
    });
    this.spike = new THREE.Mesh(spikeGeo, spikeMat);
    this.spike.position.y = 0.5; // rising from hole
    this.baseGroup.add(this.spike);

    // Floating rings around the emitter
    const ringGeo = new THREE.TorusGeometry(0.8, 0.05, 6, 4); // Square-ish rings
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x0088ff, wireframe: true });
    
    this.rings = [];
    for(let i=0; i<3; i++) {
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 0.5 + (i * 0.3);
        ring.rotation.x = Math.PI / 2;
        ring.scale.set(1 - (i*0.2), 1 - (i*0.2), 1);
        this.baseGroup.add(ring);
        this.rings.push(ring);
    }
  }

  createGlowEffect() {
    const scene = getScene();
    
    // Vertical beam of light (Conical)
    const beamGeometry = new THREE.CylinderGeometry(3.5, 0.5, 6, 32, 1, true);
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.beam = new THREE.Mesh(beamGeometry, beamMaterial);
    this.beam.position.set(0, 3, 0);
    scene.add(this.beam);
    
    // Add spotlight at hologram location for scene illumination
    // Blue soft light (was Cyan 0x00ffff)
    this.holoLight = new THREE.PointLight(0x0088ff, 1.5, 15);
    this.holoLight.position.set(0, 3.5, 0);
    scene.add(this.holoLight);
  }

  createParticles() {
    const scene = getScene();

    // Create floating "data" particles rising up
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.random() * 1.5; // Radius within hole
      
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = Math.random() * 4; // Height
      positions[i * 3 + 2] = Math.sin(theta) * r;
      
      sizes[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1)); // We can use this in shader if we had custom shader

    const material = new THREE.PointsMaterial({
      color: 0x0088ff,
      size: 0.03,
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
    
    // Create floating text for Target Player
    // Separate from canvas texture so it's above/below
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    this.targetTextTexture = new THREE.CanvasTexture(canvas);
    this.targetTextTexture.minFilter = THREE.LinearFilter;
    
    const mat = new THREE.MeshBasicMaterial({
        map: this.targetTextTexture,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const geo = new THREE.PlaneGeometry(HOLOGRAM_WIDTH, HOLOGRAM_WIDTH * (64/512));
    this.targetTextLabel = new THREE.Mesh(geo, mat);
    
    // Position below the main display
    // Main display is at (0, 3.5, 0) with height 3.5. Bottom edge is at 3.5 - 1.75 = 1.75
    // Place label slightly below that.
    this.targetTextLabel.position.set(0, 1.4, 0); 
    
    // We want it to move with the display, so let's attach it to the display mesh if possible?
    // Or we just animate it in sync in animate()
    // Let's add it to scene for now and sync in animate to keep independent rotation control if needed
    scene.add(this.targetTextLabel);
    
    this.renderTargetLabel();
  }

  setCurrentPlayer(playerId) {
    this.currentPlayerId = playerId;
    this.render();
    this.renderTargetLabel();
  }
  
  renderTargetLabel() {
      if(!this.targetTextLabel) return;
      
      const canvas = this.targetTextTexture.image;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      
      ctx.clearRect(0, 0, w, h);
      
      ctx.font = 'bold 40px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0088ff';
      ctx.shadowColor = '#0088ff';
      ctx.shadowBlur = 10;
      ctx.fillText(`TARGET: PLAYER ${this.currentPlayerId}`, w/2, h/2 + 10);
      
      this.targetTextTexture.needsUpdate = true;
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
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = 'rgba(26, 36, 70, 0.6)'; // More blue in background (was 26,36,56)
    ctx.fillRect(0, 0, w, h);

    // Decorative Borders (Top) - Hologram Blue
    ctx.fillStyle = 'rgba(0, 136, 255, 0.6)'; // Blue 0x0088ff
    ctx.font = '14px monospace';
    const borderChar = 'P';
    const borderStr = borderChar.repeat(Math.floor(w / 10)); 
    ctx.textAlign = 'center';
    
    // Add glow to text
    ctx.shadowColor = '#0088ff';
    ctx.shadowBlur = 8;
    ctx.fillText(borderStr, w / 2, 20);

    // Header
    ctx.fillStyle = 'rgba(137, 180, 250, 0.9)'; // Light Blue
    ctx.font = 'bold 24px monospace';
    ctx.fillText('PID ROULETTE', w / 2, 50);
    
    // Removed TARGET: PLAYER text from inside screen
    // ctx.font = '16px monospace';
    // ctx.fillStyle = '#00ffaa';
    // ctx.fillText(`TARGET: PLAYER ${this.currentPlayerId}`, w/2, 75);

    // Process list - infinite scroll wheel with fixed center caret
    const activeProcesses = this.processes.filter(p => !p.isTerminated);
    const numProcesses = activeProcesses.length;

    if (numProcesses === 0) return;

    const rowHeight = 28;
    const listAreaTop = 70;
    const listAreaBottom = h - 40;
    const listAreaHeight = listAreaBottom - listAreaTop;
    const centerY = listAreaTop + listAreaHeight / 2;

    // Fixed caret/selection indicator in center (hologram blue style)
    ctx.fillStyle = 'rgba(0, 136, 255, 0.2)';
    ctx.shadowBlur = 0;
    ctx.fillRect(20, centerY - 14, w - 40, rowHeight);
    ctx.strokeStyle = 'rgba(0, 136, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, centerY - 14, w - 40, rowHeight);

    // Calculate how many rows above and below center we can show
    const rowsAbove = Math.ceil((centerY - listAreaTop) / rowHeight);
    const rowsBelow = Math.ceil((listAreaBottom - centerY) / rowHeight);

    const highlightIdx = this.highlightedIndex === -1 ? 0 : this.highlightedIndex;

    // Draw items as infinite scroll wheel (wrapping around)
    for (let offset = -rowsAbove; offset <= rowsBelow; offset++) {
      const y = centerY + offset * rowHeight;

      // Skip if outside visible area
      if (y < listAreaTop - 10 || y > listAreaBottom + 10) continue;

      // Calculate wrapped index (infinite scroll)
      let processIdx = (highlightIdx + offset) % numProcesses;
      if (processIdx < 0) processIdx += numProcesses;

      const process = activeProcesses[processIdx];
      const pidStr = process.pid.toString();
      const nameStr = process.name.length > 30 ? process.name.substring(0, 27) + '...' : process.name;
      const displayStr = `${pidStr}   ${nameStr}`;

      const isHighlighted = offset === 0;

      if (isHighlighted) {
        ctx.fillStyle = 'rgba(249, 226, 175, 1)'; // Yellow/Gold
        ctx.font = 'bold 18px monospace';
        ctx.shadowColor = '#f9e2af';
        ctx.shadowBlur = 15;
        ctx.fillText(`> ${displayStr} <`, w / 2, y);
      } else {
        // Fade out items further from center
        const distance = Math.abs(offset);
        const alpha = Math.max(0.3, 0.8 - distance * 0.12);
        ctx.fillStyle = `rgba(205, 214, 244, ${alpha})`;
        ctx.font = '18px monospace';
        ctx.shadowColor = '#0088ff';
        ctx.shadowBlur = 3;
        ctx.fillText(displayStr, w / 2, y);
      }
    }

    // Decorative Borders (Bottom)
    ctx.fillStyle = 'rgba(0, 136, 255, 0.6)';
    ctx.font = '14px monospace';
    const bottomBorder = 'L' + 'p'.repeat(Math.floor(w / 10));
    ctx.shadowBlur = 8;
    ctx.fillText(bottomBorder, w / 2, h - 20);

    ctx.textAlign = 'start';
    ctx.shadowBlur = 0;
    
    // Add scanlines for hologram effect
    ctx.fillStyle = 'rgba(0, 136, 255, 0.1)';
    for (let i = 0; i < h; i += 4) {
        ctx.fillRect(0, i, w, 2);
    }
    
    // Tech corners
    ctx.strokeStyle = '#0088ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 20, 20); // TL
    ctx.strokeRect(w-30, 10, 20, 20); // TR
    ctx.strokeRect(10, h-30, 20, 20); // BL
    ctx.strokeRect(w-30, h-30, 20, 20); // BR
  }

  renderBSOD() {
    const ctx = this.ctx;

    // Blue background with slight transparency
    ctx.fillStyle = 'rgba(0, 120, 215, 0.8)';
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
    // Spin the rings
    if (this.rings) {
        this.rings.forEach((ring, i) => {
            ring.rotation.z = time * (0.5 + i * 0.2);
            ring.rotation.x = Math.PI/2 + Math.sin(time + i) * 0.2;
        });
    }

    // Gentle float animation on display
    if (this.display) {
      const floatY = Math.sin(time * 1.5) * 0.1;
      this.display.position.y = 3.5 + floatY;
      // Make it always face camera?
      // this.display.lookAt(getCamera().position);
      // Or just slowly rotate
      this.display.rotation.y = Math.sin(time * 0.5) * 0.2;
      
      // Sync target label with float
      if (this.targetTextLabel) {
          // Keep label below display, moving in sync
          this.targetTextLabel.position.y = 1.4 + floatY;
          // Sync rotation too so it faces same way
          this.targetTextLabel.rotation.y = this.display.rotation.y;
      }
    }
    
    // Update particles
    if (this.particles) {
        const positions = this.particles.geometry.attributes.position.array;
        for(let i=0; i < positions.length / 3; i++) {
            // Move up
            positions[i*3 + 1] += 0.02;
            
            // Reset if too high
            if(positions[i*3 + 1] > 4) {
                positions[i*3 + 1] = 0;
            }
        }
        this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  dispose() {
    if (this.unsubscribeAnimate) {
      this.unsubscribeAnimate();
    }
    
    // Cleanup extra meshes
    if (this.targetTextLabel) {
        const scene = getScene();
        scene.remove(this.targetTextLabel);
        this.targetTextLabel.geometry.dispose();
        this.targetTextLabel.material.dispose();
        this.targetTextTexture.dispose();
    }
    
    if (this.holoLight) {
        const scene = getScene();
        scene.remove(this.holoLight);
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
