import assert from 'node:assert/strict';
import test from 'node:test';
import { LazuModel, mapLazuModel } from './LazuProvider';
import { ModelType } from '../models/model-info';

test('maps a chat model from the public pricing catalog', () => {
  const model: LazuModel = {
    model_name: 'claude-sonnet-5-5',
    context_length: 1000000,
    max_output_tokens: 128000,
    capabilities: {
      supports_function_calling: true,
      supports_vision: true,
      supports_reasoning: true,
      supports_response_schema: true,
      supports_audio_input: false,
      supports_audio_output: false,
    },
    supported_endpoint_types: ['anthropic', 'openai'],
  };

  const mapped = mapLazuModel(model);
  assert.ok(mapped);
  assert.equal(mapped.id, 'claude-sonnet-5-5');
  assert.equal(mapped.type, ModelType.Chat);
  assert.equal(mapped.contextLength, 1000000);
  assert.equal(mapped.maxTokens, 128000);
  assert.equal(mapped.vision, true);
  assert.equal(mapped.functionCall, true);
  assert.equal(mapped.reasoning, true);
  assert.equal(mapped.structuredOutput, true);
  assert.deepEqual(mapped.modalities, { input: ['text', 'image'], output: ['text'] });
});

test('keeps text-only modalities for models without vision or audio', () => {
  const mapped = mapLazuModel({
    model_name: 'deepseek-v4-pro',
    context_length: 1000000,
    max_output_tokens: 384000,
    capabilities: {
      supports_function_calling: true,
      supports_vision: false,
      supports_reasoning: true,
      supports_response_schema: true,
    },
    supported_endpoint_types: ['openai', 'openai-response'],
  });

  assert.ok(mapped);
  assert.equal(mapped.vision, false);
  assert.deepEqual(mapped.modalities, { input: ['text'], output: ['text'] });
});

test('caps maxTokens at contextLength', () => {
  const mapped = mapLazuModel({
    model_name: 'example-chat',
    context_length: 128000,
    max_output_tokens: 256000,
    capabilities: {
      supports_function_calling: true,
      supports_vision: false,
      supports_reasoning: false,
    },
    supported_endpoint_types: ['openai'],
  });

  assert.ok(mapped);
  assert.equal(mapped.contextLength, 128000);
  assert.equal(mapped.maxTokens, 128000);
});

test('skips embedding, image-generation, and decisions models', () => {
  assert.equal(
    mapLazuModel({
      model_name: 'text-embedding-3-large',
      context_length: 8191,
      max_output_tokens: 3072,
      supported_endpoint_types: ['embeddings'],
    }),
    null,
  );

  assert.equal(
    mapLazuModel({
      model_name: 'gpt-image-2.5-flare',
      context_length: null,
      max_output_tokens: null,
      supported_endpoint_types: ['image-generation', 'openai', 'openai-response'],
    }),
    null,
  );

  assert.equal(
    mapLazuModel({
      model_name: 'gpt-6-luna-decisions',
      context_length: 8192,
      max_output_tokens: null,
      supported_endpoint_types: ['decisions'],
    }),
    null,
  );
});
