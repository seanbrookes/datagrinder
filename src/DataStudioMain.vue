<script setup>
import { ref, computed, onMounted } from 'vue';
import { useDataStudioStore } from './stores/dataStore.js';
// Import the container views (assuming they are siblings)
import ObjectEditor from './components/ObjectEditor/ObjectEditor.vue';
import DatasetExplorer from './components/DatasetExplorer/DatasetExplorer.vue';
import StorageManager from './components/StorageManager/StorageManager.vue';

// Initialize Pinia store
const store = useDataStudioStore();

// Map view names (from store) to actual components
const viewComponents = {
  ObjectEditor,
  DatasetExplorer,
  StorageManager,
};

// Computed property to determine which component to render
const currentComponent = computed(() => {
  return viewComponents[store.currentView] || DatasetExplorer; // Default to DatasetExplorer
});

// For initial global access to the sorting function (required by innerHTML setup in DatasetExplorer)
onMounted(() => {
    // This is a safety measure to ensure 'window.vueAppInstance' exists 
    // before the table DOM is rendered by the pure JS function.
    window.vueAppInstance = window.vueAppInstance || {};
});

</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <a data-id="header_home_link" href="#" class="header-home-link">Data Grinder</a>
    </header>
    
    <main class="app-main">
      <!-- Simple 'tab' like navigation -->
      <nav class="app-nav">
        <button
          v-for="view in store.views"
          :key="view.name"
          @click="store.setView(view.name)"
          :class="{ 'active': store.currentView === view.name }"
          class="nav-button"
        >
          {{ view.label }}
        </button>
      </nav>
      
      <!-- Dynamic Vue component to render 'container' UI components -->
      <div class="content-container">
        <component :is="currentComponent" />
      </div>

    </main>
  </div>
</template>

<style>
/* Define CSS Variables for Theming */
:root {
  --color-primary: #3498db; /* Blue */
  --color-accent: #f39c12; /* Orange */
  --color-dark: #2c3e50; /* Dark Blue/Gray */
  --color-light-gray: #ecf0f1;
  --color-text: #333;
}

/* Reset and Base Styles */
body {
  margin: 0;
  font-family: 'Arial', sans-serif;
  background-color: #f4f6f9;
  color: var(--color-text);
  line-height: 1.6;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header Styling */
.app-header {
  background-color: var(--color-dark);
  color: white;
  padding: 15px 30px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-home-link {
  color: white;
  text-decoration: none;
  font-size: 1.5em;
  font-weight: bold;
}

/* Navigation Styling */
.app-nav {
  display: flex;
  padding: 0 30px;
  background-color: white;
  border-bottom: 1px solid var(--color-light-gray);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.nav-button {
  background: none;
  border: none;
  padding: 12px 20px;
  font-size: 1em;
  cursor: pointer;
  color: var(--color-text);
  border-bottom: 3px solid transparent;
  transition: all 0.2s ease;
  font-weight: 500;
}

.nav-button:hover:not(.active) {
  background-color: var(--color-light-gray);
}

.nav-button.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: bold;
}

/* Main Content Area */
.app-main {
  flex-grow: 1;
}

.content-container {
  padding: 30px;
}

/* Responsive adjustments */
@media (max-width: 600px) {
    .app-header {
        padding: 10px 15px;
    }
    .app-nav {
        padding: 0 10px;
    }
    .nav-button {
        padding: 10px 15px;
        font-size: 0.9em;
    }
    .content-container {
        padding: 15px;
    }
}
</style>