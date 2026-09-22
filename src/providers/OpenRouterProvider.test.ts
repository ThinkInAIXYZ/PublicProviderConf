import assert from 'node:assert/strict';
import test from 'node:test';
import { applyOpenAIReasoningTuning, determineModelType, mapOpenRouterModel } from './OpenRouterProvider';
import type { ToggleConfig } from '../utils/toggles';
import { ModelType } from '../models/model-info';
import { createModelsDevModel } from '../models/models-dev';
import { applyReasoningPortraitToModel } from '../models/extra-capabilities';

test('classifies OpenRouter models by output modality', () => {
  assert.equal(
    determineModelType(
      {
        id: 'vendor/image-reader',
        architecture: {
          modality: 'text+image->text',
          input_modalities: ['text', 'image'],
          output_modalities: ['text'],
        },
      },
      'vendor/image-reader',
    ),
    ModelType.Chat,
  );

  assert.equal(
    determineModelType(
      {
        id: 'vendor/image-generator',
        architecture: {
          modality: 'text+image->text+image',
          input_modalities: ['text', 'image'],
          output_modalities: ['text', 'image'],
        },
      },
      'vendor/image-generator',
    ),
    ModelType.ImageGeneration,
  );
});

test('uses the output side of the legacy modality field', () => {
  assert.equal(
    determineModelType(
      {
        id: 'vendor/vision-model',
        architecture: { modality: 'text+image->text' },
      },
      'vendor/vision-model',
    ),
    ModelType.Chat,
  );
});

test('keeps reasoning.supported as a compatibility signal even without provider controls', () => {
  const gpt5Config: ToggleConfig = { supported: false };
  applyOpenAIReasoningTuning(gpt5Config, 'openai/gpt-5.4', false);
  assert.deepEqual(gpt5Config, {
    supported: true,
  });

  const oSeriesConfig: ToggleConfig = { supported: false };
  applyOpenAIReasoningTuning(oSeriesConfig, 'openai/o3-mini-high', false);
  assert.deepEqual(oSeriesConfig, {
    supported: true,
  });
});

test('adds effort only when the provider explicitly supports reasoning controls', () => {
  const gpt5Config: ToggleConfig = { supported: true };
  applyOpenAIReasoningTuning(gpt5Config, 'openai/gpt-5.4', true);
  assert.deepEqual(gpt5Config, {
    supported: true,
    effort: 'none',
    verbosity: 'medium',
  });

  const gpt52ProConfig: ToggleConfig = { supported: true };
  applyOpenAIReasoningTuning(gpt52ProConfig, 'openai/gpt-5.2-pro', true);
  assert.deepEqual(gpt52ProConfig, {
    supported: true,
    effort: 'high',
    verbosity: 'medium',
  });

  const oSeriesConfig: ToggleConfig = { supported: true };
  applyOpenAIReasoningTuning(oSeriesConfig, 'openai/o3-mini-high', true);
  assert.deepEqual(oSeriesConfig, {
    supported: true,
    effort: 'medium',
  });
});

test('leaves unknown models unchanged', () => {
  const config: ToggleConfig = { supported: false };
  applyOpenAIReasoningTuning(config, 'vendor/not-openai', false);
  assert.deepEqual(config, { supported: false });
});

test('does not inject effort for GPT-5 chat aliases without an OpenAI effort ladder', () => {
  const config: ToggleConfig = { supported: true };
  applyOpenAIReasoningTuning(config, 'openai/gpt-5.2-chat', true);
  assert.deepEqual(config, {
    supported: true,
  });
});

test('preserves the OpenRouter GLM effort contract through public catalog serialization', () => {
  for (const id of ['z-ai/glm-5.3', 'z-ai/glm-5.3-flash', 'z-ai/glm-5.3-flash:batch']) {
    const mapped = mapOpenRouterModel({
      id,
      supported_parameters: ['reasoning', 'reasoning_effort'],
      reasoning: {
        supported_efforts: ['max', 'high', 'low'],
        default_effort: 'max',
        default_enabled: true,
        mandatory: true,
      },
    });
    assert.ok(mapped);
    const output = createModelsDevModel(mapped);
    applyReasoningPortraitToModel(output);
    assert.deepEqual(output.reasoning_options, [{ type: 'effort', values: ['low', 'high', 'max'] }]);
    assert.deepEqual(output.extra_capabilities?.reasoning?.effort_options, ['low', 'high', 'max']);
    assert.equal(output.extra_capabilities?.reasoning?.effort, 'max');
    assert.equal(output.extra_capabilities?.reasoning?.mode, 'effort');
    assert.equal(output.extra_capabilities?.reasoning?.default_enabled, true);
  }
});

test('distinguishes unrestricted, omitted, and invalid provider effort metadata', () => {
  const unrestricted = mapOpenRouterModel({
    id: 'vendor/unrestricted', supported_parameters: ['reasoning'],
    reasoning: { supported_efforts: null, mandatory: true, default_effort: 'none' },
  });
  assert.deepEqual(unrestricted?.reasoningOptions, [{ type: 'effort', values: ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'] }]);
  assert.equal(unrestricted?.extraCapabilities?.reasoning?.effort, undefined);

  for (const supported_efforts of [undefined, ['invalid']]) {
    const mapped = mapOpenRouterModel({
      id: 'vendor/toggle', supported_parameters: ['reasoning'],
      reasoning: { supported_efforts, mandatory: false, default_enabled: false },
    });
    assert.deepEqual(mapped?.reasoningOptions, [{ type: 'toggle' }]);
    assert.deepEqual(mapped?.extraCapabilities?.reasoning?.effort_options, []);
    assert.equal((mapped?.reasoning as ToggleConfig).default, false);
  }

  const unsupported = mapOpenRouterModel({
    id: 'vendor/unsupported', supported_parameters: [],
    reasoning: { supported_efforts: ['high'], default_effort: 'high' },
  });
  assert.equal(unsupported?.reasoningOptions, undefined);
});
