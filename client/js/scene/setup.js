// Three.js scene initialization

import * as THREE from "three";

let scene, camera, renderer;
let animationCallbacks = [];

/**
 * Initialize the Three.js scene
 */
export function initScene(canvas) {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508); // Darker background

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Adjusted camera position for better view of the table
    // Moved up (y=3.5 -> 4.0) and slightly forward (z=9 -> 8.5) to look down more over the screen
    camera.position.set(0, 4.0, 8.5);
    camera.lookAt(0, 0, -2);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Enable bloom/glow effects in renderer if needed later via post-processing
    // For now standard rendering

    // Lighting
    setupLighting();

    // Environment (Table & Room)
    setupEnvironment();

    // Handle window resize
    window.addEventListener("resize", onWindowResize);

    // Start render loop
    animate();

    return { scene, camera, renderer };
}

/**
 * Set up scene lighting
 */
function setupLighting() {
    // Ambient light - low level cool blue
    const ambient = new THREE.AmbientLight(0x2a2a3e, 0.8); // Increased intensity and slightly brighter color
    scene.add(ambient);

    // Main spotlight from above (Cyberpunk style)
    const mainSpot = new THREE.SpotLight(0x4488ff, 1.5);
    mainSpot.position.set(0, 15, 0);
    mainSpot.angle = Math.PI / 4;
    mainSpot.penumbra = 0.5;
    mainSpot.decay = 2;
    mainSpot.distance = 50;
    mainSpot.castShadow = true;
    scene.add(mainSpot);

    // Accent lights for the table
    const bluePoint = new THREE.PointLight(0x00ffff, 0.8, 10);
    bluePoint.position.set(4, 2, 4);
    scene.add(bluePoint);

    const pinkPoint = new THREE.PointLight(0xff00ff, 0.5, 10);
    pinkPoint.position.set(-4, 2, -4);
    scene.add(pinkPoint);

    // Center hologram glow light
    const centerLight = new THREE.PointLight(0x00ffaa, 2, 8);
    centerLight.position.set(0, 0.5, 0);
    scene.add(centerLight);
}

/**
 * Set up environment (Hexagonal Table with hole)
 */
function setupEnvironment() {
    // 1. Create the Hexagonal Table with a hole in the middle
    // We can use a CylinderGeometry with 6 segments (hexagon)
    // To make a hole, we can use shape extrusion or just build segments

    const tableRadius = 6;
    const holeRadius = 2.5;
    const tableThickness = 0.4;
    const tableHeight = 0.8; // Height from floor

    // Create the table surface using a Shape with a hole
    const hexShape = new THREE.Shape();
    const segments = 6;

    for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = Math.cos(theta) * tableRadius;
        const y = Math.sin(theta) * tableRadius;
        if (i === 0) hexShape.moveTo(x, y);
        else hexShape.lineTo(x, y);
    }
    hexShape.closePath();

    // Create the hole
    const holePath = new THREE.Path();
    for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = Math.cos(theta) * holeRadius;
        const y = Math.sin(theta) * holeRadius;
        if (i === 0) holePath.moveTo(x, y);
        else holePath.lineTo(x, y);
    }
    holePath.closePath();
    hexShape.holes.push(holePath);

    const extrudeSettings = {
        depth: tableThickness,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.1,
        bevelSegments: 2,
    };

    const tableGeometry = new THREE.ExtrudeGeometry(hexShape, extrudeSettings);
    // Rotate to lie flat (Extrude defaults to Z depth)
    tableGeometry.rotateX(Math.PI / 2);

    const tableMaterial = new THREE.MeshStandardMaterial({
        color: 0x151520, // Dark metallic
        roughness: 0.2,
        metalness: 0.8,
        emissive: 0x050510,
        emissiveIntensity: 0.2,
    });

    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.y = tableHeight;
    // Rotate 30 degrees to align flat side to camera if desired, or keep point
    table.rotation.y = Math.PI / 6;
    scene.add(table);

    // 2. Table Legs / Support Structure
    // Angled supports going inward
    for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2 + Math.PI / 6;
        const x = Math.cos(theta) * (tableRadius - 1);
        const z = Math.sin(theta) * (tableRadius - 1);

        const legGeo = new THREE.BoxGeometry(0.5, tableHeight + 0.2, 0.5);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5 });
        const leg = new THREE.Mesh(legGeo, legMat);

        leg.position.set(x, tableHeight / 2, z);
        // Angle legs slightly inward for style
        leg.lookAt(0, tableHeight / 2, 0);
        leg.rotateX(0.2); // Tilt

        scene.add(leg);
    }

    // 3. Inner Ring (Hologram Base) inside the hole
    const innerRingGeo = new THREE.CylinderGeometry(holeRadius - 0.1, holeRadius - 0.1, 0.2, 6);
    const innerRingMat = new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.position.y = tableHeight - 0.1;
    innerRing.rotation.y = Math.PI / 6;
    scene.add(innerRing);

    // 4. Floor
    const floorGeometry = new THREE.PlaneGeometry(60, 60);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x050508,
        roughness: 0.8,
        metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // 5. Tech Grid on Floor
    const gridHelper = new THREE.GridHelper(40, 40, 0x003366, 0x000811);
    gridHelper.position.y = 0.01;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    scene.add(gridHelper);
}

/**
 * Handle window resize
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Register animation callback
 */
export function onAnimate(callback) {
    animationCallbacks.push(callback);
    return () => {
        animationCallbacks = animationCallbacks.filter((cb) => cb !== callback);
    };
}

/**
 * Render loop
 */
function animate(time) {
    requestAnimationFrame(animate);

    // Convert time to seconds
    const t = time * 0.001;

    // Run registered animations
    animationCallbacks.forEach((cb) => cb(t));

    renderer.render(scene, camera);
}

/**
 * Get scene instance
 */
export function getScene() {
    return scene;
}

/**
 * Get camera instance
 */
export function getCamera() {
    return camera;
}
