import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAiHubMixReasoningHintMap,
  type ModelsDevProvider,
} from './models-dev';

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
