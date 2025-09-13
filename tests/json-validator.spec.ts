import { describe, it, expect } from 'vitest';
import { JsonValidator } from '../src/output/json-validator';
import { createProviderInfo } from '../src/models/provider-info';
import { createModelInfo, ModelType } from '../src/models/model-info';

describe('JsonValidator', () => {
  it('accepts a valid provider', () => {
    const model = createModelInfo('m', 'Model', 4096, 2048, true, false, false, ModelType.Chat);
    const provider = createProviderInfo('p', 'Provider', [model]);
    expect(() => JsonValidator.validateProviderInfo(provider)).not.toThrow();
  });

  it('rejects empty provider id', () => {
    const model = createModelInfo('m', 'Model', 4096, 2048, true, false, false, ModelType.Chat);
    const provider = createProviderInfo('', 'Provider', [model]);
    expect(() => JsonValidator.validateProviderInfo(provider)).toThrow();
  });

  it('rejects model with invalid tokens', () => {
    const badModel = { ...createModelInfo('m', 'Model', 4096, 4097, false, false, false, ModelType.Chat) };
    const provider = createProviderInfo('p', 'Provider', [badModel]);
    expect(() => JsonValidator.validateProviderInfo(provider)).toThrow();
  });
});

