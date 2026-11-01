<script setup>
const props = defineProps({
  schema: { type: Object, required: true },
  isGenerating: { type: Boolean, default: false },
  hasOutput: { type: Boolean, default: false },
});
const emit = defineEmits(['update:schema', 'generate', 'save-schema', 'save-dataset']);

function updateCount(e) {
  const count = Math.max(1, Math.min(100000, Number(e.target.value) || 1));
  emit('update:schema', { ...props.schema, count });
}

function updateOutputShape(shape) {
  emit('update:schema', { ...props.schema, outputShape: shape });
}

const canGenerate = () => props.schema.fields.length > 0;
</script>

<template>
  <div class="generate-controls">
    <div class="controls-row">
      <div class="control-group">
        <label class="control-label">Record Count</label>
        <input
          type="number"
          class="count-input"
          :value="schema.count"
          @change="updateCount"
          min="1"
          max="100000"
        />
      </div>

      <div class="control-group">
        <label class="control-label">Output Shape</label>
        <div class="shape-toggle">
          <button
            :class="['shape-btn', { active: schema.outputShape === 'flat' }]"
            @click="updateOutputShape('flat')"
          >Flat (table)</button>
          <button
            :class="['shape-btn', { active: schema.outputShape === 'nested' }]"
            @click="updateOutputShape('nested')"
          >Nested (object)</button>
        </div>
      </div>
    </div>

    <div class="action-row">
      <button
        class="btn btn-primary"
        :disabled="!canGenerate() || isGenerating"
        @click="emit('generate')"
      >
        {{ isGenerating ? 'Generating...' : 'Generate' }}
      </button>
      <button class="btn btn-secondary" @click="emit('save-schema')">
        Save Schema
      </button>
      <button
        class="btn btn-success"
        :disabled="!hasOutput || schema.outputShape === 'nested'"
        @click="emit('save-dataset')"
        :title="schema.outputShape === 'nested' ? 'Copy JSON and paste into Object Editor' : ''"
      >
        Save as Dataset
      </button>
    </div>

    <p v-if="!canGenerate()" class="hint">Add at least one field to generate records.</p>
    <p v-if="hasOutput && schema.outputShape === 'nested'" class="hint">
      Nested output — copy the JSON below and paste it into the Object Editor.
    </p>
  </div>
</template>

<style scoped>
.generate-controls {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.controls-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.control-label {
  font-size: 0.88em;
  font-weight: 600;
  color: #7f8c8d;
}

.count-input {
  width: 100px;
  padding: 7px 10px;
  border: 1px solid #dce1e7;
  border-radius: 6px;
  font-size: 0.95em;
}

.count-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.15);
}

.shape-toggle {
  display: flex;
  border: 1px solid #dce1e7;
  border-radius: 6px;
  overflow: hidden;
}

.shape-btn {
  background: #fff;
  border: none;
  padding: 7px 14px;
  cursor: pointer;
  font-size: 0.88em;
  font-weight: 500;
  color: #7f8c8d;
  transition: background-color 0.15s, color 0.15s;
}

.shape-btn:not(:last-child) {
  border-right: 1px solid #dce1e7;
}

.shape-btn.active {
  background-color: var(--color-primary);
  color: white;
  font-weight: 600;
}

.shape-btn:not(.active):hover {
  background-color: #f7f9fb;
}

.action-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  padding: 9px 18px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 600;
  transition: background-color 0.2s, transform 0.1s;
}

.btn:active {
  transform: translateY(1px);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-secondary {
  background-color: #f39c12;
  color: white;
}

.btn-secondary:hover {
  background-color: #e67e22;
}

.btn-success {
  background-color: #2ecc71;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #27ae60;
}

.hint {
  font-size: 0.82em;
  color: #95a5a6;
  font-style: italic;
  margin: 0;
}
</style>
