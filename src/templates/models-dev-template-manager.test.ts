import assert from 'node:assert/strict';
import test from 'node:test';
import type { ModelsDevProvider } from '../models/models-dev';
import { mergeProviderWithTemplate } from './models-dev-template-manager';

const minimaxM3Template: ModelsDevProvider = {
  id: 'minimax',
  name: 'MiniMax Template',
  models: [
    {
      id: 'MiniMax-M3',
      name: 'MiniMax-M3',
      vision: true,
      attachment: true,
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      limit: {
        context: 1000000,
        output: 131072,
      },
    },
  ],
};

function minimaxTemplateForProvider(providerId: string): ModelsDevProvider {
  return {
    ...minimaxM3Template,
    id: providerId,
  };
}

test('adds MiniMax-M3 fallback template when upstream has not published it yet', () => {
  const upstream: ModelsDevProvider = {
    id: 'minimax',
    name: 'MiniMax',
    models: [],
  };

  const merged = mergeProviderWithTemplate(upstream, minimaxM3Template);
  const m3 = merged.models.find(model => model.id === 'MiniMax-M3');

  assert.equal(m3?.limit?.context, 1000000);
  assert.equal(m3?.vision, true);
  assert.deepEqual(m3?.modalities?.input, ['text', 'image']);
});

test('adds MiniMax-M3 fallback to MiniMax provider variants', () => {
  for (const providerId of [
    'minimax-cn',
    'minimax-coding-plan',
    'minimax-cn-coding-plan',
  ]) {
    const upstream: ModelsDevProvider = {
      id: providerId,
      name: providerId,
      models: [],
    };

    const merged = mergeProviderWithTemplate(upstream, minimaxTemplateForProvider(providerId));
    const m3 = merged.models.find(model => model.id === 'MiniMax-M3');

    assert.equal(m3?.limit?.context, 1000000);
    assert.equal(m3?.vision, true);
    assert.deepEqual(m3?.modalities?.input, ['text', 'image']);
  }
});

test('keeps upstream MiniMax-M3 unchanged when it exists', () => {
  const upstreamM3 = {
    id: 'minimax-m3',
    name: 'Upstream MiniMax M3',
    vision: false,
    attachment: false,
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limit: {
      context: 512000,
      output: 64000,
    },
  };

  const upstream: ModelsDevProvider = {
    id: 'minimax',
    name: 'MiniMax',
    models: [upstreamM3],
  };

  const merged = mergeProviderWithTemplate(upstream, minimaxM3Template);

  assert.equal(merged.models.length, 1);
  assert.deepEqual(
    {
      id: merged.models[0]?.id,
      name: merged.models[0]?.name,
      vision: merged.models[0]?.vision,
      attachment: merged.models[0]?.attachment,
      modalities: merged.models[0]?.modalities,
      limit: merged.models[0]?.limit,
    },
    upstreamM3,
  );
});

test('keeps upstream MiniMax-M3 unchanged for MiniMax plan providers', () => {
  const upstreamM3 = {
    id: 'minimax-m3',
    name: 'Upstream MiniMax M3',
    vision: false,
    attachment: false,
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limit: {
      context: 512000,
      output: 64000,
    },
  };

  for (const providerId of ['minimax-coding-plan', 'minimax-cn-coding-plan']) {
    const upstream: ModelsDevProvider = {
      id: providerId,
      name: providerId,
      models: [upstreamM3],
    };

    const merged = mergeProviderWithTemplate(upstream, minimaxTemplateForProvider(providerId));

    assert.equal(merged.models.length, 1);
    assert.equal(merged.models[0]?.limit?.context, 512000);
    assert.equal(merged.models[0]?.vision, false);
    assert.deepEqual(merged.models[0]?.modalities?.input, ['text']);
  }
});
