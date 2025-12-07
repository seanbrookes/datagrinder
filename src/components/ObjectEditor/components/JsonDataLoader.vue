<script setup>
import { ref, computed } from 'vue';
import { parseJsonString } from '../../../dataHelpers';

// Define the custom event the component will emit when data is loaded
const emit = defineEmits(['data-loaded']);

// Reactive state for the paste input
const pastedJson = ref('');

// State for drag and drop visual feedback
const isDragging = ref(false);

// --- Core Data Handling Functions ---

/**
 * Parses the string and emits the data if successful.
 * @param {string} content The JSON string content.
 */
function processAndEmitData(content) {
  const parsedData = parseJsonString(content);
  if (parsedData) {
    emit('data-loaded', parsedData);
    pastedJson.value = ''; // Clear textarea after successful load
  } else {
    alert('Failed to load data. Please ensure the content is valid JSON.');
  }
}

// --- Handlers for Paste Input ---

function handlePasteOrChange() {
  if (pastedJson.value) {
    processAndEmitData(pastedJson.value);
  }
}

// --- Handlers for File Input & Drag/Drop ---

/**
 * Reads the content of a File object using the FileReader API.
 * @param {File} file The file object to read.
 */
function readFileContent(file) {
  // Ensure only JSON files are processed
  if (file.type && file.type !== 'application/json' && !file.name.endsWith('.json')) {
    alert('Please upload a valid JSON file.');
    return;
  }

  const reader = new FileReader();

  // This fires when the file has been read
  reader.onload = (event) => {
    processAndEmitData(event.target.result);
  };

  // Start reading the file as text
  reader.readAsText(file);
}

/**
 * Handles file selection from the desktop input.
 * @param {Event} event The change event from the file input.
 */
function handleFileSelect(event) {
  const file = event.target.files?.[0];
  if (file) {
    readFileContent(file);
  }
  // Reset the input so the same file can be selected again
  event.target.value = '';
}

/**
 * Handles files dropped onto the drop zone.
 * @param {DragEvent} event The drop event.
 */
function handleDrop(event) {
  isDragging.value = false;
  // Use dataTransfer to access the dropped files
  const file = event.dataTransfer.files?.[0];
  if (file) {
    readFileContent(file);
  }
}

// --- Drag/Drop Event Visual Feedback ---

function handleDragOver() {
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}
</script>

<template>
  <div class="data-loader-container">
    <h3 class="input-title">Load JSON Data</h3>

    <div
      class="drop-zone"
      :class="{ 'is-dragging': isDragging }"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <input 
        type="file" 
        accept=".json" 
        @change="handleFileSelect" 
        id="json-file-input" 
        class="hidden-file-input"
      />
      <label for="json-file-input" class="drop-zone-message">
        <span v-if="isDragging">Drop your JSON file here!</span>
        <span v-else>Drag a **.json** file here or click to upload.</span>
      </label>
    </div>

    <div class="separator">OR</div>

    <div class="paste-input-area">
      <textarea
        v-model="pastedJson"
        @blur="handlePasteOrChange"
        @keyup.enter.prevent="handlePasteOrChange"
        placeholder="Paste JSON text here and click outside or press Enter to load..."
        rows="8"
      ></textarea>
      <button 
        @click="handlePasteOrChange" 
        :disabled="!pastedJson" 
        class="primary-btn"
      >
        Load Pasted JSON
      </button>
    </div>
  </div>
</template>

<style scoped>
/*
 * Custom, minimal CSS for the loader component.
 * Uses vanilla CSS to adhere to project constraints.
 */

.data-loader-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
}

.input-title {
    margin: 0 0 10px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b; /* Dark Slate */
}

/* --- Drop Zone Styles --- */
.drop-zone {
  border: 2px dashed #94a3b8; /* Slate gray dashed border */
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
}

.drop-zone:hover {
  background-color: #f8fafc; /* Lightest Gray */
}

.drop-zone.is-dragging {
  border-color: #4f46e5; /* Indigo color for active drag state */
  background-color: #e0e7ff; /* Light Indigo background */
  transform: scale(1.02);
}

.hidden-file-input {
  /* Hides the default ugly file input */
  width: 0.1px;
  height: 0.1px;
  opacity: 0;
  overflow: hidden;
  position: absolute;
  z-index: -1;
}

.drop-zone-message {
    display: block;
    font-weight: 500;
    color: #475569;
    user-select: none;
    line-height: 1.5;
}

/* --- Separator and Paste Area --- */
.separator {
    text-align: center;
    font-weight: 500;
    color: #94a3b8;
    position: relative;
}
.separator::before,
.separator::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 40%;
    height: 1px;
    background-color: #e2e8f0;
}
.separator::before { left: 0; }
.separator::after { right: 0; }

.paste-input-area {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-family: monospace;
    font-size: 0.9rem;
    resize: vertical;
}

/* Basic button styles (assuming primary-btn and secondary-btn exist globally or in a local style) */
.primary-btn {
    padding: 10px 15px;
    border: none;
    border-radius: 8px;
    background-color: #4f46e5;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
}
.primary-btn:hover:not(:disabled) {
    background-color: #4338ca;
}
.primary-btn:disabled {
    background-color: #a5b4fc;
    cursor: not-allowed;
}
</style>