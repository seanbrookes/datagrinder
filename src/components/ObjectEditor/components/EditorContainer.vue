<script setup>
import { ref, computed } from 'vue';
// Ensure NodeEditor and dataHelpers.js are in the same directory path
import NodeEditor from './NodeEditor.vue';
import D3TreeVisualizer from './D3TreeVisualizer.vue';
import D3ForceVisualizer from './D3ForceVisualizer.vue';
import ThreeForceVisualizer from './ThreeForceVisualizer.vue';
import { createNode, treeToPlainObject, treeToD3Hierarchy, plainObjectToTree } from '../../../dataHelpers.js';
import JsonDataLoader from './JsonDataLoader.vue';
// --- State Management ---

const rootNode = ref(null);

const exampleData = {
  projectId: 7357,
  title: 'Data Grinder Example',
  config: {
    isLoaded: true,
    userCount: 5,
    updated: Date.now()
  },
  metrics: [
    { name: 'visits', value: 1024 },
    { name: 'sales', value: 42 }
  ],
  // Function is stored as a string to be editable and convertible
  process: '(a, b) => { return a * b; }'
};

// Simple helper to find a node recursively by ID (mutates the reactive tree)
function findNodeAndParent(id, current = rootNode.value, parent = null) {
  if (!current) return null;
  if (current.id === id) {
    return { node: current, parent };
  }
  if (current.children) {
    for (let i = 0; i < current.children.length; i++) {
      const result = findNodeAndParent(id, current.children[i], current);
      if (result) return result;
    }
  }
  return null;
}

// --- Actions ---

const handleAddChild = (parentId) => {
  const result = findNodeAndParent(parentId);
  if (result && ['object', 'array'].includes(result.node.type)) {
    const parentNode = result.node;
    const parentType = parentNode.type;
    const defaultName = parentType === 'object' ? 'newProp' : '';
    const newNode = createNode(defaultName, 'string', parentType);
    parentNode.children.push(newNode);
    parentNode.isCollapsed = false; // Expand when adding a child
    
    // For arrays, update the name index
    if (parentType === 'array') {
        parentNode.children.forEach((child, index) => {
            child.name = `[${index}]`;
        });
    }
  }
};

const handleDeleteNode = (nodeId) => {
  // Cannot delete the root node
  if (nodeId === rootNode.value.id) return;

  const result = findNodeAndParent(nodeId);
  if (result && result.parent) {
    const parent = result.parent;
    parent.children = parent.children.filter(n => n.id !== nodeId);
    
    // For arrays, re-index children after deletion
    if (parent.type === 'array') {
        parent.children.forEach((child, index) => {
            child.name = `[${index}]`;
        });
    }
  }
};

const loadInitialData = () => {
  // The root node itself is an object wrapping the actual data
  rootNode.value = plainObjectToTree(exampleData, 'DataRoot', 'object');
};

const resetToEmpty = () => {
  rootNode.value = createNode('emptyData', 'object', 'object');
  rootNode.value.children = [];
};

// Set initial data on load
loadInitialData();

// --- Output Conversions (Reactive) ---

// 1. Plain JS Object
const outputObject = computed(() => {
  // treeToPlainObject skips the root wrapper node and returns the content of its children
  return treeToPlainObject(rootNode.value);
});

// 2. JSON Output
const outputJson = computed(() => {
  try {
    return JSON.stringify(outputObject.value, (key, value) => {
      // Custom replacer to handle Function serialization for display
      if (typeof value === 'function') {
        return `[Function: ${value.name || 'anonymous'}]`;
      }
      return value;
    }, 2);
  } catch (error) {
    return `ERROR: Cannot convert to JSON. Circular reference detected or unsupported type: ${error.message}`;
  }
});

// 3. D3 Hierarchy Output
const outputD3Hierarchy = computed(() => {
  const d3Data = treeToD3Hierarchy(rootNode.value);
  try {
    return JSON.stringify(d3Data, null, 2);
  } catch (error) {
    return `ERROR: Cannot convert to D3 Hierarchy: ${error.message}`;
  }
});

/**
 * Handles the event when new JSON data is loaded from the component.
 * It replaces the current data set with the new one.
 * @param {object} newData - The parsed JavaScript object from the loaded JSON.
 */
 function handleNewDataLoaded(newData) {
  // Convert the plain JavaScript object into the tree structure used by the editor
  // We assume plainObjectToTree() exists in dataHelpers.js based on your file snippet.
  const newRoot = plainObjectToTree(newData);
  rootNode.value = newRoot;
  alert('New dataset loaded successfully!');
  // Optionally reset the node ID counter if you have one
}
</script>

<template>
  <div class="app-container">
    <div class="content-wrapper">
      <h1 class="header-title">
        Data Grinder: Object Editor
      </h1>
      <p class="header-description">
        Build a nested data structure. Output formats: **Plain JS**, **JSON**, and **D3 Hierarchy** are updated in real-time.
      </p>

      <div class="controls">
        <button 
          @click="loadInitialData" 
          class="btn primary-btn"
        >
          Load Example Data
        </button>
        <button 
          @click="resetToEmpty" 
          class="btn secondary-btn"
        >
          Reset to Empty Object
        </button>
      </div>

      <div class="grid-layout">
        
        <div class="editor-panel">
          <JsonDataLoader @data-loaded="handleNewDataLoaded" />
          <h2 class="panel-title editor-title">Data Structure Editor</h2>
          
          <NodeEditor 
            v-if="rootNode"
            :node="rootNode"
            :parent-type="'object'"
            @add-child="handleAddChild"
            @delete-node="handleDeleteNode"
          />
        </div>

        <div class="output-panel-wrapper">
          
          <div class="output-panel json-output">
            <h3 class="panel-title output-title-json">JSON Output</h3>
            <pre class="code-block">{{ outputJson }}</pre>
          </div>
          
          <div class="output-panel d3-output">
            <h3 class="panel-title output-title-d3">D3 Hierarchy</h3>
            <pre class="code-block">{{ outputD3Hierarchy }}</pre>
          </div>

          <div class="output-panel js-output">
            <h3 class="panel-title output-title-js">Plain JS Object (Console View)</h3>
            <pre class="code-block">{{ outputObject }}</pre>
          </div>

        </div>
      </div>
    </div>
    <div>
      Tree goes here
      <D3TreeVisualizer :data="JSON.parse(outputD3Hierarchy)" />
      force
      <D3ForceVisualizer :data="JSON.parse(outputD3Hierarchy)" />
      Three Force
      <ThreeForceVisualizer :data="JSON.parse(outputD3Hierarchy)" />
    </div>
  </div>
</template>

<style scoped>
/* Global styles for this component */
.app-container {
  padding: 30px;
  background-color: #f8fafc; /* Light Gray Background */
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

.header-title {
  font-size: 2.25rem;
  font-weight: 800;
  color: #1e3a8a; /* Dark Blue */
  margin-bottom: 8px;
  letter-spacing: -0.025em;
}

.header-description {
  color: #475569; /* Slate Gray */
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

/* Controls */
.controls {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
}

.btn {
  padding: 10px 20px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.primary-btn {
  background-color: #4f46e5; /* Indigo */
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
.primary-btn:hover {
  background-color: #4338ca; /* Darker Indigo */
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.secondary-btn {
  background-color: white;
  color: #475569;
  border: 2px solid #cbd5e1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.secondary-btn:hover {
  background-color: #f1f5f9;
}

/* Layout Grid (Responsive) */
.grid-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}

@media (min-width: 1024px) {
  .grid-layout {
    grid-template-columns: 3fr 2fr; /* 60/40 split on desktop */
  }
}

/* Panels */
.editor-panel {
  padding: 24px;
  border: 4px solid #e0e7ff; /* Light Indigo Border */
  border-radius: 1.5rem;
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
  background-color: white;
}

.output-panel-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.output-panel {
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  background-color: white;
}

.panel-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #e2e8f0;
}

.output-title-json {
  color: #b45309; /* Amber */
}
.output-title-d3 {
  color: #2563eb; /* Blue */
}
.output-title-js {
  color: #059669; /* Emerald */
}

/* Code Display */
.code-block {
  background-color: #1f2937; /* Dark Gray Code Block */
  color: #d1d5db; /* Light Gray Text */
  padding: 12px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
  overflow-x: auto;
  max-height: 200px;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
```eof