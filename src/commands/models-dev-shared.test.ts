import assert from 'node:assert/strict';
import test from 'node:test';
import { correctLimitOutput, DEFAULT_OUTPUT_RATIO } from './models-dev-shared';
import type { ModelsDevProvider } from '../models/models-dev';

function providerWithModel(
  providerId: string,
  modelId: string,
  limit: { context: number; output: number },
): ModelsDevProvider {
  return {
    id: providerId,
    name: providerId,
    models: [
      {
        id: modelId,
        name: modelId,
        limit,
      },
    ],
  };
}

test('repairs deepseek v3/r1 output limits with the family ceiling', () => {
  const providers = {
    siliconflow: providerWithModel('siliconflow', 'deepseek-ai/DeepSeek-V3', {
      context: 164000,
      output: 164000,
    }),
  };

  const corrected = correctLimitOutput(providers);

  assert.equal(corrected, 1);
  assert.equal(providers.siliconflow.models?.[0].limit?.output, 8192);
  assert.equal(providers.siliconflow.models?.[0].limit?.context, 164000);
});

test('repairs qwen3-vl output limits with the family ceiling', () => {
  const providers = {
    siliconflow: providerWithModel('siliconflow', 'Qwen/Qwen3-VL-30B-A3B-Instruct', {
      context: 262000,
      output: 262000,
    }),
  };

  correctLimitOutput(providers);

  assert.equal(providers.siliconflow.models?.[0].limit?.output, 32768);
});

test('falls back to a context ratio for unknown families', () => {
  const providers = {
    siliconflow: providerWithModel('siliconflow', 'ByteDance-Seed/Seed-OSS-36B-Instruct', {
      context: 262000,
      output: 262000,
    }),
  };

  correctLimitOutput(providers);

  assert.equal(
    providers.siliconflow.models?.[0].limit?.output,
    Math.round(262000 * DEFAULT_OUTPUT_RATIO),
  );
});

test('falls back to the ratio when the family ceiling does not fit the context', () => {
  const providers = {
    siliconflow: providerWithModel('siliconflow', 'Pro/moonshotai/Kimi-K2.5', {
      context: 262000,
      output: 262000,
    }),
  };

  correctLimitOutput(providers);

  assert.equal(
    providers.siliconflow.models?.[0].limit?.output,
    Math.round(262000 * DEFAULT_OUTPUT_RATIO),
  );
});

test('keeps sane output limits untouched', () => {
  const providers = {
    siliconflow: providerWithModel('siliconflow', 'Qwen/Qwen3.5-27B', {
      context: 262144,
      output: 65536,
    }),
  };

  const corrected = correctLimitOutput(providers);

  assert.equal(corrected, 0);
  assert.equal(providers.siliconflow.models?.[0].limit?.output, 65536);
});

test('ignores providers that are not on the repair list', () => {
  const providers = {
    openai: providerWithModel('openai', 'gpt-5', { context: 128000, output: 128000 }),
  };

  const corrected = correctLimitOutput(providers);

  assert.equal(corrected, 0);
  assert.equal(providers.openai.models?.[0].limit?.output, 128000);
});

test('applies the rules to the siliconflow global endpoint as well', () => {
  const providers = {
    'siliconflow-com': providerWithModel('siliconflow-com', 'deepseek-ai/DeepSeek-V3.2', {
      context: 164000,
      output: 164000,
    }),
  };

  const corrected = correctLimitOutput(providers);

  assert.equal(corrected, 1);
  assert.equal(providers['siliconflow-com'].models?.[0].limit?.output, 65536);
});
