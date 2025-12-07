<script setup>
import * as d3 from 'd3';
import { defineProps, ref, watch, onMounted } from 'vue';

const props = defineProps({
  // This prop expects the parsed D3 hierarchy object, not the JSON string.
  data: {
    type: Object,
    required: true,
    default: () => ({ name: 'Empty', children: [] })
  }
});

const svgContainer = ref(null);

// Dimensions
const width = 500;
const margin = { top: 30, right: 90, bottom: 30, left: 90 };
const height = 500 - margin.top - margin.bottom;

// --- D3 Rendering Logic ---

// Function to render the D3 tree visualization
const drawTree = (rootData) => {
  // Check if d3 is available globally and if container is mounted
  if (typeof d3 === 'undefined' || !svgContainer.value) {
    console.warn("D3 library is not loaded or SVG container is not available.");
    return;
  }
  
  // Clear previous SVG content
  d3.select(svgContainer.value).selectAll("*").remove();

  // Setup SVG
  const svg = d3.select(svgContainer.value)
    .attr("width", '100%') // Make it fluid
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create the cluster layout (for a tidy tree)
  const treeLayout = d3.tree()
    .size([height, width - margin.left - margin.right]);

  // Create a hierarchical root node with D3 functions
  const root = d3.hierarchy(rootData, d => d.children);
  treeLayout(root);

  // Define the Link generator (creates the curved path)
  const linkPathGenerator = d3.linkHorizontal()
    .x(d => d.y)
    .y(d => d.x);

  // --- Draw Links ---
  svg.selectAll('.link')
    .data(root.links())
    .join('path')
    .attr('class', 'link')
    .attr('d', linkPathGenerator)
    .attr('fill', 'none')
    .attr('stroke', '#ccc')
    .attr('stroke-width', 1.5);

  // --- Draw Nodes ---
  const node = svg.selectAll('.node')
    .data(root.descendants())
    .join('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.y},${d.x})`);

  // Add Circles for Nodes
  node.append('circle')
    .attr('r', 6)
    .attr('fill', d => d.data.type === 'object' || d.data.type === 'array' ? '#4f46e5' : '#10b981')
    .attr('stroke', '#fff')
    .attr('stroke-width', 2);

  // Add Text Labels
  node.append('text')
    .attr('dy', '0.31em')
    .attr('x', d => d.children ? -12 : 12)
    .attr('text-anchor', d => d.children ? 'end' : 'start')
    .text(d => {
        const name = d.data.name || 'Root';
        const type = d.data.type || 'object';
        const value = d.data.value !== undefined && d.data.value !== null ? `: ${String(d.data.value).substring(0, 15)}...` : '';
        
        // Handle array items: only show value if it's a leaf node
        if (d.parent && d.parent.data.type === 'array' && !d.data.children) {
            return `${d.data.name.replace(/\[\d+\]/, '')}${value}`;
        }
        
        // Handle property nodes
        if (!d.data.children) {
            return `${name}${value}`;
        }
        
        // Container nodes (object/array)
        return `${name} (${type})`;
    })
    .attr('font-size', '12px')
    .attr('fill', '#333');
};

// Watch for changes in the data prop and redraw the tree
watch(() => props.data, (newData) => {
    if (newData) {
        drawTree(newData);
    }
}, { deep: true });

// Initial draw on mount
onMounted(() => {
    // We wrap the initial call in a timeout to ensure D3 is definitely loaded if it's loaded asynchronously
    // This is a common pattern when D3 is a global dependency.
    setTimeout(() => {
        if (props.data) {
            drawTree(props.data);
        }
    }, 100);
});

// Expose the drawTree function for manual re-draw if needed (not strictly required here)
defineExpose({ drawTree });
</script>

<template>
  <div class="d3-visualizer-container">
    <!-- SVG Element where D3 will draw the visualization -->
    <svg ref="svgContainer" class="d3-tree-svg"></svg>
  </div>
</template>

<style scoped>
.d3-visualizer-container {
  overflow-x: auto; /* Allows horizontal scrolling for large trees */
  min-height: 500px;
  width: 100%;
}

.d3-tree-svg {
  /* This height is controlled by D3 in JS, but setting a minimum helps */
  min-height: 500px;
}
</style>