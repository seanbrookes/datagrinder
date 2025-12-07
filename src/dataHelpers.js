/**
 * Data Grinder: Data Helpers
 * Provides pure functions for manipulating the internal tree structure.
 */

// Data type options for the UI
export const DATA_TYPES = ['string', 'number', 'boolean', 'array', 'object', 'function'];

/**
 * Creates a new, default node structure.
 * @param {string} name - The property name.
 * @param {string} type - The data type.
 * @param {string} parentType - The parent's type ('object' or 'array').
 * @returns {object} A new node object.
 */
export function createNode(name = 'newProp', type = 'string', parentType = 'object') {
  let value = null;
  let children = [];

  // Set default value based on type
  if (type === 'string') value = 'example value';
  if (type === 'number') value = 0;
  if (type === 'boolean') value = false;
  if (type === 'function') value = '() => console.log("Hello Data Grinder")';
  if (type === 'array') children = [];
  if (type === 'object') children = [];

  // Array items typically don't have user-editable names (they are indexed)
  const nodeName = parentType === 'array' ? '' : name;

  return {
    id: crypto.randomUUID(),
    name: nodeName,
    type: type,
    value: value,
    children: children,
    isCollapsed: false,
  };
}

/**
 * Recursively converts the internal tree structure to a plain JavaScript object.
 * NOTE: Functions are evaluated via `new Function()`, which should be used cautiously 
 * in real-world applications but is necessary for deep object reconstruction.
 * @param {object} rootNode - The internal tree node.
 * @returns {any} A plain JavaScript object or primitive value.
 */
export function treeToPlainObject(rootNode) {
  if (!rootNode) return {};

  const { type, value, children } = rootNode;

  // Leaf nodes
  if (!['object', 'array'].includes(type)) {
    if (type === 'number') return Number(value);
    if (type === 'boolean') return value === 'true' || value === true;
    if (type === 'function') {
      try {
        // Return an actual JS Function object
        return new Function(`return ${value}`)(); 
      } catch {
        return () => console.error("Invalid function definition.");
      }
    }
    return value;
  }

  // Complex nodes
  if (type === 'object') {
    const obj = {};
    for (const child of children) {
      if (child.name) {
        obj[child.name] = treeToPlainObject(child);
      }
    }
    return obj;
  }

  if (type === 'array') {
    return children.map(child => treeToPlainObject(child));
  }
}

/**
 * Recursively converts a plain JavaScript object or JSON structure to the internal tree structure.
 * @param {any} data - The input data structure.
 * @param {string} name - The property name for the current node.
 * @param {string} parentType - The parent's type ('object' or 'array').
 * @returns {object} The internal tree node structure.
 */
export function plainObjectToTree(data, name = 'root', parentType = 'object') {
  const detectedType = Array.isArray(data) ? 'array' : (typeof data === 'function' ? 'function' : typeof data);
  const type = detectedType === 'string' && data.startsWith('()') ? 'function' : detectedType;
  
  const node = createNode(name, type, parentType);
  
  if (type === 'object' && data !== null) {
    node.children = Object.entries(data).map(([key, val]) =>
      plainObjectToTree(val, key, 'object')
    );
  } else if (type === 'array') {
    node.children = data.map((val, index) =>
      plainObjectToTree(val, `[${index}]`, 'array')
    );
  } else {
    // For functions, store the string representation
    node.value = (type === 'function') ? data.toString() : data;
  }

  return node;
}

/**
 * Converts the internal tree structure into a D3 Hierarchy format.
 * D3 hierarchy typically expects { name, children: [...] }.
 * @param {object} rootNode - The internal tree node.
 * @returns {object} A structure ready for D3 visualization.
 */
export function treeToD3Hierarchy(rootNode) {
  if (!rootNode) return null;

  const d3Node = {
    name: rootNode.name || 'root',
    type: rootNode.type,
  };

  if (!['object', 'array'].includes(rootNode.type)) {
    d3Node.value = rootNode.value;
  }

  if (rootNode.children && rootNode.children.length > 0) {
    d3Node.children = rootNode.children.map(child => treeToD3Hierarchy(child));
  }

  return d3Node;
}

// src/helpers/jsonDataLoaderHelpers.js

/**
 * Attempts to parse a JSON string and validates the result.
 * @param {string} jsonString The string content to parse.
 * @returns {object|null} The parsed JavaScript object, or null if parsing fails.
 */
export function parseJsonString(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    // Optional: Add basic validation (e.g., check if it's an object/array)
    if (typeof data === 'object' && data !== null) {
      return data;
    }
    console.error('Parsed data is not a valid JSON object or array.');
    return null;
  } catch (e) {
    console.error('Invalid JSON format:', e.message);
    return null;
  }
}

/**
 * Pure JavaScript helper functions for data wrangling and DOM generation.
 * This file is kept minimal and functional as requested.
 */

// Utility function to determine if a string is valid JSON
const isJsonString = (str) => {
  try {
      JSON.parse(str);
  } catch (e) {
      return false;
  }
  return true;
};

/**
* Parses raw text input (JSON or CSV) into an array of objects.
* @param {string} text - The raw text content.
* @returns {{ data: Array<Object> | null, type: string, error: string | null }}
*/
export function parseDataset(text) {
  if (!text || text.trim() === '') {
      return { data: null, type: 'none', error: 'Input text is empty.' };
  }
  
  const trimmedText = text.trim();

  // 1. Attempt JSON parsing
  if (isJsonString(trimmedText)) {
      try {
          const data = JSON.parse(trimmedText);
          // Ensure it's an array of objects
          if (Array.isArray(data) && data.every(item => typeof item === 'object' && item !== null)) {
              return { data, type: 'json', error: null };
          }
          // If it's a single object, wrap it in an array
          if (typeof data === 'object' && data !== null) {
              return { data: [data], type: 'json', error: null };
          }
          return { data: null, type: 'json', error: 'JSON parsed successfully but did not result in an array of objects.' };
      } catch (e) {
          // Fall through to CSV if JSON parse fails or is not array/object
      }
  }

  // 2. Attempt CSV parsing (simple approach)
  try {
      const lines = trimmedText.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) {
          return { data: null, type: 'csv', error: 'CSV requires at least two lines (headers and one data row).' };
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const data = [];

      for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row = {};
          // Only assign values that correspond to a header
          headers.forEach((header, index) => {
              if (index < values.length) {
                  // Attempt basic type casting for numbers/booleans
                  let value = values[index];
                  if (!isNaN(Number(value)) && value.trim() !== '') {
                      row[header] = Number(value);
                  } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
                      row[header] = value.toLowerCase() === 'true';
                  } else {
                      row[header] = value;
                  }
              }
          });
          if (Object.keys(row).length > 0) {
              data.push(row);
          }
      }

      if (data.length > 0) {
          return { data, type: 'csv', error: null };
      }
      return { data: null, type: 'csv', error: 'CSV parsed headers but found no valid data rows.' };

  } catch (e) {
      return { data: null, type: 'none', error: 'Could not parse input as valid JSON or CSV.' };
  }
}

/**
* Analyzes the dataset to find all unique keys and fills missing keys with null.
* This ensures a cohesive dataset structure.
* @param {Array<Object>} rawData - The array of objects.
* @returns {{ cleanedData: Array<Object>, allKeys: Array<string> }}
*/
export function analyzeDataset(rawData) {
  if (!rawData || rawData.length === 0) {
      return { cleanedData: [], allKeys: [] };
  }

  const allKeysSet = new Set();
  rawData.forEach(row => {
      Object.keys(row).forEach(key => allKeysSet.add(key));
  });

  const allKeys = Array.from(allKeysSet);

  // Ensure all objects have all possible keys (filling gaps with null)
  const cleanedData = rawData.map(row => {
      const cleanedRow = {};
      allKeys.forEach(key => {
          // Use existing value or null if missing (cohesive interpretation)
          cleanedRow[key] = row.hasOwnProperty(key) ? row[key] : null;
      });
      return cleanedRow;
  });

  return { cleanedData, allKeys };
}

/**
* Sorts the dataset based on a given key and direction.
*/
export function sortData(data, key, direction) {
  if (!key) return data;

  const sortedData = [...data];

  sortedData.sort((a, b) => {
      const valA = a[key] === null ? (direction === 'asc' ? Infinity : -Infinity) : a[key];
      const valB = b[key] === null ? (direction === 'asc' ? Infinity : -Infinity) : b[key];

      // Handle string comparison
      if (typeof valA === 'string' && typeof valB === 'string') {
          return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      
      // Handle numeric/boolean comparison
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
  });

  return sortedData;
}


/**
* Renders the HTML table DOM structure as a string.
* This function returns a string to be set via innerHTML.
*/
export function createTableDOM(data = [], headers = [], sortState) {
  if (data.length === 0 || headers.length === 0) {
      return '<p class="data-table-placeholder">No data to display. Please load a valid dataset.</p>';
  }

  const getSortIndicator = (header) => {
      if (sortState.key === header) {
          return sortState.direction === 'asc' ? ' ▲' : ' ▼';
      }
      return '';
  };

  // The 'onclick' handler uses a global object (window.vueAppInstance) 
  // to call back to the Vue component's method. This is a necessary 
  // pattern when rendering dynamic content with innerHTML.
  const tableHeader = `
      <thead>
          <tr>
              ${headers.map(header => `
                  <th>
                      <button 
                          class="header-button" 
                          data-key="${header}"
                          onclick="window.vueAppInstance.handleSortClick(event, '${header}')"
                          title="Click to sort by ${header}"
                      >
                          ${header}
                          <span class="sort-indicator">${getSortIndicator(header)}</span>
                      </button>
                  </th>
              `).join('')}
          </tr>
      </thead>
  `;

  const tableBody = `
      <tbody>
          ${data.map(row => `
              <tr>
                  ${headers.map(header => {
                      // Display NULL explicitly for gaps
                      const cellValue = row[header] === null ? '<span class="null-cell">NULL</span>' : row[header];
                      return `<td>${cellValue}</td>`;
                  }).join('')}
              </tr>
          `).join('')}
      </tbody>
  `;

  return `<table class="data-table">${tableHeader}${tableBody}</table>`;
}