import assert from 'node:assert/strict';
import test from 'node:test';
import { applyOpenAIReasoningTuning } from './OpenRouterProvider';
import type { ToggleConfig } from '../utils/toggles';

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
    effort: 'medium',
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
