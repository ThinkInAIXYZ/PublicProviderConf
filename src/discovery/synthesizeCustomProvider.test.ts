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

    assert.equal(result.models.length >= 20, true);
    assert.equal(result.models.length <= 30, true);
    assert.deepEqual(
      result.summaries.map(summary => [summary.displayName, summary.selected]),
      [
        ['OpenAI', 5],
        ['Anthropic', 3],
        ['Gemini', 5],
        ['Kimi', 4],
        ['DeepSeek', 2],
        ['Zhipu', 4],
        ['MiniMax', 4],
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
    const providerInfo = createProviderInfo(
      'custom-provider',
      'custom provider',
      result.models,
      { lastUpdated: new Date(result.catalog.updatedAt) },
    );

    JsonValidator.validateProviderInfo(providerInfo);

    const provider = createModelsDevProvider(providerInfo);
    const model = provider.models.find(item => item.id === 'gpt-5.4');
    const providerData = { providers: { [provider.id]: provider } };

    applyReasoningPortraits(providerData);
    const miniMaxM27 = provider.models.find(item => item.id === 'MiniMax-M2.7');

    assert.equal(provider.id, 'custom-provider');
    assert.equal(provider.name, 'custom provider');
    assert.equal(model?.type, 'chat');
    assert.equal(model?.tool_call, true);
    assert.equal(model?.structured_output, true);
    assert.equal(model?.vision, true);
    assert.equal(model?.limit?.context, 1050000);
    assert.equal(model?.limit?.output, 128000);
    assert.equal(model?.metadata?.sourceProvider, 'openai');
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
