// Player computer screen meshes with dynamic textures

import * as THREE from "three";
import { getScene, onAnimate } from "./setup.js";

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

        // Create root group for the whole screen assembly
        this.root = new THREE.Group();
        this.root.position.copy(position);
        this.root.rotation.y = rotation;

        // Create a "head" group for the tilting part (Screen + Bezel)
        this.head = new THREE.Group();
        // Tilt the screen back 45 degrees (console style)
        this.head.rotation.x = -Math.PI / 4;
        this.root.add(this.head);

        // Create canvas for dynamic texture
        this.canvas = document.createElement("canvas");
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
        this.ctx = this.canvas.getContext("2d");

        // Create texture from canvas
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.LinearFilter;

        // Create screen mesh
        const geometry = new THREE.PlaneGeometry(SCREEN_WIDTH, SCREEN_HEIGHT);
        // Use MeshBasicMaterial to make it self-illuminated (ignores lighting)
        // or MeshStandardMaterial with high emissive.
        const material = new THREE.MeshStandardMaterial({
            map: this.texture,
            emissive: 0xffffff, // White emissive base allows color map to shine through fully
            emissiveMap: this.texture, // Use the screen content itself as the emission source
            emissiveIntensity: 1.5, // Crank up the intensity
            roughness: 0.2,
            metalness: 0.8,
            side: THREE.FrontSide,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        // Mesh is centered in head group
        this.head.add(this.mesh);

        // Add CRT shader effect overlay (Scanlines mesh)
        this.createCRTOverlay();

        // Create monitor frame/bezel
        this.createMonitorFrame();

        // Initial render
        this.render();
    }

    createCRTOverlay() {
        // Simple scanline overlay using a semi-transparent repeated texture or just lines
        const geometry = new THREE.PlaneGeometry(SCREEN_WIDTH, SCREEN_HEIGHT);

        // Create a simple scanline texture procedurally
        const size = 128;
        const data = new Uint8Array(size * size * 4);
        for (let i = 0; i < size * size; i++) {
            const y = Math.floor(i / size);
            const isLine = y % 2 === 0;
            const alpha = isLine ? 20 : 0; // Very subtle lines

            data[i * 4] = 0;
            data[i * 4 + 1] = 0;
            data[i * 4 + 2] = 0;
            data[i * 4 + 3] = alpha;
        }
        const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        texture.needsUpdate = true;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 4); // Stretch vertically? No, repeat more lines

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.3,
            blending: THREE.MultiplyBlending,
            depthWrite: false,
        });

        const overlay = new THREE.Mesh(geometry, material);
        overlay.position.z = 0.01; // Slightly in front of screen
        this.mesh.add(overlay);
    }

    createMonitorFrame() {
        // Bezel (Part of Head)
        // Adjust bezel to be slightly larger than screen but pushed back so it frames it without overlapping front
        const bezelGeometry = new THREE.BoxGeometry(SCREEN_WIDTH + 0.2, SCREEN_HEIGHT + 0.2, 0.1);
        const bezelMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.6,
            metalness: 0.4,
        });
        const bezel = new THREE.Mesh(bezelGeometry, bezelMaterial);
        bezel.position.z = -0.06; // Behind screen mesh (screen is at 0 in head)
        this.head.add(bezel);

        // Back casing (bulky CRT feel) - Part of Head
        const backGeometry = new THREE.ConeGeometry(SCREEN_WIDTH * 0.5, 1.2, 4);
        const backMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
        const back = new THREE.Mesh(backGeometry, backMaterial);
        // Point away from the screen (screen faces +Z, so back faces -Z)
        back.rotation.x = Math.PI / 2;
        back.rotation.z = Math.PI / 4; // Square it up
        back.position.z = -0.8;
        this.head.add(back);

        // Base/Stand (Part of Root, stays flat)
        // Since the screen is tilted 45 deg, let's make a wedge-like support or just a short stand
        // Removed protrusion that was overlapping screen

        // Removed the upper stand piece entirely as requested to ensure no overlap
        // const standGeometry = new THREE.BoxGeometry(0.6, 0.5, 0.4);
        // ...

        this.head.position.y = 0.2;

        // Base plate only
        const baseGeometry = new THREE.BoxGeometry(1.5, 0.1, 1.0);
        const base = new THREE.Mesh(baseGeometry, bezelMaterial);
        base.position.y = -0.65;
        base.position.z = -0.2;
        this.root.add(base);
    }

    addToScene() {
        const scene = getScene();
        scene.add(this.root);
    }

    setProcesses(processes) {
        this.processes = processes;
        this.render();
    }

    setHighlightedIndex(index) {
        this.highlightedIndex = index;
        this.render();
    }

    setBSOD(show, failedProcessName = "") {
        this.showBSOD = show;
        this.failedProcessName = failedProcessName;
        this.render();
    }

    render() {
        const ctx = this.ctx;
        const w = CANVAS_WIDTH;
        const h = CANVAS_HEIGHT;

        if (this.showBSOD) {
            this.renderBSOD();
        } else {
            this.renderProcessList(w, h);
        }

        // Update texture
        this.texture.needsUpdate = true;
    }

    renderProcessList(w, h) {
        const ctx = this.ctx;

        // Background - Dark Terminal Color (Deep Blue/Black)
        ctx.fillStyle = "#1a1a24";
        ctx.fillRect(0, 0, w, h);

        // Scanline effect (canvas level) - lighter alternate lines
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        for (let i = 0; i < h; i += 2) {
            ctx.fillRect(0, i, w, 1);
        }

        // Vignette
        const gradient = ctx.createRadialGradient(w / 2, h / 2, h / 3, w / 2, h / 2, h);
        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(1, "rgba(0,0,0,0.6)");
        ctx.fillStyle = gradient;

        // Decorative Borders (Top)
        ctx.fillStyle = "#4a5a6a";
        ctx.font = "14px monospace";
        const borderChar = "P";
        const borderStr = borderChar.repeat(Math.floor(w / 10));
        ctx.textAlign = "center";
        ctx.fillText(borderStr, w / 2, 20);

        // Header
        ctx.fillStyle = "#89b4fa";
        ctx.font = "bold 24px monospace";
        ctx.fillText("PID ROULETTE", w / 2, 50);

        // Process list - infinite scroll wheel with fixed center caret
        const activeProcesses = this.processes.filter((p) => !p.isTerminated);
        const numProcesses = activeProcesses.length;

        if (numProcesses === 0) return;

        const rowHeight = 28;
        const listAreaTop = 70;
        const listAreaBottom = h - 40;
        const listAreaHeight = listAreaBottom - listAreaTop;
        const centerY = listAreaTop + listAreaHeight / 2;

        // Fixed caret/selection indicator in center
        ctx.fillStyle = "rgba(249, 226, 175, 0.15)";
        ctx.fillRect(20, centerY - 14, w - 40, rowHeight);
        ctx.strokeStyle = "#f9e2af";
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
            const nameStr =
                process.name.length > 30 ? process.name.substring(0, 27) + "..." : process.name;
            const displayStr = `${pidStr}   ${nameStr}`;

            const isHighlighted = offset === 0;

            if (isHighlighted) {
                ctx.fillStyle = "#f9e2af"; // Yellow/Gold
                ctx.font = "bold 18px monospace";
                ctx.fillText(`> ${displayStr} <`, w / 2, y);
            } else {
                // Fade out items further from center
                const distance = Math.abs(offset);
                const alpha = Math.max(0.3, 1 - distance * 0.15);
                ctx.fillStyle = `rgba(205, 214, 244, ${alpha})`; // Off-white/Grey with fade
                ctx.font = "18px monospace";
                ctx.fillText(displayStr, w / 2, y);
            }
        }

        // Decorative Borders (Bottom)
        ctx.fillStyle = "#4a5a6a";
        ctx.font = "14px monospace";
        const bottomBorder = "L" + "p".repeat(Math.floor(w / 10));
        ctx.fillText(bottomBorder, w / 2, h - 20);

        // Apply vignette over text
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        ctx.textAlign = "start";
    }

    renderBSOD() {
        const ctx = this.ctx;

        // Blue background
        ctx.fillStyle = "#0078d7";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Sad face
        ctx.fillStyle = "#ffffff";
        ctx.font = "60px sans-serif";
        ctx.fillText(":(", 30, 80);

        // Text
        ctx.font = "14px sans-serif";
        ctx.fillText("Your PC ran into a problem.", 30, 120);

        ctx.font = "10px sans-serif";
        ctx.fillText("Stop code: CRITICAL_PROCESS_DIED", 30, 280);
        ctx.fillText(`What failed: ${this.failedProcessName}`, 30, 300);
    }
}

// Store screen instances
let screens = {};

/**
 * Create player screens
 */
export function createPlayerScreens() {
    // We want to position screens around a hexagonal table (radius ~6)
    // Screens should face AWAY from the center (so players standing outside see them)
    // OR facing towards center?
    // "each facing away from the center" -> implies players stand outside looking in at back of screens?
    // Wait, "facing away from the center" usually means screen surface points outward.
    // "You should be able to see the front of your own screen and the ones to the left and right"
    // This implies the camera is INSIDE looking out? Or camera is OUTSIDE looking at a screen that faces OUT?
    // Let's assume screens are on the perimeter facing OUTWARDS.
    // Camera is positioned to look at one screen (Player 1) and see neighbors.

    const tableRadius = 5;
    const height = 1.3; // Lower height slightly for console look (was 1.8)

    // Position Player 1 (Main View) - at angle 0 (or -PI/2 to be "front")
    // Let's put P1 at Z positive facing Z positive

    // Helper to calc position on circle
    // We have 6 spots.
    // 1: Center Front
    // 2: Right
    // 3: Back Right
    // 4: Back
    // 5: Back Left
    // 6: Left

    // Actually, let's just create 3 screens for now as per sketch (Left, Center, Right visible)
    // But for full multiplayer, we might want slots.
    // Let's place Player 1 at index 0 (0 degrees)
    // Player 2 at index 1 (60 degrees) or opposite?
    // Let's stick to 2 players for now but position them in a circle setup.

    // Player 1 (Center screen for camera)
    // Camera is at Z=9 looking at center.
    // Screen P1 is at Z=5 (edge of table radius 5).
    // Rotation 0 means plane normal points +Z (towards camera).
    // This is correct for Player 1 directly in front of camera.
    screens[1] = new PlayerScreen(1, new THREE.Vector3(0, height, tableRadius), 0);
    screens[1].addToScene();

    // Player 2 (Right neighbor)
    // We want P2 to be the screen to the RIGHT of P1.
    // In our circle, P1 is at angle 0 (0 degrees, positive Z axis).
    // Moving CLOCKWISE around the table (if looking from top) puts the next player to the right?
    // Wait, if I look at the table from +Z, right is +X.
    // Position (r*sin(theta), r*cos(theta)).
    // Theta=0 => (0, r). This is P1.
    // Theta=60deg (PI/3) => (0.86r, 0.5r). This is +X, +Z. This is to the RIGHT of P1.
    // So P2 should be at angle PI/3.
    // Rotation: The screen should face OUT from center.
    // The normal vector from center is (sin(ang), cos(ang)).
    // Plane default normal is (0,0,1).
    // If we rotate Y by ang, normal becomes (sin(ang), cos(ang)).
    // So rotation = ang.

    const ang2 = Math.PI / 3; // +60 deg
    screens[2] = new PlayerScreen(
        2,
        new THREE.Vector3(Math.sin(ang2) * tableRadius, height, Math.cos(ang2) * tableRadius),
        ang2
    );
    screens[2].addToScene();

    // Let's add dummy screens for the other slots to complete the look
    // We used 0 (P1) and PI/3 (P2).
    // Remaining angles: 2PI/3, PI, 4PI/3, 5PI/3.
    // i.e. 120, 180, 240, 300 degrees.

    const remainingAngles = [
        (2 * Math.PI) / 3, // 120
        Math.PI, // 180
        (4 * Math.PI) / 3, // 240
        (5 * Math.PI) / 3, // 300 (-60)
    ];

    let dummyId = 3;
    remainingAngles.forEach((ang) => {
        const dummy = new PlayerScreen(
            dummyId,
            new THREE.Vector3(Math.sin(ang) * tableRadius, height, Math.cos(ang) * tableRadius),
            ang
        );
        dummy.addToScene();
        screens[dummyId] = dummy;

        // Set some dummy data
        dummy.setProcesses([
            { pid: 3000 + dummyId, name: "SYSTEM_IDLE", isTerminated: false },
            { pid: 4000 + dummyId, name: "KERNEL_TASK", isTerminated: false },
        ]);
        dummyId++;
    });

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
