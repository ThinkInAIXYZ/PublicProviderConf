import assert from 'node:assert/strict';
import test from 'node:test';
import { createModelsDevModel } from '../models/models-dev';
import { ZenMuxProvider } from './ZenMuxProvider';

test('uses ZenMux token limits ahead of matched provider limits', async () => {
  const argon = 'google/gemini-4-argon';
  const explicit = 'vendor/explicit';
  const fallback = 'vendor/fallback';
  const rawOnly = 'vendor/raw-only';
  const data = [
    { id: argon, context_length: 1048576, max_tokens: '65,536' },
    { id: explicit, max_output_tokens: 16384, max_tokens: 8192 },
    { id: fallback, context_length: 0, max_output_tokens: 'invalid', max_tokens: -1 },
    { id: rawOnly, context_length: 8192, max_output_tokens: 0, max_tokens: 4096 },
  ];
  const provider = new ZenMuxProvider(
    `data:application/json,${encodeURIComponent(JSON.stringify({ data }))}`,
    {
      providers: [{
        id: 'vercel',
        name: 'Vercel AI Gateway',
        models: [
          { id: argon, name: 'Gemini 4 Argon', limit: { context: 1000000, output: 1000000 }, tool_call: true },
          { id: explicit, name: 'Explicit', limit: { context: 32768, output: 4096 } },
          { id: fallback, name: 'Fallback', limit: { context: 65536, output: 2048 } },
        ],
      }],
    },
  );

  const models = (await provider.fetchModels()).map(createModelsDevModel);
  assert.deepEqual(models.map(model => [model.id, model.limit?.context, model.limit?.output]), [
    [argon, 1048576, 65536],
    [explicit, 32768, 16384],
    [fallback, 65536, 2048],
    [rawOnly, 8192, 4096],
  ]);
  assert.equal(models[0].tool_call, true);
});
