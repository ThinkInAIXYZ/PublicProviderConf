import { describe, it, expect } from 'vitest';
import { DataNormalizer } from '../src/processor/data-normalizer';
import { createModelInfo, ModelType } from '../src/models/model-info';

describe('DataNormalizer', () => {
  it('trims model name and id', () => {
    const model = createModelInfo('  id  ', '  Name  ', 4096, 2048, false, false, false, ModelType.Chat);
    const normalized = DataNormalizer.normalizeModelInfo(model);
    expect(normalized.name).toBe('Name');
    expect(normalized.id).toBe('id');
  });

  it('deduplicates models by id', () => {
    const m1 = createModelInfo('a', 'A', 4096, 2048, false, false, false, ModelType.Chat);
    const m2 = createModelInfo('a', 'A dup', 4096, 2048, false, false, false, ModelType.Chat);
    const unique = DataNormalizer.deduplicateModels([m1, m2]);
    expect(unique.length).toBe(1);
    expect(unique[0].id).toBe('a');
  });

  it('sorts models by name', () => {
    const a = createModelInfo('a', 'b', 4096, 2048, false, false, false, ModelType.Chat);
    const b = createModelInfo('b', 'a', 4096, 2048, false, false, false, ModelType.Chat);
    const sorted = DataNormalizer.sortModelsByName([a, b]);
    expect(sorted.map(m => m.name)).toEqual(['a', 'b']);
  });
});

