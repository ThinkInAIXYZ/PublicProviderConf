import { describe, it, expect } from 'vitest';
import { DataAggregator } from '../src/processor/data-aggregator';
import { createProviderInfo } from '../src/models/provider-info';
import { createModelInfo, ModelType } from '../src/models/model-info';

describe('DataAggregator', () => {
  const p1 = createProviderInfo('p1', 'P1', [
    createModelInfo('a', 'A', 4096, 2048, true, false, false, ModelType.Chat),
    createModelInfo('b', 'B', 8192, 4096, false, true, true, ModelType.Chat),
  ]);
  const p2 = createProviderInfo('p2', 'P2', [
    createModelInfo('c', 'C', 16384, 8192, false, false, true, ModelType.Chat),
  ]);

  it('aggregates providers and counts models', () => {
    const out = DataAggregator.aggregateProviders([p1, p2]);
    expect(out.totalModels).toBe(3);
    expect(Object.keys(out.providers)).toEqual(['p1', 'p2']);
  });

  it('computes provider statistics', () => {
    const stats = DataAggregator.getProviderStatistics([p1, p2]);
    expect(stats.totalProviders).toBe(2);
    expect(stats.totalModels).toBe(3);
    expect(stats.averageModelsPerProvider).toBeCloseTo(1.5);
  });

  it('computes capability counts', () => {
    const caps = DataAggregator.getUniqueCapabilities([p1, p2]);
    expect(caps.totalModels).toBe(3);
    expect(caps.reasoning).toBe(2);
    expect(caps.functionCall).toBe(1);
    expect(caps.vision).toBe(1);
  });
});

