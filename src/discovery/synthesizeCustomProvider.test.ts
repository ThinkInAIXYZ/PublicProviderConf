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
    assert.equal(result.models.length, 37);
    assert.deepEqual(
      new Set(result.models.map(model => model.id)),
      new Set(result.catalog.sources.flatMap(source => source.models.map(model => model.id))),
    );
    assert.deepEqual(
      result.summaries.map(summary => [summary.displayName, summary.selected]),
      [
        ['OpenAI', 5],
        ['Anthropic', 4],
        ['Gemini', 5],
        ['Kimi', 5],
        ['DeepSeek', 3],
        ['Zhipu', 3],
        ['MiniMax', 3],
        ['StepFun', 3],
        ['Qwen', 6],
      ],
    );
    assert.equal(
      result.summaries.every(summary => summary.status === 'seed'),
      true,
    );
    const selectedIds = new Set(result.models.map(model => model.id));
    for (const id of ['gpt-5.5', 'kimi-k2.5', 'gemini-3.5-flash', 'gemini-3.5-flash-lite']) {
      assert.ok(selectedIds.has(id), `Missing compatibility model: ${id}`);
    }
    for (const id of [
      'gpt-5.4', 'gpt-5.4-pro', 'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.3-codex',
      'gemini-2.5-pro', 'kimi-k2-thinking', 'glm-5.1', 'glm-5', 'glm-5v-turbo', 'glm-4.7',
      'MiniMax-M2.5', 'MiniMax-M2.5-highspeed',
    ]) {
      assert.equal(selectedIds.has(id), false, `Retired selection is still present: ${id}`);
    }
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
    const model = provider.models.find(item => item.id === 'gpt-5.5');
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
      ['low', 'high', 'max'],
    );
    assert.equal(seededKimiK25?.extraCapabilities?.reasoning?.default_enabled, true);
    assert.equal(seededKimiK25?.metadata?.lifecycle, 'legacy');
    assert.equal(seededKimiK25?.metadata?.apiStatus, 'sunset-scheduled');
    assert.equal(seededKimiK25?.metadata?.officialSunsetDate, '2026-08-31');

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
    assert.equal(deepSeekV4?.cost?.input, 1.32);
    assert.equal(deepSeekV4?.cost?.output, 3.96);
    assert.equal(deepSeekV4?.cost?.reasoning, 3.96);
    assert.equal(deepSeekV4?.cost?.cache_read, 0.044);
    assert.equal(deepSeekV4?.metadata?.pricingBasis, 'peak');
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
      { type: 'effort', values: ['low', 'high', 'max'] },
    ]);
    assert.deepEqual(deepSeekV4Flash?.extra_capabilities?.reasoning?.effort_options, [
      'low',
      'high',
      'max',
    ]);
    assert.deepEqual(deepSeekV4?.extra_capabilities?.reasoning?.effort_options, [
      'low',
      'high',
      'max',
    ]);
    assert.equal(deepSeekChat, undefined);
    assert.ok(claudeOpus5);
    assert.ok(gemini36Flash);
    assert.equal(kimiK3?.limit?.context, 1048576);
    assert.equal(kimiK3?.limit?.output, 1048576);
    assert.equal(kimiK3?.extra_capabilities?.reasoning?.effort, 'max');
    assert.deepEqual(kimiK3?.reasoning_options, [
      { type: 'effort', values: ['low', 'high', 'max'] },
    ]);
    assert.equal(glm52?.limit?.context, 1000000);
    assert.equal(glm52?.limit?.output, 131072);
    assert.equal(glm52?.extra_capabilities?.reasoning?.effort_options?.includes('max'), true);
    assert.equal(miniMaxM3?.limit?.context, 1000000);
    assert.equal(miniMaxM3?.limit?.output, 128000);
    assert.equal(miniMaxM27?.extra_capabilities?.reasoning?.interleaved, true);
  });
});

test('preserves model-specific controls and modalities through normalization and portraits', async () => {
  await withoutApiKeys(async () => {
    const result = await synthesizeCustomProvider();
    const provider = createModelsDevProvider(createProviderInfo(
      'custom-provider', 'custom provider', result.models,
    ));
    applyReasoningPortraits({ providers: { [provider.id]: provider } });
    const getModel = (id: string) => {
      const model = provider.models.find(item => item.id === id);
      assert.ok(model, `Missing selected model: ${id}`);
      return model;
    };

    const gemini37 = getModel('gemini-3.7-flash');
    assert.equal(gemini37.extra_capabilities?.reasoning?.level, 'medium');
    assert.deepEqual(gemini37.extra_capabilities?.reasoning?.level_options, ['low', 'medium', 'high']);
    assert.deepEqual(gemini37.reasoning_options, [{ type: 'effort', values: ['low', 'medium', 'high'] }]);
    assert.ok(getModel('gemini-3.6-flash').extra_capabilities?.reasoning?.level_options?.includes('minimal'));

    const kimiCode = getModel('kimi-k2.7-code');
    const kimiHighspeed = getModel('kimi-k2.7-code-highspeed');
    for (const model of [kimiCode, kimiHighspeed]) {
      assert.equal(model.temperature, false);
      assert.equal(model.extra_capabilities?.reasoning?.mode, 'fixed');
      assert.equal(model.reasoning_options?.some(option => option.type === 'toggle') ?? false, false);
      assert.deepEqual(model.modalities?.input, ['text', 'image', 'video']);
    }
    assert.equal(kimiCode.cost?.input, 0.95);
    assert.equal(kimiHighspeed.cost?.input, 1.9);
    assert.equal(kimiCode.cost?.output, 4);
    assert.equal(kimiHighspeed.cost?.output, 8);
    assert.equal(getModel('kimi-k2.6').reasoning_options?.[0].type, 'toggle');

    for (const id of ['glm-5.3', 'glm-5.3-flash']) {
      const model = getModel(id);
      assert.equal(model.limit?.context, 1000000);
      assert.equal(model.limit?.output, 131072);
      assert.equal(model.extra_capabilities?.reasoning?.effort, 'max');
      assert.deepEqual(model.reasoning_options, [{ type: 'effort', values: ['low', 'high', 'max'] }]);
    }
    assert.equal(getModel('glm-5.3').vision, false);
    assert.equal(getModel('glm-5.3-flash').vision, true);
    assert.equal(getModel('glm-5.2').reasoning_options?.[0].type, 'toggle');

    const step37 = getModel('step-3.7-flash');
    const step35 = getModel('step-3.5-flash');
    const step35March = getModel('step-3.5-flash-2603');
    assert.deepEqual(step37.modalities?.input, ['text', 'image', 'video']);
    assert.equal(step37.extra_capabilities?.reasoning?.effort, 'medium');
    assert.deepEqual(step37.reasoning_options, [{ type: 'effort', values: ['low', 'medium', 'high'] }]);
    assert.deepEqual(step35March.reasoning_options, [{ type: 'effort', values: ['low', 'high'] }]);
    assert.equal(step35.reasoning_options, undefined);
    assert.equal(step35.vision, false);

    for (const id of ['qwen3.8-max', 'qwen3.7-plus', 'qwen3.8-flash']) {
      const model = getModel(id);
      assert.equal(model.limit?.context, 1000000);
      assert.equal(model.limit?.output, 131072);
      assert.equal(model.vision, true);
      assert.equal(model.extra_capabilities?.reasoning?.mode, 'budget');
      assert.equal(model.extra_capabilities?.reasoning?.budget?.max, 262144);
      assert.deepEqual(model.reasoning_options?.map(option => option.type), ['toggle', 'budget']);
    }
    for (const id of ['qwen3-coder-plus', 'qwen3-coder-flash', 'qwen3-coder-next']) {
      const model = getModel(id);
      assert.equal(model.vision, false);
      assert.deepEqual(model.reasoning, { supported: false });
      assert.equal(model.extra_capabilities?.reasoning?.supported, false);
      assert.equal(model.reasoning_options, undefined);
      assert.equal(model.tool_call, true);
      assert.equal(model.limit?.output, 65536);
    }
    assert.equal(getModel('qwen3-coder-next').limit?.context, 262144);
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
