import assert from 'node:assert/strict';
import test from 'node:test';
import type { ModelsDevProvider } from '../models/models-dev';
import { mergeProviderWithTemplate } from './models-dev-template-manager';

test('adds template-only models to the upstream provider', () => {
  const upstream: ModelsDevProvider = {
    id: 'moonshot-ai',
    name: 'Moonshot AI',
    models: [
      {
        id: 'kimi-k2.6',
        name: 'Kimi K2.6',
        limit: {
          context: 262144,
          output: 262144,
        },
      },
    ],
  };

  const template: ModelsDevProvider = {
    id: 'moonshot-ai',
    name: 'Moonshot AI',
    models: [
      {
        id: 'kimi-k2.7-code',
        name: 'Kimi K2.7 Code',
        family: 'kimi-k2.7-code',
        limit: {
          context: 262144,
          output: 262144,
        },
      },
    ],
  };

  const merged = mergeProviderWithTemplate(upstream, template);
  const k27 = merged.models.find(model => model.id === 'kimi-k2.7-code');

  assert.equal(merged.models.length, 2);
  assert.equal(k27?.name, 'Kimi K2.7 Code');
  assert.equal(k27?.family, 'kimi-k2.7-code');
  assert.equal(k27?.limit?.context, 262144);
});

test('merges template fields into matching upstream models', () => {
  const upstream: ModelsDevProvider = {
    id: 'example',
    name: 'Example',
    models: [
      {
        id: 'model-a',
        name: 'Model A',
        metadata: {
          upstream: true,
        },
        modalities: {
          input: ['text'],
        },
        limit: {
          context: 8192,
        },
      },
    ],
  };

  const template: ModelsDevProvider = {
    id: 'example',
    name: 'Example Template',
    models: [
      {
        id: 'model-a',
        name: 'Model A Template',
        metadata: {
          lifecycle: 'active',
        },
        modalities: {
          output: ['text'],
        },
        limit: {
          output: 4096,
        },
      },
    ],
  };

  const merged = mergeProviderWithTemplate(upstream, template);

  assert.equal(merged.name, 'Example Template');
  assert.deepEqual(merged.models[0]?.metadata, {
    upstream: true,
    lifecycle: 'active',
  });
  assert.deepEqual(merged.models[0]?.modalities, {
    input: ['text'],
    output: ['text'],
  });
  assert.deepEqual(merged.models[0]?.limit, {
    context: 8192,
    output: 4096,
  });
});
