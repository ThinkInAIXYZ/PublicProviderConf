import assert from 'node:assert/strict';
import test from 'node:test';
import { CheaperInferenceModel, mapCheaperInferenceModel } from './CheaperInferenceProvider';
import { ModelType } from '../models/model-info';

const CHAT_ENDPOINTS = ['/v1/chat/completions', '/v1/completions', '/v1/responses', '/v1/messages'];

test('maps a chat model from the public model list', () => {
  const model: CheaperInferenceModel = {
    id: 'gpt-5.4-mini',
    context_length: 400000,
    max_output_tokens: 128000,
    model_type: 'text',
    supported_endpoints: CHAT_ENDPOINTS,
    supports_vision: true,
    supports_reasoning: true,
    features: ['image-input', 'file-input', 'reasoning', 'tool-use', 'structured-output'],
  };

  const mapped = mapCheaperInferenceModel(model);
  assert.ok(mapped);
  assert.equal(mapped.id, 'gpt-5.4-mini');
  assert.equal(mapped.type, ModelType.Chat);
  assert.equal(mapped.contextLength, 400000);
  assert.equal(mapped.maxTokens, 128000);
  assert.equal(mapped.vision, true);
  assert.equal(mapped.functionCall, true);
  assert.equal(mapped.reasoning, true);
  assert.equal(mapped.structuredOutput, true);
  assert.deepEqual(mapped.modalities, { input: ['text', 'image'], output: ['text'] });
});

test('keeps text-only input for models without vision', () => {
  const mapped = mapCheaperInferenceModel({
    id: 'deepseek-v4-flash',
    context_length: 1000000,
    max_output_tokens: 384000,
    model_type: 'text',
    supported_endpoints: CHAT_ENDPOINTS,
    supports_vision: false,
    supports_reasoning: true,
    features: ['reasoning', 'tool-use', 'structured-output'],
  });

  assert.ok(mapped);
  assert.equal(mapped.vision, false);
  assert.deepEqual(mapped.modalities, { input: ['text'], output: ['text'] });
});

test('caps the output limit at the context length', () => {
  const mapped = mapCheaperInferenceModel({
    id: 'minimax-m3',
    context_length: 200000,
    max_output_tokens: 512000,
    model_type: 'text',
    supported_endpoints: CHAT_ENDPOINTS,
    supports_vision: true,
    supports_reasoning: false,
    features: ['image-input', 'video-input', 'tool-use'],
  });

  assert.ok(mapped);
  assert.equal(mapped.contextLength, 200000);
  assert.equal(mapped.maxTokens, 200000);
  assert.deepEqual(mapped.modalities, { input: ['text', 'image', 'video'], output: ['text'] });
});

test('skips embedding and Responses-only models', () => {
  assert.equal(
    mapCheaperInferenceModel({
      id: 'text-embedding-3-small',
      context_length: null,
      max_output_tokens: null,
      model_type: 'embedding',
      supported_endpoints: ['/v1/embeddings'],
    }),
    null,
  );

  assert.equal(
    mapCheaperInferenceModel({
      id: 'gpt-5.4-pro',
      context_length: 1000000,
      max_output_tokens: 128000,
      model_type: 'text',
      supported_endpoints: ['/v1/responses'],
    }),
    null,
  );
});
