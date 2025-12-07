<script setup>
import { ref, onMounted, computed, watch, nextTick } from "vue";
import { storeToRefs } from "pinia";
import { useDataStudioStore } from "../../stores/dataStore.js";
import {
  parseDataset,
  analyzeDataset,
  createTableDOM,
  sortData,
} from "../../dataHelpers.js";

// --- Global State and Refs ---
const store = useDataStudioStore();
const rawInputText = ref("");
const fileInputRef = ref(null);
const dropZoneActive = ref(false);
const tableContainerRef = ref(null); // Ref for the div receiving the innerHTML table

// State for the processed data and sorting
const rawDataset = ref([]);
const processedHeaders = ref([]);
const sortState = ref({ key: null, direction: "asc" });

const { activeDataset, loadedDatasets } = storeToRefs(store);

// --- Computed Properties ---

// The final data array after sorting (uses pure JS sort function)
const sortedData = computed(() => {
  return sortData(
    rawDataset.value,
    sortState.value.key,
    sortState.value.direction,
  );
});

const listOfLoadedDatasets = computed(() => {
  const abc = loadedDatasets.value;
  return Object.keys(abc);
});

// const currentDataset = computed(() => {
//   const abc = activeDataset.value;
//   return abc;
// });

// --- Data Processing and Rendering ---

/**
 * Main function to process the input text and update global state.
 */
const processInput = () => {
  store.setDatasetFeedback({
    success: false,
    message: "Processing dataset...",
    rows: 0,
    columns: 0,
    headers: [],
  });

  const parseResult = parseDataset(rawInputText.value);

  if (parseResult.error || !parseResult.data || parseResult.data.length === 0) {
    store.setDatasetFeedback({
      success: false,
      message: `Parsing failed (Type: ${parseResult.type}). Error: ${parseResult.error || "No data found."}`,
      rows: 0,
      columns: 0,
      headers: [],
    });
    rawDataset.value = [];
    processedHeaders.value = [];
    return;
  }

  // Stage 2 & 3: Analyze dataset to find all keys and fill gaps
  const { cleanedData, allKeys } = analyzeDataset(parseResult.data);

  rawDataset.value = cleanedData;
  processedHeaders.value = allKeys;
  sortState.value = { key: null, direction: "asc" }; // Reset sort on new data

  // Provide feedback
  store.setDatasetFeedback({
    success: true,
    message: `Successfully imported dataset as ${parseResult.type.toUpperCase()}.`,
    rows: cleanedData.length,
    columns: allKeys.length,
    headers: allKeys,
  });

  const newDatasetObject = {
    dataset: JSON.parse(JSON.stringify(rawDataset.value)),
    sourceData: rawInputText.value,
    name: `dataset-${Date.now()}`,
    columnKeys: allKeys,
    rows: rawDataset?.value?.length || 0,
    displayName: `Dataset ${Date.now()}`,
    metadata: {
      columns: allKeys,
    },
  };
  store
    .saveNewDataset(newDatasetObject)
    .then((savedDataObject) => {
      console.log(
        "| we saved the data !!!!! savedDataObject ",
        savedDataObject,
      );
    })
    .catch((err) => {
      console.log("| there was an error creating the dataset record", err);
    });
};

/**
 * Renders the table DOM into the dedicated ref div. (Stage 4)
 */
const renderTable = () => {
  if (tableContainerRef.value) {
    // Use pure JS function to get the table HTML string
    const tableHTML = createTableDOM(
      sortedData.value,
      processedHeaders.value,
      sortState.value,
    );
    tableContainerRef.value.innerHTML = tableHTML;

    // Expose the Vue sorting handler globally for the pure JS DOM elements to access.
    // This is necessary because 'innerHTML' bypasses Vue's event system.
    window.vueAppInstance = window.vueAppInstance || {};
    window.vueAppInstance.handleSortClick = (event, key) => {
      handleSort(key);
    };
  }
};

/**
 * Handles the column header click for sorting (called from global context).
 * @param {string} key - The column key to sort by.
 */
const handleSort = (key) => {
  if (sortState.value.key === key) {
    // Toggle direction
    sortState.value.direction =
      sortState.value.direction === "asc" ? "desc" : "asc";
  } else {
    // New key, default to ascending
    sortState.value.key = key;
    sortState.value.direction = "asc";
  }
  // Watcher on sortedData triggers re-render
};

// --- Event Handlers for Input ---

const handleFileSelect = (event) => {
  const files = event.target.files || event.dataTransfer.files;
  if (files.length > 0) {
    readTextFile(files[0]);
  }
  // Reset file input value to allow re-uploading the same file
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
};

const readTextFile = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    rawInputText.value = e.target.result;
    processInput();
  };
  reader.onerror = () => {
    store.setDatasetFeedback({
      success: false,
      message: "Error reading file.",
      rows: 0,
      columns: 0,
      headers: [],
    });
  };
  reader.readAsText(file);
};

// Drag and Drop handlers
const handleDragEnter = (e) => {
  e.preventDefault();
  dropZoneActive.value = true;
};
const handleDragLeave = (e) => {
  e.preventDefault();
  dropZoneActive.value = false;
};
const handleDrop = (e) => {
  e.preventDefault();
  dropZoneActive.value = false;
  handleFileSelect(e);
};

// Process data when the user finishes pasting or clicks the button
const handlePasteOrButtonClick = () => {
  nextTick(processInput);
};

// --- Lifecycle and Watchers ---

// Watch for changes in sorted data (triggered by sort or new input) and re-render the table
watch(
  sortedData,
  () => {
    nextTick(renderTable);
  },
  { immediate: true },
);

watch(
  activeDataset,
  (newDataset) => {
    // 'activeDataset' is a ref from storeToRefs
    console.log("active dataset changed to:", newDataset?.displayName);
    // Step 2: Check for valid data and update component state
    if (newDataset && newDataset.sourceData) {
      // Set the local input model to the new dataset's source data
      rawInputText.value = newDataset.sourceData;

      // Stage 2 & 3: Analyze dataset to find all keys and fill gaps
      const { cleanedData, allKeys } = analyzeDataset(newDataset.dataset);

      rawDataset.value = cleanedData;
      processedHeaders.value = allKeys;
      sortState.value = { key: null, direction: "asc" }; // Reset sort on new data
    }

    // Optional but recommended: Clear the temporary dataToLoad state
    store.clearDataToLoad();
  },
  { deep: true, immediate: true },
);

// watch(loadedDatasets, (datasets) => { // This is correct
//   console.log('loaded datasets changed ', datasets);
// });

onMounted(() => {
  renderTable(); // Initial render to show placeholder
});
</script>

<template>
  <div class="dataset-explorer-view">
    <h2 class="view-title">Dataset Explorer</h2>
    <div>
      <div>ACTIVE: {{ activeDataset?.name }}</div>
      <div v-for="(name, index) in listOfLoadedDatasets" :key="index">
        <pre>LOADED DATASET: {{ name }}</pre>
      </div>
    </div>

    <!-- Data Input Panel -->
    <section class="input-panel">
      <div
        class="drop-zone"
        :class="{ active: dropZoneActive }"
        @dragenter.prevent="handleDragEnter"
        @dragleave.prevent="handleDragLeave"
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        Drag & Drop CSV/JSON File Here
        <div class="or-separator">OR</div>
        <button @click="fileInputRef.click()" class="file-upload-button">
          Upload File (.csv, .json)
        </button>
        <input
          type="file"
          ref="fileInputRef"
          @change="handleFileSelect"
          accept=".csv,.json,application/json"
          style="display: none"
        />
      </div>

      <div class="textarea-wrapper">
        <textarea
          v-model="rawInputText"
          @blur="handlePasteOrButtonClick"
          placeholder="Paste CSV or JSON data here, then click 'Process'..."
          class="data-textarea"
        ></textarea>
        <button
          @click="handlePasteOrButtonClick"
          :disabled="!rawInputText.trim()"
          class="process-button"
        >
          Process Pasted Data
        </button>
      </div>
    </section>

    <!-- Feedback and Analysis -->
    <section
      class="feedback-panel"
      :class="{
        success: store.datasetFeedback.success,
        error:
          !store.datasetFeedback.success &&
          store.datasetFeedback.message !== 'No dataset loaded.',
      }"
    >
      <p class="feedback-message">{{ store.datasetFeedback.message }}</p>
      <div v-if="store.datasetFeedback.success" class="analysis-stats">
        <span
          >Rows: <strong>{{ store.datasetFeedback.rows }}</strong></span
        >
        <span
          >Columns: <strong>{{ store.datasetFeedback.columns }}</strong></span
        >
      </div>
      <div
        v-if="
          store.datasetFeedback.success && store.datasetFeedback.headers.length
        "
        class="header-list"
      >
        <p>
          Headers found:
          <span
            class="header-tag"
            v-for="h in store.datasetFeedback.headers"
            :key="h"
            >{{ h }}</span
          >
        </p>
      </div>
    </section>

    <!-- Dynamic Table Rendering Container -->
    <section class="data-table-section">
      <div ref="tableContainerRef" class="table-container">
        <!-- Table DOM is rendered here via innerHTML -->
      </div>
    </section>
  </div>
</template>

<style scoped>
/* GENERAL STYLING */
.dataset-explorer-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: "Arial", sans-serif;
}
.view-title {
  font-size: 2em;
  color: var(--color-dark, #2c3e50);
  margin-bottom: 25px;
  border-bottom: 2px solid var(--color-primary, #3498db);
  padding-bottom: 10px;
}

/* INPUT PANEL */
.input-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}
@media (max-width: 768px) {
  .input-panel {
    grid-template-columns: 1fr;
  }
}

.drop-zone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  color: #7f8c8d;
  transition:
    border-color 0.3s,
    background-color 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  background-color: #f7f9fb;
}
.drop-zone.active {
  border-color: var(--color-primary, #3498db);
  background-color: #eaf4ff;
  color: var(--color-primary, #2980b9);
}
.or-separator {
  margin: 10px 0;
  font-weight: bold;
}
.file-upload-button,
.process-button {
  background-color: var(--color-primary, #3498db);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  transition:
    background-color 0.2s,
    transform 0.1s;
  font-weight: bold;
}
.file-upload-button:hover,
.process-button:hover {
  background-color: #2980b9;
}
.file-upload-button:disabled,
.process-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.textarea-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.data-textarea {
  width: 100%;
  min-height: 120px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  resize: vertical;
  font-family: monospace;
  font-size: 0.9em;
  box-sizing: border-box;
}

/* FEEDBACK PANEL */
.feedback-panel {
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  border-left: 5px solid;
  transition: all 0.3s ease;
}
.feedback-panel.success {
  background-color: #e8f5e9; /* Light Green */
  border-color: #4caf50; /* Darker Green */
}
.feedback-panel.error {
  background-color: #ffebee; /* Light Red */
  border-color: #e53935; /* Darker Red */
}
.feedback-message {
  font-weight: bold;
  margin-bottom: 5px;
}
.analysis-stats {
  display: flex;
  gap: 20px;
  margin: 5px 0;
}
.header-tag {
  display: inline-block;
  background-color: #ecf0f1;
  color: var(--color-dark, #2c3e50);
  padding: 3px 8px;
  border-radius: 3px;
  margin-right: 5px;
  margin-top: 5px;
  font-size: 0.8em;
}

/* DATA TABLE STYLING */
.data-table-section {
  padding-top: 20px;
}

.table-container {
  overflow-x: auto;
  max-height: 60vh; /* Limit height for scrollability */
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px; /* Ensure wide content is scrollable */
}

.data-table th,
.data-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #f2f2f2;
  font-size: 0.9em;
  white-space: nowrap;
}

.data-table th {
  background-color: var(--color-dark, #34495e); /* Dark Blue/Gray */
  color: white;
  position: sticky;
  top: 0;
  z-index: 10;
}

.data-table tr:nth-child(even) {
  background-color: #f8f8f8;
}

.data-table tr:hover {
  background-color: #ecf0f1;
}

/* Table Buttons & Indicators */
.header-button {
  background: none;
  border: none;
  color: inherit;
  font-weight: bold;
  font-size: inherit;
  cursor: pointer;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}
.header-button:hover {
  color: var(--color-accent, #f39c12); /* Orange hover effect */
}
.sort-indicator {
  font-size: 0.8em;
  vertical-align: middle;
}
.null-cell {
  color: #95a5a6; /* Gray for NULL values */
  font-style: italic;
}
</style>
