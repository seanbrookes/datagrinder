<script setup>
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as d3 from 'd3';
import { defineProps, ref, watch, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  data: {
    type: Object,
    required: true,
    default: () => ({ name: 'root', children: [] })
  }
});

const container = ref(null);
const width = 600;
const height = 400;

// Centralized state for Three.js components
let scene, camera, renderer, simulation;
const controls = ref(null); 
let nodes, links;
let nodeMeshes = [], lineMeshes = [];

const colorMap = {
    'object': 0x4f46e5, // Indigo (Container)
    'array': 0x4f46e5, // Indigo (Container)
    'value': 0x059669, // Emerald (Value)
    'root': 0x1e3a8a  // Dark Blue (Root/DataRoot)
};

// Map node data to colors
const getNodeColor = (d) => {
    if (d.data.name === 'DataRoot') return colorMap.root;
    if (d.data.type === 'object' || d.data.type === 'array') return colorMap[d.data.type];
    return colorMap.value;
}

// Helper to clean up the scene
const clearScene = () => {
    if (scene) {
        // Dispose of materials and geometry
        scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        scene.children.length = 0; // Clear all objects from the scene
    }
    nodeMeshes = [];
    lineMeshes = [];
}

// --- CORE RENDER FUNCTION ---
const initThreeJs = (rootData) => {
    if (typeof d3 === 'undefined' || !container.value) {
        console.warn("D3.js library not loaded or container not available.");
        return;
    }

    clearScene();

    // 1. Setup Scene, Camera, Renderer
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc); // Tailwind light gray background
    
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 100;
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Clear the container before appending
    while (container.value.firstChild) {
        container.value.removeChild(container.value.firstChild);
    }
    container.value.appendChild(renderer.domElement);

    // 2. Add Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    camera.add(pointLight);
    scene.add(camera);

    // 3. Setup Orbit Controls (Now imported via ES module)
    controls.value = new OrbitControls(camera, renderer.domElement);
    controls.value.minDistance = 20;
    controls.value.maxDistance = 300;
    controls.value.enableDamping = true; // smooth rotation
    controls.value.dampingFactor = 0.05;
    controls.value.rotateSpeed = 0.5;

    // 4. Data Preparation
    const root = d3.hierarchy(rootData);
    links = root.links();
    nodes = root.descendants();

    // 5. Setup D3 Force Simulation (2D)
    simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(20).strength(0.8))
        .force("charge", d3.forceManyBody().strength(-10))
        .force("center", d3.forceCenter(0, 0));

    // 6. Create Three.js Objects
    const nodeGeometry = new THREE.SphereGeometry(3, 16, 16);
    
    nodes.forEach(d => {
        // Create Node Mesh
        const color = getNodeColor(d);
        const nodeMaterial = new THREE.MeshPhongMaterial({ color: color });
        const mesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
        
        // Use d.depth for Z separation to start with a non-flat layout
        d.z = d.depth * 5; 
        
        mesh.position.set(0, 0, d.z);
        scene.add(mesh);
        nodeMeshes.push({ data: d, mesh: mesh });
        
        mesh.userData.name = d.data.name;
    });

    // Create Line Meshes (Instanced or simple lines)
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc, linewidth: 2 });
    
    links.forEach(() => {
        const lineGeometry = new THREE.BufferGeometry();
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
        lineMeshes.push(line);
    });

    // 7. Animation Loop
    simulation.on("tick", updatePositions);
    // animate(); 
}

// Function to update the Three.js positions based on D3 simulation
const updatePositions = () => {
    // Update Node positions
    nodeMeshes.forEach(item => {
        item.mesh.position.x = item.data.x;
        item.mesh.position.y = item.data.y;
        // Z is fixed/layered
    });

    // Update Link positions
    lineMeshes.forEach((line, i) => {
        const link = links[i];
        
        // Define line points in 3D space
        const points = [];
        points.push(new THREE.Vector3(link.source.x, link.source.y, link.source.z));
        points.push(new THREE.Vector3(link.target.x, link.target.y, link.target.z));
        
        line.geometry.setFromPoints(points);
        line.geometry.attributes.position.needsUpdate = true;
    });
}

// Three.js main animation loop
const animate = () => {
    if (!renderer) return;

    requestAnimationFrame(animate);
    
    // Controls update is now safe and handled by the ref
    if (controls.value) {
        controls.value.update(); 
    }
    
    renderer.render(scene, camera);
}

// Watchers and lifecycle hooks
watch(() => props.data, (newData) => {
    // Restart the visualization whenever data changes
    if (newData && container.value) {
        // Wait for next tick to ensure any previous cleanup is complete
        setTimeout(() => initThreeJs(newData), 50); 
    }
}, { deep: true });

onMounted(() => {
    if (props.data) {
        initThreeJs(props.data);
    }
});

onBeforeUnmount(() => {
    // Clean up Three.js objects to prevent memory leaks
    if (renderer) {
        renderer.dispose();
        clearScene();
    }
    if (simulation) {
        simulation.stop();
    }
    if (controls.value) {
        controls.value.dispose();
    }
});
</script>

<template>
  <div class="three-visualizer-container">
    <div ref="container" :style="{ width: width + 'px', height: height + 'px' }">
      <!-- Three.js Canvas Renders Here -->
    </div>
    <div class="interaction-tip">
      <small>Use the mouse to rotate, pan, and zoom the 3D network.</small>
    </div>
  </div>
</template>

<style scoped>
.three-visualizer-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  background-color: #e2e8f0; /* Light border */
}

.interaction-tip {
    margin-top: 10px;
    color: #64748b;
    font-style: italic;
    font-size: 0.8rem;
}
</style>