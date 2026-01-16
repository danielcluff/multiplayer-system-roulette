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
    scene.background = new THREE.Color(0x0a0a0f);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0.1, 8);
    camera.lookAt(0, 1, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting
    setupLighting();

    // Floor/environment
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
    // Ambient light
    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambient);

    // Main directional light
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 5);
    scene.add(directional);

    // Blue accent lights for atmosphere
    const blueLight1 = new THREE.PointLight(0x0066ff, 1, 20);
    blueLight1.position.set(-5, 3, 2);
    scene.add(blueLight1);

    const blueLight2 = new THREE.PointLight(0x00ffff, 0.5, 15);
    blueLight2.position.set(5, 3, 2);
    scene.add(blueLight2);

    // Hologram center light (will illuminate the projector)
    const centerLight = new THREE.PointLight(0x00ff88, 0.8, 10);
    centerLight.position.set(0, 2, 0);
    scene.add(centerLight);
}

/**
 * Set up basic environment
 */
function setupEnvironment() {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x111115,
        roughness: 0.8,
        metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // Grid helper for tech aesthetic
    const gridHelper = new THREE.GridHelper(20, 40, 0x003366, 0x001133);
    gridHelper.position.y = 0.01;
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
 * Register a callback to be called every frame
 */
export function onAnimate(callback) {
    animationCallbacks.push(callback);
    return () => {
        animationCallbacks = animationCallbacks.filter((cb) => cb !== callback);
    };
}

/**
 * Animation loop
 */
function animate() {
    requestAnimationFrame(animate);

    // Call all registered animation callbacks
    const time = performance.now() / 1000;
    animationCallbacks.forEach((callback) => callback(time));

    renderer.render(scene, camera);
}

/**
 * Get the scene
 */
export function getScene() {
    return scene;
}

/**
 * Get the camera
 */
export function getCamera() {
    return camera;
}

/**
 * Get the renderer
 */
export function getRenderer() {
    return renderer;
}
