<script setup>
import FieldRow from './FieldRow.vue';
import { createField } from '../../../populationGenerator.js';

const props = defineProps({
  schema: { type: Object, required: true },
});
const emit = defineEmits(['update:schema']);

function updateDisplayName(e) {
  emit('update:schema', { ...props.schema, displayName: e.target.value });
}

function addField() {
  const newField = createField(props.schema.fields.length);
  emit('update:schema', { ...props.schema, fields: [...props.schema.fields, newField] });
}

function handleFieldUpdate(index, updatedField) {
  const fields = props.schema.fields.map((f, i) => i === index ? updatedField : f);
  emit('update:schema', { ...props.schema, fields });
}

function handleRemoveField(index) {
  const fields = props.schema.fields.filter((_, i) => i !== index);
  emit('update:schema', { ...props.schema, fields });
}
</script>

<template>
  <div class="schema-editor">
    <div class="schema-name-row">
      <label class="schema-label">Schema Name</label>
      <input
        type="text"
        class="schema-name-input"
        :value="schema.displayName"
        @input="updateDisplayName"
        placeholder="Give your population a name..."
      />
    </div>

    <div class="fields-section">
      <div class="fields-header">
        <span class="fields-title">Fields <span class="field-count">({{ schema.fields.length }})</span></span>
        <button class="add-field-button" @click="addField">+ Add Field</button>
      </div>

      <div v-if="schema.fields.length === 0" class="empty-fields">
        No fields defined yet. Add a field to get started.
      </div>

      <div class="fields-list">
        <FieldRow
          v-for="(field, index) in schema.fields"
          :key="field.id"
          :field="field"
          :index="index"
          @update:field="handleFieldUpdate(index, $event)"
          @remove-field="handleRemoveField"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.schema-editor {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.schema-name-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.schema-label {
  font-size: 0.9em;
  font-weight: 600;
  color: var(--color-dark);
  white-space: nowrap;
}

.schema-name-input {
  flex: 1;
  max-width: 400px;
  padding: 8px 12px;
  border: 1px solid #dce1e7;
  border-radius: 6px;
  font-size: 1em;
  background: #fff;
}

.schema-name-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.15);
}

.fields-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fields-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fields-title {
  font-size: 1em;
  font-weight: 600;
  color: var(--color-dark);
}

.field-count {
  color: #95a5a6;
  font-weight: 400;
}

.add-field-button {
  background-color: var(--color-primary);
  color: white;
  border: none;
  padding: 7px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.88em;
  font-weight: 600;
  transition: background-color 0.2s;
}

.add-field-button:hover {
  background-color: #2980b9;
}

.empty-fields {
  padding: 20px;
  text-align: center;
  color: #95a5a6;
  font-style: italic;
  background: #f7f9fb;
  border: 1px dashed #dce1e7;
  border-radius: 6px;
  font-size: 0.9em;
}

.fields-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
