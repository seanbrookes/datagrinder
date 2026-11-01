<script setup>
import { ref, computed, onMounted } from 'vue';
import { useDataStudioStore } from '../../stores/dataStore.js';
import { generatePopulation, createSchema } from '../../populationGenerator.js';
import { analyzeDataset } from '../../dataHelpers.js';
import SchemaEditor from './components/SchemaEditor.vue';
import GenerateControls from './components/GenerateControls.vue';
import SchemaList from './components/SchemaList.vue';

const store = useDataStudioStore();

const draftSchema = ref(createSchema());
const generatedData = ref(null);
const isGenerating = ref(false);
const saveStatus = ref('');
const showSavedSchemas = ref(false);

onMounted(() => {
  store.refreshStorageData();
});

// --- Output accessors ---

const isFlat = computed(() => draftSchema.value.outputShape === 'flat');

const previewHeaders = computed(() => {
  if (!generatedData.value || !Array.isArray(generatedData.value) || generatedData.value.length === 0) return [];
  return Object.keys(generatedData.value[0]);
});

const previewRows = computed(() => {
  if (!isFlat.value || !generatedData.value) return [];
  return generatedData.value.slice(0, 5);
});

const nestedJson = computed(() => {
  if (isFlat.value || !generatedData.value) return '';
  return JSON.stringify(generatedData.value, null, 2);
});

const outputSummary = computed(() => {
  if (!generatedData.value) return '';
  if (isFlat.value) {
    return `Generated ${generatedData.value.length} records with ${previewHeaders.value.length} field(s).`;
  }
  const count = Object.keys(generatedData.value).length;
  return `Generated ${count} nested records.`;
});

// --- Handlers ---

function handleGenerate() {
  if (draftSchema.value.fields.length === 0) return;
  isGenerating.value = true;
  saveStatus.value = '';
  setTimeout(() => {
    generatedData.value = generatePopulation(draftSchema.value);
    isGenerating.value = false;
  }, 0);
}

async function handleSaveSchema() {
  saveStatus.value = '';
  const savedKey = await store.saveSchema(draftSchema.value);
  if (savedKey) {
    draftSchema.value = { ...draftSchema.value, name: savedKey };
    saveStatus.value = 'Schema saved.';
  }
}

async function handleSaveDataset() {
  if (!generatedData.value || !isFlat.value) return;
  const { cleanedData, allKeys } = analyzeDataset(generatedData.value);
  const safeName = draftSchema.value.displayName.replace(/\s+/g, '-').toLowerCase();
  const success = await store.saveNewDataset({
    dataset: cleanedData,
    sourceData: JSON.stringify(cleanedData),
    name: `pop-${safeName}-${Date.now()}`,
    displayName: `${draftSchema.value.displayName} (generated)`,
    columnKeys: allKeys,
    rows: cleanedData.length,
    metadata: { columns: allKeys },
  });
  if (success) saveStatus.value = 'Dataset saved! View it in the Storage Manager.';
}

function handleLoadSchema(schema) {
  draftSchema.value = { ...schema };
  generatedData.value = null;
  saveStatus.value = '';
  showSavedSchemas.value = false;
}

async function handleDeleteSchema(name) {
  if (confirm(`Delete schema "${name}"?`)) {
    await store.deleteSchema(name);
  }
}

function handleNewSchema() {
  draftSchema.value = createSchema();
  generatedData.value = null;
  saveStatus.value = '';
}

async function copyJson() {
  try {
    await navigator.clipboard.writeText(nestedJson.value);
    saveStatus.value = 'JSON copied to clipboard.';
  } catch {
    saveStatus.value = 'Copy failed — please select and copy the text manually.';
  }
}
</script>

<template>
  <div class="population-generator">
    <div class="pg-header">
      <h1 class="pg-title">Population Generator</h1>
      <p class="pg-subtitle">Define a schema with field rules and generate synthetic datasets.</p>
    </div>

    <!-- Saved Schemas -->
    <section class="pg-section">
      <div class="section-header">
        <h2 class="section-title">Saved Schemas</h2>
        <button class="toggle-btn" @click="showSavedSchemas = !showSavedSchemas">
          {{ showSavedSchemas ? 'Hide' : 'Show' }} ({{ store.savedSchemas.length }})
        </button>
      </div>
      <div v-if="showSavedSchemas">
        <SchemaList
          :schemas="store.savedSchemas"
          @load-schema="handleLoadSchema"
          @delete-schema="handleDeleteSchema"
        />
      </div>
    </section>

    <!-- Schema Definition -->
    <section class="pg-section schema-section">
      <div class="section-header">
        <h2 class="section-title">Schema Definition</h2>
        <button class="new-schema-btn" @click="handleNewSchema">New Schema</button>
      </div>
      <SchemaEditor
        :schema="draftSchema"
        @update:schema="draftSchema = $event"
      />
    </section>

    <!-- Generate Controls -->
    <section class="pg-section">
      <h2 class="section-title">Generate</h2>
      <GenerateControls
        :schema="draftSchema"
        :isGenerating="isGenerating"
        :hasOutput="generatedData !== null"
        @update:schema="draftSchema = $event"
        @generate="handleGenerate"
        @save-schema="handleSaveSchema"
        @save-dataset="handleSaveDataset"
      />
      <p v-if="saveStatus" class="save-status">{{ saveStatus }}</p>
    </section>

    <!-- Output Preview -->
    <section v-if="generatedData !== null" class="pg-section output-section">
      <h2 class="section-title">Output</h2>
      <p class="output-summary">{{ outputSummary }}</p>

      <!-- Flat preview table -->
      <template v-if="isFlat && previewRows.length > 0">
        <p class="preview-label">Preview (first {{ previewRows.length }} rows)</p>
        <div class="table-wrapper">
          <table class="preview-table">
            <thead>
              <tr>
                <th v-for="key in previewHeaders" :key="key">{{ key }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in previewRows" :key="i">
                <td v-for="key in previewHeaders" :key="key">
                  <span v-if="row[key] === null" class="null-cell">NULL</span>
                  <span v-else>{{ row[key] }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="generatedData.length > 5" class="preview-more">
          … and {{ generatedData.length - 5 }} more records
        </p>
      </template>

      <!-- Nested JSON output -->
      <template v-if="!isFlat">
        <div class="json-header">
          <p class="preview-label">JSON Output</p>
          <button class="copy-btn" @click="copyJson">Copy JSON</button>
        </div>
        <pre class="json-preview">{{ nestedJson }}</pre>
      </template>
    </section>
  </div>
</template>

<style scoped>
.population-generator {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.pg-header {
  margin-bottom: 4px;
}

.pg-title {
  font-size: 2em;
  font-weight: 700;
  color: var(--color-primary);
  margin: 0 0 4px;
}

.pg-subtitle {
  color: #7f8c8d;
  font-size: 1.05em;
  margin: 0;
}

.pg-section {
  background: #fff;
  border-radius: 0 12px 12px 0;
  border-left: 5px solid var(--color-primary);
  padding: 20px 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.schema-section {
  border-left-color: var(--color-accent, #f39c12);
}

.output-section {
  border-left-color: #2ecc71;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-size: 1.2em;
  font-weight: 600;
  color: var(--color-dark);
  margin: 0 0 16px;
}

.section-header .section-title {
  margin: 0;
}

.toggle-btn {
  background: none;
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  padding: 5px 12px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.85em;
  font-weight: 600;
  transition: background-color 0.15s, color 0.15s;
}

.toggle-btn:hover {
  background-color: var(--color-primary);
  color: white;
}

.new-schema-btn {
  background: none;
  border: 1px solid #95a5a6;
  color: #7f8c8d;
  padding: 5px 12px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.85em;
  font-weight: 600;
  transition: border-color 0.15s, color 0.15s;
}

.new-schema-btn:hover {
  border-color: var(--color-dark);
  color: var(--color-dark);
}

.save-status {
  margin: 10px 0 0;
  font-size: 0.88em;
  color: #27ae60;
  font-weight: 500;
}

.output-summary {
  font-size: 0.95em;
  font-weight: 600;
  color: var(--color-dark);
  margin: 0 0 14px;
}

.preview-label {
  font-size: 0.85em;
  font-weight: 600;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 8px;
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid #ecf0f1;
  border-radius: 6px;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88em;
}

.preview-table th,
.preview-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #ecf0f1;
}

.preview-table th {
  background-color: #f7f9fb;
  color: var(--color-dark);
  font-weight: 600;
  font-size: 0.85em;
  text-transform: uppercase;
}

.preview-table tr:last-child td {
  border-bottom: none;
}

.null-cell {
  color: #bdc3c7;
  font-style: italic;
}

.preview-more {
  font-size: 0.82em;
  color: #95a5a6;
  margin: 8px 0 0;
  font-style: italic;
}

.json-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.copy-btn {
  background-color: var(--color-primary);
  color: white;
  border: none;
  padding: 5px 12px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.82em;
  font-weight: 600;
  transition: background-color 0.15s;
}

.copy-btn:hover {
  background-color: #2980b9;
}

.json-preview {
  background-color: #f7f9fb;
  border: 1px solid #ecf0f1;
  border-radius: 6px;
  padding: 14px;
  font-size: 0.82em;
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
  color: var(--color-dark);
  font-family: monospace;
}

@media (max-width: 768px) {
  .population-generator {
    gap: 16px;
  }
  .pg-section {
    padding: 16px;
  }
  .pg-title {
    font-size: 1.6em;
  }
}
</style>
