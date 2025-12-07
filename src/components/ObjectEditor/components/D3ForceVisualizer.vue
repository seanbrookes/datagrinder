<script setup>
import * as d3 from 'd3';
import { defineProps, ref, watch, onMounted, nextTick } from 'vue';

const props = defineProps({
  // This prop expects the parsed D3 hierarchy object
  data: {
    type: Object,
    required: true,
    default: () => ({ name: 'Empty', children: [] })
  }
});

const svgContainer = ref(null);
const width = 600;
const height = 400;

// Function to handle D3 drag events
function drag(simulation) {
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    // Keep node position fixed after drag release
    d.fx = null; 
    d.fy = null;
  }

  return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
}


// --- D3 Rendering Logic ---
const drawForceGraph = (rootData) => {
  if (typeof d3 === 'undefined' || !svgContainer.value) {
    console.warn("D3 library is not loaded or SVG container is not available.");
    return;
  }
  
  // Clear previous SVG content
  d3.select(svgContainer.value).selectAll("*").remove();

  // 1. Prepare data for force graph
  const root = d3.hierarchy(rootData);
  const links = root.links();
  const nodes = root.descendants();

  // 2. Initialize force simulation
  const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(50).strength(0.8))
      .force("charge", d3.forceManyBody().strength(-300)) // Repel nodes
      .force("center", d3.forceCenter(width / 2, height / 2)); // Center the graph

  // 3. Setup SVG
  const svg = d3.select(svgContainer.value)
      .attr("viewBox", [0, 0, width, height])
      .attr("width", '100%')
      .attr("height", '100%');

  // 4. Draw Links
  const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1.5);

  // 5. Draw Nodes
  const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(drag(simulation)); // Apply drag behavior

  // Add circles
  node.append("circle")
      .attr("r", 8)
      .attr("fill", d => d.data.type === 'object' || d.data.type === 'array' ? '#4f46e5' : '#10b981'); // Indigo/Emerald

  // Add labels
  node.append("text")
      .attr("x", 10)
      .attr("y", "0.31em")
      .text(d => d.data.name)
      .style("fill", "#cccccc")
      .attr("stroke", "#cccccc"); // Simple outline for readability

  // 6. Define tick function to update positions
  simulation.on("tick", () => {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node
        .attr("transform", d => `translate(${d.x}, ${d.y})`);
  });
};

// Watch for data changes
watch(() => props.data, (newData) => {
    if (newData) {
        // Use nextTick to ensure the DOM is ready before redrawing
        nextTick(() => drawForceGraph(newData));
    }
}, { deep: true });

// Initial draw on mount
onMounted(() => {
    setTimeout(() => {
        if (props.data) {
            drawForceGraph(props.data);
        }
    }, 100);
});
</script>

<template>
  <div class="d3-visualizer-container">
    <!-- SVG Element where D3 will draw the visualization -->
    <svg ref="svgContainer" class="d3-force-svg"></svg>
  </div>
</template>

<style scoped>
.d3-visualizer-container {
  overflow: hidden;
  width: 100%;
  height: 400px; /* Fixed height for force graph */
  border-radius: 8px;
}

.d3-force-svg {
  /* Dimensions are set in JS, but this ensures it fills the container */
  display: block;
  width: 100%;
  height: 100%;
}

/* Node labels */
text {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    fill: #333;
    pointer-events: none; /* Ignore pointer events on text to allow dragging the circle */
}

/* Node circle interaction */
circle {
    cursor: grab;
    transition: fill 0.1s ease;
}

circle:hover {
    fill: #f59e0b; /* Amber hover */
}
</style>