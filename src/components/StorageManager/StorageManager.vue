<script setup>
import { ref, onMounted } from 'vue';
import { useDataStudioStore } from '../../stores/dataStore.js';

const store = useDataStudioStore();

const selectedDatasets = ref([]);

// --- Utility Functions ---

/**
 * Formats bytes into a human-readable string (e.g., 1024 -> 1 KB).
 * @param {number} bytes - The size in bytes.
 * @returns {string} Human-readable size.
 */
function formatBytes(bytes) {
    if (bytes === 0 || bytes === null || typeof bytes === 'undefined') {
        return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats a timestamp (ms since epoch) into a localized date/time string.
 * @param {number} timestamp - The time in milliseconds.
 * @returns {string} Formatted date string.
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
}

const formatColumnKeys = (rawKeys) => {
  if (!rawKeys || rawKeys.length === 0) {
    return '';
  }
  const outputString = rawKeys.reduce((key, str) => {
    // str = str + ', ' + key;
    return key ? key + ', ' + str : str;
  }, '');
  return outputString;
}

// --- Action Handlers ---
/**
 * Handles the selection/deselection of a dataset for bulk actions.
 * @param {string} name - The unique key of the dataset.
 */
 function toggleSelection(name) {
    const index = selectedDatasets.value.indexOf(name);
    if (index > -1) {
        // Deselect
        selectedDatasets.value.splice(index, 1);
    } else {
        // Select
        selectedDatasets.value.push(name);
    }
}

/**
 * Handles the bulk deletion of all selected datasets.
 */
async function handleBulkDelete() {
    if (selectedDatasets.value.length === 0) {
        alert('Please select at least one dataset to delete.');
        return;
    }

    const count = selectedDatasets.value.length;
    const confirmation = confirm(
        `Are you sure you want to permanently delete ${count} selected dataset(s)?\n\n` +
        `This action cannot be undone.`
    );

    if (confirmation) {
        console.warn(`Starting bulk delete of ${count} datasets...`);
        const deletePromises = selectedDatasets.value.map(name => 
            store.deleteDataset(name)
        );

        // Wait for all deletions to complete
        await Promise.all(deletePromises); 
        
        // Clear the selection list after successful deletion
        selectedDatasets.value = []; 
        
        // Refresh the UI list (store.deleteDataset already calls refreshStorageData,
        // but it's safe to ensure the view is fully updated.)
        // store.refreshStorageData(); // NOTE: store.deleteDataset already handles this.
        
        console.log(`${count} datasets successfully deleted.`);
    }
}
/**
 * Loads a dataset, sets the dataToLoad state in the store, and switches the view
 * to the Dataset Explorer for immediate rendering of the structured data.
 * @param {string} name - The unique key of the dataset to load.
 */
async function handleLoadDataset(name) {
    // 1. Load the data (which sets the dataToLoad state in Pinia)
    await store.loadDataset(name); 
    
    // 2. Switch the view. DatasetExplorer will watch dataToLoad and render the data.
    store.setView('DatasetExplorer');
}

/**
 * Deletes a dataset from IndexedDB.
 * NOTE: In a production app, this would use a custom modal for confirmation.
 * @param {string} name - The unique key of the dataset to delete.
 */
async function handleDeleteDataset(name) {
  if (confirm('Delete dataset: ' + name + '?')) {
    // We strictly avoid window.confirm() in this environment.
    // Assuming the user knows what they are doing when clicking delete for now.
    console.warn(`Attempting to delete dataset: ${name}. A confirmation modal should appear here.`);
    await store.deleteDataset(name);
  }
}

// --- Lifecycle Hook ---
onMounted(() => {
    // Load the initial list of datasets and storage estimates on component mount
    store.refreshStorageData();
});
</script>

<template>
    <div class="storage-manager-container">
        <h1 class="title-main">Data Storage storage-manager-container</h1>
        <p class="subtitle">Manage the datasets you have saved in your local browser storage.</p>

        <!-- Storage Summary -->
        <section class="storage-summary-section">
            <h2 class="section-title">Storage Summary</h2>
            <div class="summary-cards">
                <div class="card bg-blue-100">
                    <p class="card-title">Total Datasets</p>
                    <p class="card-value text-blue-700">{{ store.totalDatasets }}</p>
                </div>
                <div class="card bg-purple-100">
                    <p class="card-title">Total Data Size</p>
                    <p class="card-value text-purple-700">{{ formatBytes(store.totalDataSize) }}</p>
                </div>
                <div class="card bg-yellow-100" v-if="store.storageEstimate">
                    <p class="card-title">Used / Quota</p>
                    <p class="card-value text-yellow-700">
                        {{ formatBytes(store.storageEstimate.usage) }} / 
                        {{ formatBytes(store.storageEstimate.quota) }}
                    </p>
                </div>
                <div class="card bg-gray-100" v-else>
                    <p class="card-title">Quota Estimate</p>
                    <p class="card-value text-gray-700">Not Available</p>
                </div>
            </div>
            <button @click="store.refreshStorageData" class="refresh-button mt-4">Refresh Data</button>
        </section>

        <hr class="divider">

        <!-- Dataset List -->
        <section class="dataset-list-section">
            <h2 class="section-title">Saved Datasets</h2>
            <div class="bulk-actions-bar">
              <button 
                  @click="handleBulkDelete" 
                  :disabled="selectedDatasets.length === 0"
                  class="action-button delete bulk-delete-button"
              >
                  Delete Selected ({{ selectedDatasets.length }})
              </button>
            </div>
            <p v-if="store.savedDatasetsMetadata.length === 0" class="text-gray-500 mt-4">
                No datasets found in local storage. Start by importing a dataset in the Explorer!
            </p>
            
            <div class="table-wrapper" v-else>
                <table class="dataset-table">
                    <thead>
                        <tr>
                          <th></th>
                          <th>Display Name</th>
                          <!--
                          <th>Key (Internal)</th>
                          -->
                          <th>Rows</th>
                          <th>Columns</th>
                          <th>Size</th>
                          <th>Last Updated</th>
                          <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                          v-for="dataset in store.savedDatasetsMetadata"
                          :key="dataset.name"
                          :class="{ 'row-selected': selectedDatasets.includes(dataset.name) }"
                        >
                            <td>
                                <input 
                                    type="checkbox" 
                                    :checked="selectedDatasets.includes(dataset.name)" 
                                    @change="toggleSelection(dataset.name)"
                                    class="dataset-checkbox"
                                >
                            </td>                          
                            <td>{{ dataset.displayName }}</td>
                            <!--
                            <td class="text-sm text-gray-500 font-mono">{{ dataset.name }}</td>
                            -->
                            <td>{{ dataset.rows }}</td>
                            <td>{{ formatColumnKeys(dataset.columnKeys) }}</td>
                            <td>{{ formatBytes(dataset.size) }}</td>
                            <td>{{ formatTimestamp(dataset.updated) }}</td>
                            <td class="action-buttons">
                                <button @click="handleLoadDataset(dataset.name)" class="action-button load">Load</button>
                                <button @click="handleDeleteDataset(dataset.name)" class="action-button delete">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

    </div>
</template>

<style scoped>
/* Scoped styles for StorageManager.vue */

/* General Layout and Typography */
.storage-manager-container {
    padding: 30px;
    max-width: 1200px;
    margin: 0 auto;
    font-family: 'Inter', sans-serif;
    color: var(--color-dark, #34495e);
}

.title-main {
    font-size: 2.2em;
    font-weight: 700;
    margin-bottom: 5px;
    color: var(--color-primary, #3498db);
}

.subtitle {
    font-size: 1.1em;
    color: #7f8c8d;
    margin-bottom: 25px;
}

.section-title {
    font-size: 1.5em;
    font-weight: 600;
    margin-bottom: 20px;
    color: var(--color-dark, #34495e);
}

.divider {
    border: 0;
    height: 1px;
    background-color: #ecf0f1;
    margin: 30px 0;
}

/* Summary Cards */
.storage-summary-section {
    padding: 20px;
    border: 1px solid #f2f2f2;
    border-radius: 12px;
    background-color: #ffffff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
}

.card {
    padding: 20px;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.bg-blue-100 { background-color: #eaf6ff; }
.bg-purple-100 { background-color: #f6e6ff; }
.bg-yellow-100 { background-color: #fff9e6; }
.bg-gray-100 { background-color: #f7f9fb; }

.card-title {
    font-size: 0.9em;
    color: #7f8c8d;
    margin-bottom: 5px;
    font-weight: 500;
}

.card-value {
    font-size: 1.8em;
    font-weight: 800;
}

.text-blue-700 { color: var(--color-primary, #3498db); }
.text-purple-700 { color: #8e44ad; }
.text-yellow-700 { color: #f39c12; }
.text-gray-700 { color: var(--color-dark); }

.refresh-button {
    background-color: var(--color-primary, #3498db);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s, transform 0.1s;
    font-weight: bold;
    font-size: 1em;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
}
.refresh-button:hover {
    background-color: #2980b9;
    transform: translateY(-1px);
}
.refresh-button:active {
    transform: translateY(0);
}


/* Dataset Table */
.dataset-list-section {
    padding: 20px;
    border-left: 5px solid var(--color-primary, #3498db);
    background-color: #ffffff;
    border-radius: 0 12px 12px 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.table-wrapper {
    overflow-x: auto;
    margin-top: 20px;
    border: 1px solid #ecf0f1;
    border-radius: 8px;
}

.dataset-table {
    width: 100%;
    border-collapse: collapse;
}

.dataset-table th, .dataset-table td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid #ecf0f1;
    font-size: 0.9em;
}

.dataset-table th {
    background-color: #f7f9fb;
    color: var(--color-dark);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.85em;
}

.dataset-table tr:hover {
    background-color: #fcfcfc;
}

/* Dataset Table Row Selection Style */
.dataset-table tr.row-selected {
    background-color: #e6ffe6; /* Light grey-green color */
    transition: background-color 0.3s ease;
}

/* Ensure selected rows still get hover feedback, but it's subtle */
.dataset-table tr.row-selected:hover {
    background-color: #d9ffd9;
}
/* Ensure the standard hover is still visible on unselected rows */
.dataset-table tr:not(.row-selected):hover {
    background-color: #fcfcfc; /* Maintain original hover style */
}

/* Action Buttons */
.action-buttons {
    display: flex;
    gap: 8px;
}

.action-button {
    padding: 6px 12px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 0.85em;
    font-weight: 600;
    transition: background-color 0.2s;
}

.action-button.load {
    background-color: #2ecc71; /* Green */
    color: white;
}

.action-button.load:hover {
    background-color: #27ae60;
}

.action-button.delete {
    background-color: #e74c3c; /* Red */
    color: white;
}

.action-button.delete:hover {
    background-color: #c0392b;
}
.dataset-checkbox {
    /* Base Size: 30% larger */
    transform: scale(1.3); 
    cursor: pointer;
    margin: 0; /* Remove default margin */
    /* Add transition for smooth bounce and glow */
    transition: 
        transform 0.1s ease-out, 
        box-shadow 0.2s ease-in-out;
    appearance: none; /* Hide default browser checkbox styling */
    width: 16px; 
    height: 16px;
    border: 2px solid #95a5a6;
    border-radius: 3px;
    background-color: #ecf0f1;
    display: inline-block;
    vertical-align: middle;
}

/* Checkbox Hover Glow */
.dataset-checkbox:hover {
    box-shadow: 0 0 10px rgba(46, 204, 113, 0.7); /* Green glow effect */
    border-color: #2ecc71;
}

/* Checkbox Mousedown Shrink (Bounce Start) */
.dataset-checkbox:active {
    transform: scale(1.0); /* Shrink on mousedown */
}

/* Visually indicate Checked state */
.dataset-checkbox:checked {
    background-color: #2ecc71; /* Green when checked */
    border-color: #2ecc71;
    /* Optional: A checkmark or box-shadow can be added here using ::after or background-image */
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .storage-manager-container {
        padding: 15px;
    }
    .title-main {
        font-size: 1.8em;
    }
    .subtitle {
        font-size: 1em;
    }
    .summary-cards {
        grid-template-columns: 1fr;
    }
    .dataset-table th, .dataset-table td {
        padding: 10px 8px;
        font-size: 0.8em;
    }
}
</style>