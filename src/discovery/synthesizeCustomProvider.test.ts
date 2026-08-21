import assert from 'node:assert/strict';
import test from 'node:test';
import { createModelInfo, ModelType } from '../models/model-info';
import { createProviderInfo } from '../models/provider-info';
import { JsonValidator } from '../output/json-validator';
import { applyReasoningPortraits, createModelsDevProvider } from '../models/models-dev';
import { CustomProvider } from '../providers/CustomProvider';
import { synthesizeCustomProvider } from './synthesizeCustomProvider';
import type {
  CustomProviderSeedCatalog,
  ModelsAdapter,
  SourceDiscoveryResult,
} from './types';

const API_KEY_ENVS = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'MOONSHOT_API_KEY',
  'DEEPSEEK_API_KEY',
];

async function withoutApiKeys<T>(callback: () => Promise<T>): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const envName of API_KEY_ENVS) {
    previous.set(envName, process.env[envName]);
    delete process.env[envName];
  }

  try {
    return await callback();
  } finally {
    for (const [envName, value] of previous) {
      if (value === undefined) {
        delete process.env[envName];
      } else {
        process.env[envName] = value;
      }
    }
  }
}

test('custom provider exposes the expected id and display name', () => {
  const provider = new CustomProvider();

  assert.equal(provider.providerId(), 'custom-provider');
  assert.equal(provider.providerName(), 'custom provider');
});

test('uses official doc-derived seeds when API keys are missing', async () => {
  await withoutApiKeys(async () => {
    const result = await synthesizeCustomProvider();

    assert.equal(result.models.length, result.catalog.maxModels);
    assert.deepEqual(
      result.summaries.map(summary => [summary.displayName, summary.selected]),
      [
        ['OpenAI', 10],
        ['Anthropic', 4],
        ['Gemini', 5],
        ['Kimi', 5],
        ['DeepSeek', 3],
        ['Zhipu', 5],
        ['MiniMax', 5],
      ],
    );
    assert.equal(
      result.summaries.every(summary => summary.status === 'seed'),
      true,
    );
  });
});

test('creates valid normalized model cards in the provider output shape', async () => {
  await withoutApiKeys(async () => {
    const result = await synthesizeCustomProvider();
    const seededDeepSeekV4Flash = result.models.find(item => item.id === 'deepseek-v4-flash');
    const seededDeepSeekV4FlashVision = result.models.find(
      item => item.id === 'deepseek-v4-flash-vision-exp',
    );
    const seededDeepSeekV4Pro = result.models.find(item => item.id === 'deepseek-v4-pro');
    const seededKimiK25 = result.models.find(item => item.id === 'kimi-k2.5');
    const providerInfo = createProviderInfo(
      'custom-provider',
      'custom provider',
      result.models,
      { lastUpdated: new Date(result.catalog.updatedAt) },
    );

    JsonValidator.validateProviderInfo(providerInfo);

    const provider = createModelsDevProvider(providerInfo);
    const model = provider.models.find(item => item.id === 'gpt-5.4');
    const gpt55 = provider.models.find(item => item.id === 'gpt-5.5');
    const gpt56 = provider.models.find(item => item.id === 'gpt-5.6');
    const gpt56Sol = provider.models.find(item => item.id === 'gpt-5.6-sol');
    const gpt56Terra = provider.models.find(item => item.id === 'gpt-5.6-terra');
    const gpt56Luna = provider.models.find(item => item.id === 'gpt-5.6-luna');
    const deepSeekV4Flash = provider.models.find(item => item.id === 'deepseek-v4-flash');
    const deepSeekV4FlashVision = provider.models.find(
      item => item.id === 'deepseek-v4-flash-vision-exp',
    );
    const deepSeekV4 = provider.models.find(item => item.id === 'deepseek-v4-pro');
    const deepSeekChat = provider.models.find(item => item.id === 'deepseek-chat');
    const claudeOpus5 = provider.models.find(item => item.id === 'claude-opus-5');
    const gemini36Flash = provider.models.find(item => item.id === 'gemini-3.6-flash');
    const kimiK3 = provider.models.find(item => item.id === 'kimi-k3');
    const glm52 = provider.models.find(item => item.id === 'glm-5.2');
    const miniMaxM3 = provider.models.find(item => item.id === 'MiniMax-M3');
    const providerData = { providers: { [provider.id]: provider } };

    assert.deepEqual(
      seededDeepSeekV4Flash?.extraCapabilities?.reasoning?.effort_options,
      ['low', 'high', 'max'],
    );
    assert.equal(seededDeepSeekV4FlashVision?.vision, true);
    assert.equal(seededDeepSeekV4FlashVision?.attachment, true);
    assert.deepEqual(
      seededDeepSeekV4FlashVision?.extraCapabilities?.reasoning?.effort_options,
      ['low', 'high', 'max'],
    );
    assert.deepEqual(
      seededDeepSeekV4Pro?.extraCapabilities?.reasoning?.effort_options,
      ['high', 'max'],
    );
    assert.equal(seededKimiK25?.extraCapabilities?.reasoning?.default_enabled, true);

    applyReasoningPortraits(providerData);
    const miniMaxM27 = provider.models.find(item => item.id === 'MiniMax-M2.7');

    assert.equal(provider.id, 'custom-provider');
    assert.equal(provider.name, 'custom provider');
    assert.equal(gpt55?.metadata?.apiStatus, 'active');
    assert.equal(gpt55?.metadata?.lifecycle, 'active');
    assert.equal(gpt55?.extra_capabilities?.reasoning?.effort_options?.includes('xhigh'), true);
    assert.ok(gpt56);
    assert.ok(gpt56Sol);
    assert.ok(gpt56Terra);
    assert.ok(gpt56Luna);

    const {
      id: _gpt56Id,
      name: _gpt56Name,
      display_name: _gpt56DisplayName,
      ...gpt56Comparable
    } = gpt56;
    const {
      id: _gpt56SolId,
      name: _gpt56SolName,
      display_name: _gpt56SolDisplayName,
      ...gpt56SolComparable
    } = gpt56Sol;

    assert.deepEqual(gpt56Comparable, gpt56SolComparable);
    for (const gpt56Model of [gpt56, gpt56Sol, gpt56Terra, gpt56Luna]) {
      assert.deepEqual(gpt56Model.extra_capabilities?.reasoning?.effort_options, [
        'none',
        'low',
        'medium',
        'high',
        'xhigh',
        'max',
      ]);
      assert.equal(gpt56Model.extra_capabilities?.reasoning?.effort, 'medium');
      assert.equal(gpt56Model.metadata?.lifecycle, 'active');
    }
    assert.equal(model?.type, 'chat');
    assert.equal(model?.tool_call, true);
    assert.equal(model?.structured_output, true);
    assert.equal(model?.vision, true);
    assert.equal(model?.limit?.context, 1050000);
    assert.equal(model?.limit?.output, 128000);
    assert.equal(model?.metadata?.sourceProvider, 'openai');
    assert.equal(deepSeekV4?.limit?.context, 1000000);
    assert.equal(deepSeekV4?.limit?.output, 384000);
    assert.equal(deepSeekV4?.cost?.input, 0.435);
    assert.equal(deepSeekV4?.cost?.output, 0.87);
    assert.equal(deepSeekV4?.cost?.reasoning, 0.87);
    assert.equal(deepSeekV4?.cost?.cache_read, 0.003625);
    assert.equal(deepSeekV4?.open_weights, true);
    assert.deepEqual(deepSeekV4Flash?.reasoning_options, [
      { type: 'toggle', values: undefined },
      { type: 'effort', values: ['low', 'high', 'max'] },
    ]);
    assert.equal(deepSeekV4FlashVision?.vision, true);
    assert.equal(deepSeekV4FlashVision?.attachment, true);
    assert.deepEqual(deepSeekV4FlashVision?.modalities?.input, ['text', 'image']);
    assert.deepEqual(deepSeekV4FlashVision?.reasoning_options, [
      { type: 'toggle', values: undefined },
      { type: 'effort', values: ['low', 'high', 'max'] },
    ]);
    assert.deepEqual(deepSeekV4?.reasoning_options, [
      { type: 'toggle', values: undefined },
      { type: 'effort', values: ['high', 'max'] },
    ]);
    assert.deepEqual(deepSeekV4Flash?.extra_capabilities?.reasoning?.effort_options, [
      'low',
      'high',
      'max',
    ]);
    assert.deepEqual(deepSeekV4?.extra_capabilities?.reasoning?.effort_options, [
      'high',
      'max',
    ]);
    assert.equal(deepSeekChat, undefined);
    assert.ok(claudeOpus5);
    assert.ok(gemini36Flash);
    assert.equal(kimiK3?.limit?.context, 1048576);
    assert.equal(kimiK3?.limit?.output, 131072);
    assert.equal(glm52?.limit?.context, 1000000);
    assert.equal(glm52?.limit?.output, 131072);
    assert.equal(glm52?.extra_capabilities?.reasoning?.effort_options?.includes('max'), true);
    assert.equal(miniMaxM3?.limit?.context, 1000000);
    assert.equal(miniMaxM3?.limit?.output, 128000);
    assert.equal(miniMaxM27?.extra_capabilities?.reasoning?.interleaved, true);
  });
});

test('keeps deterministic ordering for identical seed data', async () => {
  await withoutApiKeys(async () => {
    const first = await synthesizeCustomProvider();
    const second = await synthesizeCustomProvider();

    assert.deepEqual(
      first.models.map(model => model.id),
      second.models.map(model => model.id),
    );
  });
});

test('keeps successful sources when one adapter fails', async () => {
  const catalog: CustomProviderSeedCatalog = {
    updatedAt: '2026-04-23T00:00:00.000Z',
    maxModels: 30,
    provider: {
      id: 'custom-provider',
      name: 'custom provider',
    },
    sources: [],
  };

  const successfulModel = createModelInfo(
    'example-model',
    'Example Model',
    8192,
    4096,
    false,
    true,
    false,
    ModelType.Chat,
  );

  const failingAdapter: ModelsAdapter = {
    sourceId: () => 'openai',
    displayName: () => 'OpenAI',
    fetchModels: async () => {
      throw new Error('boom');
    },
  };

  const successfulAdapter: ModelsAdapter = {
    sourceId: () => 'gemini',
    displayName: () => 'Gemini',
    fetchModels: async (): Promise<SourceDiscoveryResult> => ({
      source: {
        id: 'gemini',
        displayName: 'Gemini',
        models: [],
      },
      models: [successfulModel],
      summary: {
        sourceId: 'gemini',
        displayName: 'Gemini',
        selected: 1,
        apiModels: 0,
        seedModels: 1,
        status: 'seed',
      },
    }),
  };

  const result = await synthesizeCustomProvider({
    catalog,
    adapters: [failingAdapter, successfulAdapter],
  });

  assert.deepEqual(result.models.map(model => model.id), ['example-model']);
  assert.equal(result.summaries[0].status, 'api-error');
  assert.equal(result.summaries[1].selected, 1);
});
