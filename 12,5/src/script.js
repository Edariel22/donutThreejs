// Import necessary Three.js modules and lil-gui
// (These imports work with a build tool like Vite)
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import GUI from 'lil-gui';

/**
 * Global Variables (Beginner Friendly Approach)
 * Making core elements accessible throughout the script
 */
let scene, camera, renderer, controls;
let loadedFont = null; // To store the loaded font
let textMesh = null;   // To store the 3D text object
let donutMeshes = [];  // Array to hold all donut objects for animation

/**
 * Configuration Object
 * Stores values controlled by the GUI
 */
const config = {
    donutColor: 0xff0000, // Default color for the GUI control
    textColor: 0xffffff,  // Default text color
    textValue: 'Hello :)' // Initial text content
};

/**
 * Basic Setup
 */
// Debugger GUI
const gui = new GUI();
// HTML Canvas element
const canvas = document.querySelector('canvas.webgl');
// Three.js Scene
scene = new THREE.Scene();
// Set a dark background color for the scene
scene.background = new THREE.Color('#111827'); // Dark Gray

/**
 * Textures (Optional but nice)
 */
const textureLoader = new THREE.TextureLoader();
let matcapTexture = null;
try {
    matcapTexture = textureLoader.load('/textures/matcaps/1.png'); // Path relative to public folder
    matcapTexture.colorSpace = THREE.SRGBColorSpace;
} catch (e) {
    console.warn("Could not load matcap texture. Using basic materials.");
}

/**
 * Function to create Text Geometry
 */
function createTextGeometry(text, font) {
    const geometryText = text.trim() === '' ? '...' : text; // Use placeholder if empty
    const geometry = new TextGeometry(geometryText, {
        font: font,
        size: 0.5,
        depth: 0.2,
        curveSegments: 5, // Lower detail for performance
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.02,
        bevelOffset: 0,
        bevelSegments: 3 // Lower detail for performance
    });
    geometry.center(); // Center the text origin
    return geometry;
}

/**
 * Function to create the 3D objects and setup GUI
 */
function setupSceneContent(font) {
    loadedFont = font; // Store the font

    // --- Create Text Object ---
    const textMaterial = matcapTexture
        ? new THREE.MeshMatcapMaterial({ matcap: matcapTexture, color: config.textColor })
        : new THREE.MeshBasicMaterial({ color: config.textColor }); // Fallback

    const initialTextGeometry = createTextGeometry(config.textValue, loadedFont);
    textMesh = new THREE.Mesh(initialTextGeometry, textMaterial);
    scene.add(textMesh);

    // --- Create Donut Objects ---
    const donutGeometry = new THREE.TorusGeometry(0.3, 0.2, 16, 32); // Slightly lower detail
    const donutColors = [0xff0000, 0xffa500, 0xffff00, 0x00ff00, 0x00ffff, 0x0000ff, 0x8a2be2]; // Rainbow

    // Clear existing donuts if this function is called again (e.g., hot reload)
    donutMeshes.forEach(donut => scene.remove(donut));
    donutMeshes = []; // Reset the array

    for (let i = 0; i < 100; i++) {
        const donutMaterial = matcapTexture
            ? new THREE.MeshMatcapMaterial({ matcap: matcapTexture, color: donutColors[i % donutColors.length] })
            : new THREE.MeshBasicMaterial({ color: donutColors[i % donutColors.length] });

        const donut = new THREE.Mesh(donutGeometry, donutMaterial);

        // Random position, rotation, scale
        donut.position.set((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15);
        donut.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        const scale = Math.random() * 0.7 + 0.3;
        donut.scale.set(scale, scale, scale);

        // Store random velocity for animation
        donut.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02
        );

        donutMeshes.push(donut); // Add to our global array
        scene.add(donut);
    }

    // --- Setup Debug GUI ---
    gui.folders.forEach(folder => folder.destroy()); // Clear old GUI folders

    // Text Controls
    const textFolder = gui.addFolder('Text');
    textFolder.addColor(config, 'textColor').name('Color').onChange(newColor => {
        textMesh.material.color.set(newColor); // Update material directly
    });

    textFolder.add(config, 'textValue').name('Content').onChange(newText => {
        if (textMesh && loadedFont) {
            textMesh.geometry.dispose(); // IMPORTANT: Free memory of old geometry
            textMesh.geometry = createTextGeometry(newText, loadedFont); // Create and assign new geometry
        }
    });

    // Donut Controls
    const donutFolder = gui.addFolder('Donuts');
    donutFolder.addColor(config, 'donutColor').name('Global Color').onChange(newColor => {
        // Access the global donutMeshes array
        donutMeshes.forEach(donut => {
            if (donut.material.color) {
                donut.material.color.set(newColor);
            }
        });
    });
}

/**
 * Sizes - Handle window resize
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

function handleResize() {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    // Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

/**
 * Camera Setup
 */
camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.set(1, 1, 5);
scene.add(camera);

/**
 * Controls Setup (Mouse Orbit)
 */
controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; // Makes movement smoother
controls.dampingFactor = 0.05;

/**
 * Renderer Setup
 */
renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true // Smoother edges
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Animation Loop (The heart of the application)
 */
const clock = new THREE.Clock(); // Timer

function animate() {
    const deltaTime = clock.getDelta(); // Time since last frame

    controls.update(); // Update controls if damping is enabled

    // Animate donuts
    donutMeshes.forEach(donut => {
        // Rotation
        donut.rotation.x += deltaTime * 0.5;
        donut.rotation.y += deltaTime * 0.5;

        // Movement
        donut.position.addScaledVector(donut.userData.velocity, deltaTime * 60); // Move based on velocity and time

        // Boundary Check (simple bounce)
        const boundary = 10;
        if (Math.abs(donut.position.x) > boundary) donut.userData.velocity.x *= -1;
        if (Math.abs(donut.position.y) > boundary) donut.userData.velocity.y *= -1;
        if (Math.abs(donut.position.z) > boundary) donut.userData.velocity.z *= -1;
    });

    // Render the scene
    renderer.render(scene, camera);

    // Request the next frame
    window.requestAnimationFrame(animate);
}

/**
 * Initialization Function
 * Loads assets and starts the application
 */
function init() {
    console.log("Initializing...");

    // Add resize listener
    window.addEventListener('resize', handleResize);

    // Load the font
    const fontLoader = new FontLoader();
    fontLoader.load(
        '/fonts/helvetiker_regular.typeface.json', // Path relative to public folder
        // SUCCESS: Font loaded
        (font) => {
            console.log('Font loaded.');
            setupSceneContent(font); // Create text, donuts, GUI
            handleResize();          // Set initial size
            animate();               // Start animation loop
        },
        // PROGRESS: Optional callback while loading
        () => { /* console.log('Font loading progress...'); */ },
        // ERROR: Font failed to load
        (error) => {
            console.error('Font loading error:', error);
            alert("Failed to load font. Check console and file path (public/fonts).");
        }
    );
}

// Start everything!
init();
