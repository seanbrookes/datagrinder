import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
// Import the IndexedDB wrapper utility
import storage from '../indexedDBStorage'; // Assuming this path is correct

export const useDataStudioStore = defineStore('dataStudio', () => {
  // --- State for Navigation ---
  const currentView = ref('DatasetExplorer'); // Default view
  const views = ref([
    { name: 'DatasetExplorer', label: 'Dataset Explorer' },
    { name: 'ObjectEditor', label: 'Object Editor' },
    { name: 'StorageManager', label: 'Data Storage' },
    { name: 'PopulationGenerator', label: 'Population Generator' },
  ]);

  // --- State for Dataset Analysis Feedback (Used by DatasetExplorer) ---
  const datasetFeedback = ref({
    success: false,
    message: 'No dataset loaded.',
    rows: 0,
    columns: 0,
    headers: []
  });

  // --- IndexedDB Storage State (Used by StorageManager) ---
  // List of dataset metadata (name, size, created, updated)
  const savedDatasetsMetadata = ref([]);
  // Browser storage estimates
  const storageEstimate = ref(null); // { used: number, quota: number }

  // --- Temporary Load State for cross-component transfer ---
  // Holds { sourceData: string, displayName: string, key: string, structuredData: Array<Object>, headers: Array<string> }
  const dataToLoad = ref(null);
  const loadedDatasets = ref({});
  const activeDataset = ref(null);

  // --- Population Schema State ---
  const savedSchemas = ref([]);


  // --- Computed Properties ---

  const totalDatasets = computed(() => savedDatasetsMetadata.value.length);
  const totalDataSize = computed(() =>
    savedDatasetsMetadata.value.reduce((sum, meta) => sum + (meta.size || 0), 0)
  );

  // --- Actions ---

  /**
   * Switches the current application view.
   * @param {string} viewName - The name of the view to switch to.
   */
  function setView(viewName) {
    if (views.value.some(v => v.name === viewName)) {
      currentView.value = viewName;
    } else {
      console.warn(`View "${viewName}" not recognized.`);
    }
  }

  /**
   * Sets the feedback/analysis results for the currently loaded dataset.
   */
  function setDatasetFeedback(feedback) {
    datasetFeedback.value = feedback;
  }

  /**
   * Fetches metadata for all saved datasets and the storage estimate.
   */
  async function refreshStorageData() {
    try {
      const keys = await storage.keys();
      const metadataPromises = keys.map(async key => {
        const dataset = await storage.getItem(key);
        // Estimate size (rough)
        const size = JSON.stringify(dataset).length;

        return {
          ...dataset,
          name: key,
          size: size,
        };
      });

      const all = await Promise.all(metadataPromises);
      savedDatasetsMetadata.value = all.filter(item => item._type !== 'population-schema');
      savedSchemas.value = all.filter(item => item._type === 'population-schema');

      // Get storage estimate (optional, may not be supported by all browsers)
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        storageEstimate.value = {
          used: estimate.usage,
          quota: estimate.quota,
        };
      } else {
        storageEstimate.value = null;
      }
    } catch (e) {
      console.error('Failed to refresh storage data:', e);
    }
  }


  /**
   * Saves a new dataset to IndexedDB.
   * @param {Object} datasetObject - The complete dataset object.
   * @returns {Promise<boolean>} Success status.
   */
  async function saveNewDataset(datasetObject) {
    try {
      const now = Date.now();
      const key = datasetObject.name || `dataset-${now}`;

      // Prepare the object for storage, adding timestamps
      const dataToStore = {
        ...datasetObject,
        name: key,
        created: now,
        updated: now,
      };

      await storage.setItem(key, dataToStore);
      loadedDatasets.value[dataToStore.name] = { ...dataToStore };
      activeDataset.value = dataToStore;
      await refreshStorageData();
      return true;
    } catch (e) {
      console.error('Failed to save dataset:', e);
      return false;
    }
  }

  /**
   * Loads a dataset from IndexedDB into the temporary dataToLoad state.
   * @param {string} name - The dataset name (key).
   * @returns {Promise<Object|null>} The loaded dataset object or null on failure.
   */
  async function loadDataset(name) {
    try {
        const datasetObject = await storage.getItem(name);
        if (!datasetObject) {
            console.warn(`Dataset ${name} not found.`);
            return null;
        }
        // console.warn(`Dataset ${name} lacks sourceData. Cannot load for processing.`);
        // Fallback: Populate with raw data if structured data is missing
        dataToLoad.value = { ...datasetObject };
        loadedDatasets.value[datasetObject.name] = { ...datasetObject };
        activeDataset.value = datasetObject;

        await refreshStorageData();
        return datasetObject;
    } catch (e) {
        console.error(`Failed to load dataset ${name}:`, e);
        return null;
    }
  }

  /**
   * Clears the temporary dataToLoad state after it has been consumed by the destination component.
   */
  function clearDataToLoad() {
    dataToLoad.value = null;
  }

  /**
   * Deletes a dataset from IndexedDB.
   * @param {string} name - The dataset name (key).
   * @returns {Promise<boolean>} Success status.
   */
  async function deleteDataset(name) {
    try {
        await storage.removeItem(name);
        await refreshStorageData();
        return true;
    } catch (e) {
        console.error(`Failed to delete dataset ${name}:`, e);
        return false;
    }
  }


  // --- Population Schema Actions ---

  async function saveSchema(schemaObject) {
    try {
      const now = Date.now();
      const key = schemaObject.name || `pop-schema-${now}`;
      const existing = await storage.getItem(key);
      // Deep-clone via JSON to strip Vue reactive proxies before IDB storage
      const plain = JSON.parse(JSON.stringify(schemaObject));
      await storage.setItem(key, {
        ...plain,
        name: key,
        _type: 'population-schema',
        created: existing?.created ?? now,
        updated: now,
      });
      await refreshStorageData();
      return key;
    } catch (e) {
      console.error('Failed to save schema:', e);
      return null;
    }
  }

  async function deleteSchema(name) {
    try {
      await storage.removeItem(name);
      await refreshStorageData();
      return true;
    } catch (e) {
      console.error(`Failed to delete schema ${name}:`, e);
      return false;
    }
  }

  return {
    // State
    currentView,
    views,
    datasetFeedback,
    savedDatasetsMetadata,
    savedSchemas,
    storageEstimate,
    dataToLoad,
    loadedDatasets,
    activeDataset,

    // Computed
    totalDatasets,
    totalDataSize,

    // Actions
    setView,
    setDatasetFeedback,
    refreshStorageData,
    saveNewDataset,
    loadDataset,
    deleteDataset,
    clearDataToLoad,
    saveSchema,
    deleteSchema,
  };
});