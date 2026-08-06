import assert from 'node:assert/strict';
import test from 'node:test';
import type { ModelsDevProvider } from '../models/models-dev';
import {
  mergeProviderWithTemplate,
  ModelsDevTemplateManager,
} from './models-dev-template-manager';

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

test('overlays DeepSeek effort controls without replacing upstream model data', async () => {
  const templates = await new ModelsDevTemplateManager().loadAllTemplates();
  const template = templates.get('deepseek');
  assert.ok(template);

  const upstream: ModelsDevProvider = {
    id: 'deepseek',
    name: 'DeepSeek',
    models: [
      {
        id: 'deepseek-v4-flash',
        name: 'DeepSeek V4 Flash',
        cost: { input: 0.14 },
        limit: { context: 1_000_000, output: 384_000 },
      },
      {
        id: 'deepseek-v4-pro',
        name: 'DeepSeek V4 Pro',
        cost: { input: 0.435 },
        limit: { context: 1_000_000, output: 384_000 },
      },
    ],
  };

  const merged = mergeProviderWithTemplate(upstream, template);
  const flash = merged.models.find(model => model.id === 'deepseek-v4-flash');
  const pro = merged.models.find(model => model.id === 'deepseek-v4-pro');

  assert.equal(flash?.cost?.input, 0.14);
  assert.equal(flash?.limit?.context, 1_000_000);
  assert.deepEqual(flash?.reasoning_options, [
    { type: 'toggle' },
    { type: 'effort', values: ['low', 'high', 'max'] },
  ]);
  assert.deepEqual(flash?.extra_capabilities?.reasoning?.effort_options, [
    'low',
    'high',
    'max',
  ]);

  assert.equal(pro?.cost?.input, 0.435);
  assert.equal(pro?.limit?.output, 384_000);
  assert.deepEqual(pro?.reasoning_options, [
    { type: 'toggle' },
    { type: 'effort', values: ['low', 'high', 'xhigh', 'max'] },
  ]);
  assert.deepEqual(pro?.extra_capabilities?.reasoning?.effort_options, [
    'low',
    'high',
    'xhigh',
    'max',
  ]);
});
