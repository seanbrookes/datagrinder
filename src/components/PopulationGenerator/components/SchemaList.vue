<script setup>
defineProps({
  schemas: { type: Array, required: true },
});
const emit = defineEmits(['load-schema', 'delete-schema']);

function formatTimestamp(ts) {
  if (!ts) return 'N/A';
  return new Date(ts).toLocaleString();
}
</script>

<template>
  <div class="schema-list">
    <p v-if="schemas.length === 0" class="empty-state">
      No saved schemas yet. Build a schema and click "Save Schema" to store it here.
    </p>
    <table v-else class="schemas-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Fields</th>
          <th>Shape</th>
          <th>Count</th>
          <th>Updated</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="schema in schemas" :key="schema.name">
          <td class="name-cell">{{ schema.displayName }}</td>
          <td>{{ schema.fields?.length ?? 0 }}</td>
          <td><span class="shape-badge">{{ schema.outputShape }}</span></td>
          <td>{{ schema.count }}</td>
          <td class="timestamp-cell">{{ formatTimestamp(schema.updated) }}</td>
          <td class="actions-cell">
            <button class="action-btn load" @click="emit('load-schema', schema)">Load</button>
            <button class="action-btn delete" @click="emit('delete-schema', schema.name)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.schema-list {
  width: 100%;
}

.empty-state {
  padding: 16px;
  text-align: center;
  color: #95a5a6;
  font-style: italic;
  font-size: 0.9em;
  background: #f7f9fb;
  border: 1px dashed #dce1e7;
  border-radius: 6px;
}

.schemas-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88em;
}

.schemas-table th,
.schemas-table td {
  padding: 9px 12px;
  text-align: left;
  border-bottom: 1px solid #ecf0f1;
}

.schemas-table th {
  background-color: #f7f9fb;
  color: var(--color-dark);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.82em;
}

.schemas-table tr:hover {
  background-color: #fafbfc;
}

.name-cell {
  font-weight: 500;
  color: var(--color-dark);
}

.timestamp-cell {
  color: #95a5a6;
  font-size: 0.9em;
}

.shape-badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 10px;
  font-size: 0.82em;
  font-weight: 600;
  background-color: #eaf6ff;
  color: var(--color-primary);
}

.actions-cell {
  display: flex;
  gap: 6px;
}

.action-btn {
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.82em;
  font-weight: 600;
  transition: background-color 0.15s;
}

.action-btn.load {
  background-color: #2ecc71;
  color: white;
}

.action-btn.load:hover {
  background-color: #27ae60;
}

.action-btn.delete {
  background-color: #e74c3c;
  color: white;
}

.action-btn.delete:hover {
  background-color: #c0392b;
}
</style>
