/**
 * IndexedDB Storage Wrapper (indexedDbStorage.js)
 * Provides a simple, promise-based API similar to localStorage,
 * but backed by IndexedDB for large, structured data storage.
 * Automatically tracks metadata (created, updated) and calculates size.
 */

const DB_NAME = 'DataStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'datasets';

// Metadata key used for tracking dataset properties
const METADATA_KEY = '_ds_metadata';

/**
 * Opens a connection to the IndexedDB database.
 * @returns {Promise<IDBDatabase>} The IDBDatabase instance.
 */
function openDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('IndexedDB is not supported by this browser.'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // Create an object store with 'name' as the key path (dataset name)
                db.createObjectStore(STORE_NAME, { keyPath: 'name' });
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(new Error(`IndexedDB error: ${event.target.error.name}`));
        };
    });
}

/**
 * Utility to execute a transaction on the store.
 * @param {string} mode - 'readonly' or 'readwrite'.
 * @param {function(IDBObjectStore): void} callback - Function to execute the IDB operations.
 * @returns {Promise<any>} Resolves when transaction completes.
 */
function transaction(mode, callback) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, mode);
            const store = tx.objectStore(STORE_NAME);

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(new Error('Transaction aborted.'));

            try {
                callback(store, resolve, reject);
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 * Estimates the total storage usage and capacity.
 * NOTE: This relies on the standard browser API, which may not be universally supported or accurate.
 * @returns {Promise<{used: number, quota: number} | null>} Storage info in bytes.
 */
export async function getStorageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
        try {
            const estimate = await navigator.storage.estimate();
            // Usage and quota are typically in bytes
            return {
                used: estimate.usage || 0,
                quota: estimate.quota || 0,
            };
        } catch (e) {
            console.error("Failed to get storage estimate:", e);
            return null;
        }
    }
    return null;
}

/**
 * Stores a dataset by name. Automatically tracks metadata.
 * @param {string} name - The name of the dataset (key).
 * @param {any} data - The data to store (array or object).
 * @returns {Promise<void>}
 */
export async function setItem(name, data) {
    const now = Date.now();
    
    // 1. Check if item exists to preserve original creation time
    let existingMetadata = null;
    try {
        const existingItem = await getItem(name);
        if (existingItem) {
            existingMetadata = existingItem[METADATA_KEY];
        }
    } catch (e) {
        // Ignore, means item doesn't exist
    }

    const metadata = {
        created: existingMetadata ? existingMetadata.created : now,
        updated: now,
        // Stringify the data here to estimate size (useful for large data)
        size: JSON.stringify(data).length,
    };

    const datasetObject = {
        name: name, // IndexedDB keyPath
        data: data,
        [METADATA_KEY]: metadata,
    };

    return transaction('readwrite', (store) => {
        store.put(datasetObject);
    });
}

/**
 * Retrieves a dataset by name.
 * @param {string} name - The name of the dataset.
 * @returns {Promise<any | null>} The dataset object or null.
 */
export function getItem(name) {
    return transaction('readonly', (store, resolve) => {
        const request = store.get(name);
        request.onsuccess = (event) => {
            const result = event.target.result;
            // Return only the data payload, making it look like localStorage
            resolve(result ? result.data : null);
        };
    });
}

/**
 * Retrieves the full metadata for a dataset by name.
 * @param {string} name - The name of the dataset.
 * @returns {Promise<{name: string, created: number, updated: number, size: number} | null>}
 */
export function getMetadata(name) {
    return transaction('readonly', (store, resolve) => {
        const request = store.get(name);
        request.onsuccess = (event) => {
            const result = event.target.result;
            if (result && result[METADATA_KEY]) {
                resolve({ name: result.name, ...result[METADATA_KEY] });
            } else {
                resolve(null);
            }
        };
    });
}

/**
 * Removes a dataset by name.
 * @param {string} name - The name of the dataset.
 * @returns {Promise<void>}
 */
export function removeItem(name) {
    return transaction('readwrite', (store) => {
        store.delete(name);
    });
}

/**
 * Clears all datasets from the store.
 * @returns {Promise<void>}
 */
export function clear() {
    return transaction('readwrite', (store) => {
        store.clear();
    });
}

/**
 * Retrieves a list of all dataset names (keys).
 * @returns {Promise<Array<string>>}
 */
export function keys() {
    return transaction('readonly', (store, resolve) => {
        const request = store.getAllKeys();
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
    });
}

/**
 * Retrieves a list of all dataset metadata objects.
 * This is the function that provides all the "dashboard" info requested by the user.
 * @returns {Promise<Array<{name: string, created: number, updated: number, size: number}>>}
 */
export async function getAllMetadata() {
    const allKeys = await keys();
    const metadataPromises = allKeys.map(key => getMetadata(key));
    const metadataResults = await Promise.all(metadataPromises);
    
    // Filter out any potential nulls if a key was somehow deleted during the process
    return metadataResults.filter(meta => meta !== null);
}

// Export the user-friendly interface
export default {
    setItem,
    getItem,
    removeItem,
    clear,
    keys,
    getMetadata,
    getAllMetadata,
    getStorageEstimate
};