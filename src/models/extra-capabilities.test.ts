import assert from 'node:assert/strict';
import test from 'node:test';
import { applyReasoningPortraitToModel } from './extra-capabilities';
import {
  applyReasoningPortraits,
  buildAiHubMixReasoningHintMap,
  type ModelsDevApiResponse,
  type ModelsDevProvider,
} from './models-dev';

function assertInterleavedThinkingShape(model: {
  [key: string]: unknown;
  extra_capabilities?: {
    reasoning?: {
      supported?: boolean;
      interleaved?: boolean;
      summaries?: boolean;
      visibility?: string;
      continuation?: string[];
    };
  };
}): void {
  assert.equal(model.extra_capabilities?.reasoning?.supported, true);
  assert.equal(model.extra_capabilities?.reasoning?.interleaved, true);
  assert.equal(model.extra_capabilities?.reasoning?.summaries, true);
  assert.equal(model.extra_capabilities?.reasoning?.visibility, 'summary');
  assert.deepEqual(model.extra_capabilities?.reasoning?.continuation, ['thinking_blocks']);
}

test('migrates legacy interleaved reasoning_content into extra capabilities', () => {
  const model = {
    id: 'vendor/example-reasoner',
    interleaved: {
      field: 'reasoning_content',
    },
  };

  applyReasoningPortraitToModel(model);

  assertInterleavedThinkingShape(model);
});

test('matches interleaved reasoning portraits for canonical and slash-prefixed ids', () => {
  const models = [
    { id: 'deepseek-reasoner' },
    { id: 'deepseek/deepseek-r1-0528' },
    { id: 'moonshotai/kimi-k2.5' },
    { id: 'z-ai/glm-4.7' },
    { id: 'glm-5' },
  ];

  for (const model of models) {
    applyReasoningPortraitToModel(model);
    assertInterleavedThinkingShape(model);
  }
});

test('aihubmix reasoning hints promote reasoning support even without a portrait', () => {
  const aihubmix: ModelsDevProvider = {
    id: 'aihubmix',
    name: 'AIHubMix',
    models: [
      {
        id: 'vendor/super-thinker',
        name: 'Super Thinker',
        reasoning: {
          supported: false,
        },
        metadata: {
          features: ['thinking', 'function_calling'],
        },
      },
    ],
  };

  const hintMap = buildAiHubMixReasoningHintMap(aihubmix);
  const data: ModelsDevApiResponse = {
    providers: {
      sample: {
        id: 'sample',
        name: 'Sample',
        models: [
          {
            id: 'vendor/super-thinker',
            name: 'Super Thinker',
            reasoning: {
              supported: false,
            },
          },
        ],
      },
    },
  };

  applyReasoningPortraits(data, hintMap);

  const providers = data.providers as Record<string, ModelsDevProvider>;
  const model = providers.sample.models[0];
  assert.equal(model.extra_capabilities?.reasoning?.supported, true);
  assert.equal(typeof model.reasoning === 'object' && model.reasoning?.supported, true);
});

test('portrait normalization syncs legacy reasoning when extra reasoning becomes supported', () => {
  const data: ModelsDevApiResponse = {
    providers: {
      sample: {
        id: 'sample',
        name: 'Sample',
        models: [
          {
            id: 'openai/gpt-5',
            name: 'GPT-5',
            reasoning: {
              supported: false,
            },
          },
        ],
      },
    },
  };

  applyReasoningPortraits(data);

  const providers = data.providers as Record<string, ModelsDevProvider>;
  const model = providers.sample.models[0];
  assert.equal(model.extra_capabilities?.reasoning?.supported, true);
  assert.equal(typeof model.reasoning === 'object' && model.reasoning?.supported, true);
});
