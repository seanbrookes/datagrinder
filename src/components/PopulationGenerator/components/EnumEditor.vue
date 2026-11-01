<script setup>
import { deriveKey } from '../../../populationGenerator.js';

const props = defineProps({
  values: { type: Array, required: true },
});
const emit = defineEmits(['update:values']);

function addValue() {
  emit('update:values', [
    ...props.values,
    { display: '', key: '', autoKey: true },
  ]);
}

function removeValue(index) {
  emit('update:values', props.values.filter((_, i) => i !== index));
}

function updateDisplay(index, display) {
  const entry = props.values[index];
  emit('update:values', props.values.map((v, i) =>
    i === index
      ? { ...entry, display, key: entry.autoKey ? deriveKey(display) : entry.key }
      : v
  ));
}

function updateKey(index, key) {
  emit('update:values', props.values.map((v, i) =>
    i === index ? { ...v, key, autoKey: false } : v
  ));
}

function resetKeyToAuto(index) {
  const entry = props.values[index];
  emit('update:values', props.values.map((v, i) =>
    i === index ? { ...entry, key: deriveKey(entry.display), autoKey: true } : v
  ));
}
</script>

<template>
  <div class="enum-editor">
    <div v-if="values.length > 0" class="enum-col-headers">
      <span class="col-display">Display name</span>
      <span class="col-key">Key (used in data)</span>
    </div>

    <div v-for="(entry, index) in values" :key="index" class="enum-row">
      <input
        type="text"
        class="entry-input display-input"
        :value="entry.display"
        @input="updateDisplay(index, $event.target.value)"
        placeholder="e.g. Pending Review"
      />
      <span class="arrow">→</span>
      <div class="key-wrapper">
        <input
          type="text"
          :class="['entry-input', 'key-input', { 'key-auto': entry.autoKey }]"
          :value="entry.key"
          @input="updateKey(index, $event.target.value)"
          placeholder="key"
          spellcheck="false"
        />
        <span v-if="entry.autoKey" class="auto-badge" title="Auto-derived from display name">auto</span>
        <button
          v-else
          class="reset-btn"
          title="Reset to auto-derived key"
          @click="resetKeyToAuto(index)"
        >↺</button>
      </div>
      <button class="remove-btn" @click="removeValue(index)" title="Remove value">×</button>
    </div>

    <p v-if="values.length === 0" class="empty-hint">No values yet.</p>

    <button class="add-value-btn" @click="addValue">+ Add Value</button>
  </div>
</template>

<style scoped>
.enum-editor {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 360px;
}

.enum-col-headers {
  display: flex;
  gap: 8px;
  padding: 0 2px;
  align-items: center;
}

.col-display {
  font-size: 0.72em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #95a5a6;
  width: 148px;
  flex-shrink: 0;
}

.col-key {
  font-size: 0.72em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #95a5a6;
  margin-left: 16px; /* offset for arrow */
}

.enum-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.entry-input {
  padding: 5px 8px;
  border: 1px solid #dce1e7;
  border-radius: 4px;
  font-size: 0.84em;
  background: #fff;
  transition: border-color 0.15s;
}

.entry-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.12);
}

.display-input {
  width: 148px;
  flex-shrink: 0;
}

.arrow {
  color: #bdc3c7;
  font-size: 0.85em;
  flex-shrink: 0;
}

.key-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
}

.key-input {
  width: 140px;
  flex-shrink: 0;
  font-family: monospace;
  font-size: 0.82em;
}

.key-input.key-auto {
  background: #eaf6ff;
  color: #2471a3;
  border-color: #aed6f1;
}

.auto-badge {
  font-size: 0.68em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #2471a3;
  background: #d6eaf8;
  padding: 2px 5px;
  border-radius: 3px;
  flex-shrink: 0;
}

.reset-btn {
  background: none;
  border: 1px solid #aed6f1;
  color: #2471a3;
  border-radius: 4px;
  width: 22px;
  height: 22px;
  cursor: pointer;
  font-size: 0.85em;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
  transition: background-color 0.15s;
}

.reset-btn:hover {
  background-color: #d6eaf8;
}

.remove-btn {
  background: none;
  border: 1px solid #e74c3c;
  color: #e74c3c;
  border-radius: 4px;
  width: 22px;
  height: 22px;
  cursor: pointer;
  font-size: 0.9em;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
  transition: background-color 0.15s, color 0.15s;
}

.remove-btn:hover {
  background-color: #e74c3c;
  color: white;
}

.empty-hint {
  font-size: 0.82em;
  color: #bdc3c7;
  font-style: italic;
  margin: 0;
  padding: 2px 0;
}

.add-value-btn {
  align-self: flex-start;
  margin-top: 2px;
  background: none;
  border: 1px dashed #aed6f1;
  color: var(--color-primary);
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.82em;
  font-weight: 600;
  transition: background-color 0.15s, border-color 0.15s;
}

.add-value-btn:hover {
  background-color: #eaf6ff;
  border-color: var(--color-primary);
}
</style>
