<script setup>
import { computed } from 'vue';
import GeneratorConfig from './GeneratorConfig.vue';

const props = defineProps({
  field: { type: Object, required: true },
  index: { type: Number, required: true },
});
const emit = defineEmits(['update:field', 'remove-field']);

const FIELD_TYPES = ['string', 'number', 'boolean'];
const ALL_KINDS = ['constant', 'enum', 'sequence', 'range'];

const availableKinds = computed(() => {
  if (props.field.type !== 'number') return ALL_KINDS.filter(k => k !== 'range');
  return ALL_KINDS;
});

function handleNameChange(e) {
  emit('update:field', { ...props.field, name: e.target.value });
}

function handleTypeChange(e) {
  const newType = e.target.value;
  let kind = props.field.generator.kind;
  if (newType !== 'number' && kind === 'range') kind = 'constant';
  emit('update:field', { ...props.field, type: newType, generator: { ...props.field.generator, kind } });
}

function handleKindChange(e) {
  emit('update:field', { ...props.field, generator: { ...props.field.generator, kind: e.target.value } });
}

function handleGeneratorUpdate(newGenerator) {
  emit('update:field', { ...props.field, generator: newGenerator });
}
</script>

<template>
  <div :class="['field-row', { 'field-row--enum': field.generator.kind === 'enum' }]">
    <div class="field-controls">
      <span class="field-index">{{ index + 1 }}</span>

      <input
        type="text"
        class="field-input name-input"
        :value="field.name"
        @input="handleNameChange"
        placeholder="field name"
      />

      <select class="field-select" :value="field.type" @change="handleTypeChange">
        <option v-for="t in FIELD_TYPES" :key="t" :value="t">{{ t }}</option>
      </select>

      <select class="field-select" :value="field.generator.kind" @change="handleKindChange">
        <option v-for="k in availableKinds" :key="k" :value="k">{{ k }}</option>
      </select>

      <template v-if="field.generator.kind !== 'enum'">
        <GeneratorConfig
          :generator="field.generator"
          :fieldType="field.type"
          @update:generator="handleGeneratorUpdate"
        />
      </template>

      <button class="remove-button" @click="emit('remove-field', index)" title="Remove field">×</button>
    </div>

    <div v-if="field.generator.kind === 'enum'" class="enum-config-area">
      <GeneratorConfig
        :generator="field.generator"
        :fieldType="field.type"
        @update:generator="handleGeneratorUpdate"
      />
    </div>
  </div>
</template>

<style scoped>
.field-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: #f7f9fb;
  border: 1px solid #e8ecf0;
  border-radius: 6px;
}

.field-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.enum-config-area {
  padding-left: 26px; /* indent to align under name input, past the index */
}

.field-index {
  font-size: 0.8em;
  color: #95a5a6;
  font-weight: 700;
  min-width: 18px;
  padding-top: 5px;
}

.field-input,
.field-select {
  padding: 5px 8px;
  border: 1px solid #dce1e7;
  border-radius: 4px;
  font-size: 0.88em;
  background: #fff;
}

.field-input:focus,
.field-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.15);
}

.name-input {
  width: 130px;
}

.field-select {
  width: auto;
}

.remove-button {
  background: none;
  border: 1px solid #e74c3c;
  color: #e74c3c;
  border-radius: 4px;
  width: 26px;
  height: 26px;
  cursor: pointer;
  font-size: 1em;
  line-height: 1;
  padding: 0;
  margin-top: 2px;
  flex-shrink: 0;
  transition: background-color 0.15s, color 0.15s;
}

.remove-button:hover {
  background-color: #e74c3c;
  color: white;
}
</style>
