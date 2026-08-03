import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAiHubMixReasoningHintMap,
  createModelsDevModel,
  type ModelsDevProvider,
} from './models-dev';
import { createModelInfo, ModelType } from './model-info';

test('createModelsDevModel preserves extended cost fields in snake case', () => {
  const model = createModelInfo(
    'example-model',
    'Example Model',
    1_000_000,
    384_000,
    false,
    true,
    true,
    ModelType.Chat,
    {
      cost: {
        input: 0.435,
        output: 0.87,
        cacheRead: 0.003625,
        reasoning: 0.87,
        inputAudio: 1.5,
      },
    },
  );

  assert.deepEqual(createModelsDevModel(model).cost, {
    input: 0.435,
    output: 0.87,
    cache_read: 0.003625,
    reasoning: 0.87,
    input_audio: 1.5,
  });
});

test('buildAiHubMixReasoningHintMap detects extra capabilities and interleaved metadata', () => {
  const provider: ModelsDevProvider = {
    id: 'aihubmix',
    name: 'AIHubMix',
    models: [
      {
        id: 'vendor/from-extra',
        name: 'From Extra',
        extra_capabilities: {
          reasoning: {
            supported: true,
          },
        },
      },
      {
        id: 'vendor/from-interleaved',
        name: 'From Interleaved',
        interleaved: {
          field: 'reasoning_content',
        },
      },
    ],
  };

  const hintMap = buildAiHubMixReasoningHintMap(provider);

  assert.deepEqual(hintMap.get('vendor/from-extra'), { supported: true });
  assert.deepEqual(hintMap.get('from-extra'), { supported: true });
  assert.deepEqual(hintMap.get('vendor/from-interleaved'), { supported: true });
  assert.deepEqual(hintMap.get('from-interleaved'), { supported: true });
});
