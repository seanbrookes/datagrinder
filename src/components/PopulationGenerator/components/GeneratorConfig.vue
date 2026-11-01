<script setup>
import EnumEditor from './EnumEditor.vue';

const props = defineProps({
  generator: { type: Object, required: true },
  fieldType: { type: String, required: true },
});
const emit = defineEmits(['update:generator']);

function update(key, value) {
  emit('update:generator', { ...props.generator, [key]: value });
}
</script>

<template>
  <div class="generator-config">
    <!-- sequence -->
    <template v-if="generator.kind === 'sequence'">
      <label class="config-label">Start</label>
      <input
        type="number"
        class="config-input short"
        :value="generator.start"
        @input="update('start', Number($event.target.value))"
      />
      <label class="config-label">Step</label>
      <input
        type="number"
        class="config-input short"
        :value="generator.step"
        @input="update('step', Number($event.target.value))"
      />
    </template>

    <!-- range (numbers only) -->
    <template v-else-if="generator.kind === 'range'">
      <label class="config-label">Min</label>
      <input
        type="number"
        class="config-input short"
        :value="generator.min"
        @input="update('min', Number($event.target.value))"
      />
      <label class="config-label">Max</label>
      <input
        type="number"
        class="config-input short"
        :value="generator.max"
        @input="update('max', Number($event.target.value))"
      />
    </template>

    <!-- enum (list-based editor with display + key) -->
    <template v-else-if="generator.kind === 'enum'">
      <EnumEditor
        :values="generator.values ?? []"
        @update:values="update('values', $event)"
      />
    </template>

    <!-- constant -->
    <template v-else-if="generator.kind === 'constant'">
      <label class="config-label">Value</label>
      <template v-if="fieldType === 'boolean'">
        <select
          class="config-input"
          :value="String(generator.value)"
          @change="update('value', $event.target.value === 'true')"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </template>
      <template v-else-if="fieldType === 'number'">
        <input
          type="number"
          class="config-input"
          :value="generator.value"
          @input="update('value', $event.target.value)"
        />
      </template>
      <template v-else>
        <input
          type="text"
          class="config-input"
          :value="generator.value"
          @input="update('value', $event.target.value)"
        />
      </template>
    </template>
  </div>
</template>

<style scoped>
.generator-config {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.config-label {
  font-size: 0.8em;
  color: #7f8c8d;
  font-weight: 600;
  white-space: nowrap;
}

.config-input {
  padding: 4px 8px;
  border: 1px solid #dce1e7;
  border-radius: 4px;
  font-size: 0.85em;
  background: #fff;
  width: 140px;
}

.config-input.short {
  width: 70px;
}

.config-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.15);
}
</style>
