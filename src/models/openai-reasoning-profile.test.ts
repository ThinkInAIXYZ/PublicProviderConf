import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getOpenAIReasoningProfile,
  type ReasoningEffort,
  type ReasoningVerbosity,
} from './openai-reasoning-profile';

function assertProfile(
  modelId: string,
  expected: {
    defaultEnabled: boolean;
    mode: 'effort' | 'fixed';
    effort: ReasoningEffort;
    effortOptions?: ReasoningEffort[];
    verbosity?: ReasoningVerbosity;
    verbosityOptions?: ReasoningVerbosity[];
  },
): void {
  assert.deepEqual(getOpenAIReasoningProfile(modelId), {
    defaultEnabled: expected.defaultEnabled,
    mode: expected.mode,
    effort: expected.effort,
    effortOptions: expected.effortOptions,
    verbosity: expected.verbosity,
    verbosityOptions: expected.verbosityOptions,
  });
}

test('matches GPT-5 family effort ladders', () => {
  assertProfile('openai/gpt-5', {
    defaultEnabled: true,
    mode: 'effort',
    effort: 'medium',
    effortOptions: ['minimal', 'low', 'medium', 'high'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertProfile('openai/gpt-5-mini', {
    defaultEnabled: true,
    mode: 'effort',
    effort: 'medium',
    effortOptions: ['minimal', 'low', 'medium', 'high'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertProfile('openai/gpt-5-nano', {
    defaultEnabled: true,
    mode: 'effort',
    effort: 'medium',
    effortOptions: ['minimal', 'low', 'medium', 'high'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertProfile('openai/gpt-5-codex', {
    defaultEnabled: true,
    mode: 'effort',
    effort: 'medium',
    effortOptions: ['minimal', 'low', 'medium', 'high'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertProfile('openai/gpt-5-pro', {
    defaultEnabled: true,
    mode: 'fixed',
    effort: 'high',
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertProfile('openai/gpt-5.1', {
    defaultEnabled: false,
    mode: 'effort',
    effort: 'none',
    effortOptions: ['none', 'low', 'medium', 'high'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertProfile('openai/gpt-5.1-codex-max', {
    defaultEnabled: false,
    mode: 'effort',
    effort: 'none',
    effortOptions: ['none', 'low', 'medium', 'high'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertProfile('openai/gpt-5.2', {
    defaultEnabled: false,
    mode: 'effort',
    effort: 'none',
    effortOptions: ['none', 'low', 'medium', 'high', 'xhigh'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertProfile('openai/gpt-5.2-pro', {
    defaultEnabled: true,
    mode: 'effort',
    effort: 'high',
    effortOptions: ['medium', 'high', 'xhigh'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertProfile('openai/gpt-5.2-codex', {
    defaultEnabled: true,
    mode: 'effort',
    effort: 'medium',
    effortOptions: ['low', 'medium', 'high', 'xhigh'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertProfile('openai/gpt-5.3-codex', {
    defaultEnabled: true,
    mode: 'effort',
    effort: 'medium',
    effortOptions: ['low', 'medium', 'high', 'xhigh'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertProfile('openai/gpt-5.3-codex-spark', {
    defaultEnabled: true,
    mode: 'effort',
    effort: 'medium',
    effortOptions: ['low', 'medium', 'high', 'xhigh'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertProfile('openai/gpt-5.4', {
    defaultEnabled: false,
    mode: 'effort',
    effort: 'none',
    effortOptions: ['none', 'low', 'medium', 'high', 'xhigh'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertProfile('openai/gpt-5.4-mini', {
    defaultEnabled: false,
    mode: 'effort',
    effort: 'none',
    effortOptions: ['none', 'low', 'medium', 'high', 'xhigh'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertProfile('openai/gpt-5.4-nano', {
    defaultEnabled: false,
    mode: 'effort',
    effort: 'none',
    effortOptions: ['none', 'low', 'medium', 'high', 'xhigh'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertProfile('openai/gpt-5.4-pro', {
    defaultEnabled: true,
    mode: 'effort',
    effort: 'high',
    effortOptions: ['medium', 'high', 'xhigh'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });
});

test('matches pre-gpt-5.1 o-series effort ladders from the Responses API family rule', () => {
  const expected = {
    defaultEnabled: true,
    mode: 'effort' as const,
    effort: 'medium' as const,
    effortOptions: ['low', 'medium', 'high'] as ReasoningEffort[],
  };

  assertProfile('openai/o1', expected);
  assertProfile('openai/o1-preview', expected);
  assertProfile('openai/o1-mini', expected);
  assertProfile('openai/o1-pro', expected);
  assertProfile('openai/o3', expected);
  assertProfile('openai/o3-mini', expected);
  assertProfile('openai/o3-mini-high', expected);
  assertProfile('openai/o3-pro', expected);
  assertProfile('openai/o3-deep-research', expected);
  assertProfile('openai/o4-mini', expected);
  assertProfile('openai/o4-mini-high', expected);
  assertProfile('openai/o4-mini-deep-research', expected);
});

test('does not add xhigh to unsupported reasoning families', () => {
  assert.equal(
    getOpenAIReasoningProfile('openai/gpt-5.1')?.effortOptions?.includes('xhigh'),
    false,
  );
  assert.equal(
    getOpenAIReasoningProfile('openai/gpt-5.1-codex')?.effortOptions?.includes('xhigh'),
    false,
  );
  assert.equal(
    getOpenAIReasoningProfile('openai/o3-mini-high')?.effortOptions?.includes('xhigh'),
    false,
  );
  assert.equal(
    getOpenAIReasoningProfile('openai/o4-mini-deep-research')?.effortOptions?.includes('xhigh'),
    false,
  );
  assert.equal(
    getOpenAIReasoningProfile('openai/o1-pro')?.effortOptions?.includes('none'),
    false,
  );
  assert.equal(
    getOpenAIReasoningProfile('openai/gpt-5.3-chat')?.effortOptions?.includes('xhigh'),
    undefined,
  );
  assert.equal(
    getOpenAIReasoningProfile('openai/gpt-5-pro')?.effortOptions?.includes('xhigh'),
    undefined,
  );
});

test('does not infer effort ladders for GPT-5 chat aliases without official effort docs', () => {
  assert.equal(getOpenAIReasoningProfile('openai/gpt-5.3-chat'), undefined);
  assert.equal(getOpenAIReasoningProfile('openai/gpt-5.1-chat'), undefined);
  assert.equal(getOpenAIReasoningProfile('openai/gpt-5.1-chat-latest'), undefined);
  assert.equal(getOpenAIReasoningProfile('openai/gpt-5.2-chat'), undefined);
  assert.equal(getOpenAIReasoningProfile('openai/gpt-5.2-chat-latest'), undefined);
});
