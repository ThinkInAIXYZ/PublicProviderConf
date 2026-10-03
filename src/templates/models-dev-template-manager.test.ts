import assert from 'node:assert/strict';
import test from 'node:test';
import { applyReasoningPortraits, type ModelsDevProvider } from '../models/models-dev';
import {
  mergeProviderWithTemplate,
  ModelsDevTemplateManager,
} from './models-dev-template-manager';

test('keeps official Qwen effort and exclusive budget controls through template merging', async () => {
  const templates = await new ModelsDevTemplateManager().loadAllTemplates();
  for (const providerId of ['alibaba', 'alibaba-cn']) {
    const untouched = { id: 'qwen3.7-flash', name: 'Qwen3.7 Flash', reasoning: true };
    const provider = mergeProviderWithTemplate({
      id: providerId,
      name: providerId,
      models: [
        { id: 'qwen3.8-max', name: 'Qwen3.8 Max', cost: { input: 2, output: 6 } },
        untouched,
      ],
    }, templates.get(providerId));
    applyReasoningPortraits({ providers: { [providerId]: provider } });

    for (const id of ['qwen3.8-max', 'qwen3.8-flash', 'qwen3.8-omni-flash']) {
      const model = provider.models.find(model => model.id === id);
      assert.ok(model, `${providerId}/${id}`);
      const portrait = model.extra_capabilities?.reasoning;
      assert.equal(portrait?.mode, 'effort');
      assert.equal(portrait?.effort, 'xhigh');
      assert.deepEqual(portrait?.effort_options, ['none', 'low', 'medium', 'xhigh']);
      assert.equal(portrait?.budget?.default, undefined);
      assert.equal(portrait?.interleaved, true);
      assert.deepEqual(portrait?.continuation, ['thinking_blocks']);
      if (id !== 'qwen3.8-omni-flash') {
        assert.deepEqual(portrait?.budget, { min: 0, max: 262144, unit: 'tokens' });
        assert.deepEqual(
          model.reasoning_options?.find(option => option.type === 'effort')?.exclusive_with,
          ['budget_tokens'],
        );
      } else {
        assert.equal(portrait?.budget, undefined);
      }
    }
    assert.deepEqual(provider.models.find(model => model.id === 'qwen3.8-max')?.cost, { input: 2, output: 6 });
    const legacy = provider.models.find(model => model.id === untouched.id);
    assert.ok(legacy);
    assert.deepEqual(legacy.reasoning, { supported: true, default: true });
    assert.equal(legacy.extra_capabilities, undefined);
    assert.equal(legacy.reasoning_options, undefined);
  }
});

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

test('patches DeepSeek with the V4 Flash vision model', async () => {
  const templates = await new ModelsDevTemplateManager().loadAllTemplates();
  const model = templates.get('deepseek')?.models.find(
    item => item.id === 'deepseek-v4-flash-vision-exp',
  );

  assert.equal(model?.vision, true);
  assert.equal(model?.attachment, true);
  assert.deepEqual(model?.modalities?.input, ['text', 'image']);
  assert.deepEqual(model?.limit, { context: 1000000, output: 384000 });
});
