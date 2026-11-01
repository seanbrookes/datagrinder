/**
 * Population Generator — pure generation engine.
 * No Vue or store dependencies.
 */

/**
 * Derives a clean key string from a display name.
 * Lowercases, replaces non-alphanumeric runs with underscores, trims underscores.
 * @param {string} display
 * @returns {string}
 */
export function deriveKey(display) {
  return display
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Generates records from a population schema.
 * @param {object} schema - A valid population schema.
 * @returns {Array<object>|object} Flat array (outputShape='flat') or keyed root object (outputShape='nested').
 */
export function generatePopulation(schema) {
  const { fields, count, outputShape } = schema;

  const sequenceCounters = {};
  fields.forEach(f => {
    if (f.generator.kind === 'sequence') {
      sequenceCounters[f.id] = Number(f.generator.start ?? 1);
    }
  });

  const records = [];
  for (let i = 0; i < count; i++) {
    const record = {};
    for (const field of fields) {
      if (field.name) {
        record[field.name] = generateValue(field, sequenceCounters, i);
      }
    }
    records.push(record);
  }

  if (outputShape === 'nested') {
    const root = {};
    records.forEach((rec, idx) => { root[`record_${idx}`] = rec; });
    return root;
  }

  return records;
}

function generateValue(field, sequenceCounters, rowIndex) {
  const { generator, type } = field;

  switch (generator.kind) {
    case 'sequence': {
      const val = sequenceCounters[field.id];
      sequenceCounters[field.id] += Number(generator.step ?? 1);
      return val;
    }
    case 'range': {
      const min = Number(generator.min ?? 0);
      const max = Number(generator.max ?? 100);
      const raw = Math.random() * (max - min) + min;
      return parseFloat(raw.toFixed(4));
    }
    case 'enum': {
      const values = generator.values ?? [];
      if (values.length === 0) return null;
      const picked = values[Math.floor(Math.random() * values.length)];
      // Support both { key, display } objects (new) and plain strings (legacy)
      return (picked && typeof picked === 'object') ? picked.key : picked;
    }
    case 'constant':
      return castToType(generator.value, type);
    default:
      return null;
  }
}

function castToType(value, type) {
  if (type === 'number') return Number(value);
  if (type === 'boolean') return value === true || value === 'true';
  return String(value ?? '');
}

/**
 * Creates a new field definition with default generator config.
 * @param {number} index - The field's position index (for default name).
 * @returns {object} A new field definition.
 */
export function createField(index = 0) {
  return {
    id: crypto.randomUUID(),
    name: `field${index + 1}`,
    type: 'string',
    generator: {
      kind: 'constant',
      start: 1,
      step: 1,
      min: 0,
      max: 100,
      values: [],
      value: '',
    },
  };
}

/**
 * Creates a blank population schema with default values.
 * @returns {object} A new schema object.
 */
export function createSchema() {
  return {
    displayName: 'New Population',
    count: 100,
    outputShape: 'flat',
    fields: [],
  };
}
