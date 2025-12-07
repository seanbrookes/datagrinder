<script setup>
import { computed, defineProps, defineEmits, ref, watch } from 'vue';
import { DATA_TYPES } from '../../../dataHelpers';

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  parentType: {
    type: String,
    required: true // 'object' or 'array'
  },
});

const emit = defineEmits(['add-child', 'delete-node']);

// --- Type and Value Handling ---

const isContainer = computed(() => ['object', 'array'].includes(props.node.type));
const isRoot = computed(() => props.node.name === 'DataRoot');

// The value input model, handling type conversion on change
const internalValue = ref(props.node.value);

const handleValueChange = (newVal) => {
  let finalValue = newVal;
  
  if (props.node.type === 'number') {
    finalValue = parseFloat(newVal);
    if (isNaN(finalValue)) finalValue = 0;
  } else if (props.node.type === 'boolean') {
    // Select input returns strings, convert to boolean
    finalValue = newVal === 'true';
  }

  props.node.value = finalValue;
};

// Update internal value whenever node.value changes from the outside (e.g., initial load)
watch(() => props.node.value, (newVal) => {
  internalValue.value = newVal;
});

const typeChange = (newType) => {
  props.node.type = newType;
  // Reset value/children state when type changes
  if (isContainer.value) {
    props.node.value = null;
    if (!props.node.children) props.node.children = [];
  } else {
    props.node.children = [];
    if (newType === 'string') props.node.value = '';
    if (newType === 'number') props.node.value = 0;
    if (newType === 'boolean') props.node.value = false;
    if (newType === 'function') props.node.value = '() => {}';
  }
};

// --- Actions ---

const addChild = () => {
  emit('add-child', props.node.id);
};

const deleteNode = () => {
  emit('delete-node', props.node.id);
};
</script>

<template>
  <div :class="['node-editor', {'indent': !isRoot}]">
    
    <div class="node-content">
      
      <button 
        v-if="isContainer" 
        @click="node.isCollapsed = !node.isCollapsed"
        class="toggle-collapse"
        :class="{'rotated': !node.isCollapsed}"
        title="Toggle Collapse"
      >
        <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <span v-else class="spacer"></span> <input 
        v-if="parentType === 'object' && !isRoot"
        v-model="node.name"
        type="text"
        placeholder="Property Name"
        class="prop-name input"
      />
      <span v-else-if="parentType === 'array'" class="prop-index">[{{ node.name.match(/\[(\d+)\]/)?.[1] || 'Index' }}]</span>
      <span v-else class="prop-root">{{ node.name }}</span>

      <span class="separator">:</span>

      <select 
        :value="node.type" 
        @change="e => typeChange(e.target.value)" 
        class="type-select input"
      >
        <option v-for="type in DATA_TYPES" :key="type" :value="type">{{ type }}</option>
      </select>

      <template v-if="!isContainer">
        <input 
          v-if="node.type === 'string' || node.type === 'number'"
          :type="node.type === 'number' ? 'number' : 'text'"
          :value="node.value"
          @input="e => handleValueChange(e.target.value)"
          class="value-input input"
        />
        <select 
          v-else-if="node.type === 'boolean'"
          :value="String(node.value)"
          @change="e => handleValueChange(e.target.value)"
          class="value-boolean input"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
        <textarea 
          v-else-if="node.type === 'function'"
          :value="node.value"
          @input="e => node.value = e.target.value"
          placeholder="e.g., (a, b) => a + b"
          rows="1"
          class="value-function input"
        ></textarea>
        <span v-else class="value-placeholder">N/A</span>
      </template>

      <div class="actions">
        <button 
          v-if="isContainer" 
          @click="addChild" 
          class="action-btn add-btn"
          title="Add Child Node"
        >
          <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <button 
          @click="deleteNode" 
          :disabled="isRoot"
          class="action-btn delete-btn"
          title="Delete Node"
        >
          <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

    </div>

    <div v-if="isContainer && !node.isCollapsed" class="children-container">
      <NodeEditor
        v-for="(child) in node.children"
        :key="child.id"
        :node="child"
        :parent-type="node.type"
        @add-child="(id) => emit('add-child', id)"
        @delete-node="(id) => emit('delete-node', id)"
      />
    </div>
    
  </div>
</template>

<style scoped>
/* Base Reset and Variables */
.node-editor {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
}

/* Indentation and Hierarchy Line */
.node-editor.indent {
  margin-left: 20px;
  padding-left: 10px;
  border-left: 1px solid #ddd; /* Subtle hierarchy line */
}

.node-content {
  display: flex;
  align-items: center;
  padding: 4px 0;
  min-height: 36px;
  gap: 8px; /* Spacing between elements */
}

/* Base Input/Select Styling */
.input {
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  flex-shrink: 0; /* Prevent inputs from shrinking */
}

.input:focus {
  border-color: #4f46e5; /* Indigo Focus Color */
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
  outline: none;
}

/* Property Name and Index Styling */
.prop-name {
  width: 120px;
  font-weight: 600;
}
.prop-root {
  width: 120px;
  font-weight: 700;
  color: #4f46e5; /* Indigo */
  flex-shrink: 0;
}
.prop-index {
  width: 120px;
  font-family: monospace;
  color: #64748b; /* Slate */
  flex-shrink: 0;
}
.separator {
  font-weight: bold;
  color: #94a3b8; /* Slate */
  flex-shrink: 0;
}

/* Type Select Styling */
.type-select {
  width: 100px;
  background-color: #fff;
}

/* Value Input Styling */
.value-input {
  flex-grow: 1; /* Allow value to take up remaining space */
  min-width: 100px;
}
.value-function {
  flex-grow: 1;
  min-width: 150px;
  font-family: monospace;
  resize: vertical;
  min-height: 34px; /* Ensure one line height */
}
.value-boolean {
  width: 80px;
}

/* Collapse/Expand Button */
.toggle-collapse {
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px;
  border-radius: 50%;
  color: #4f46e5;
  transition: transform 0.2s ease, background-color 0.2s ease;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.toggle-collapse:hover {
  background-color: #e0e7ff; /* Light Indigo Hover */
}
.toggle-collapse.rotated {
  transform: rotate(90deg);
}
.spacer {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Action Buttons */
.actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  margin-left: auto;
}
.action-btn {
  border: none;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}
.action-btn .icon {
  width: 18px;
  height: 18px;
  stroke-width: 2.5;
  color: #fff;
}

.add-btn {
  background-color: #4f46e5; /* Indigo */
}
.add-btn:hover {
  background-color: #4338ca; /* Darker Indigo */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.delete-btn {
  background-color: #ef4444; /* Red */
}
.delete-btn:hover:not(:disabled) {
  background-color: #dc2626; /* Darker Red */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
.delete-btn:disabled {
  background-color: #94a3b8; /* Slate/Gray Disabled */
  cursor: not-allowed;
}

/* Icon size consistency */
.icon {
  width: 16px;
  height: 16px;
}
</style>