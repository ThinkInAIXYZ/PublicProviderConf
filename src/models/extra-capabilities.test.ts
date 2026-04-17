import assert from 'node:assert/strict';
import test from 'node:test';
import { applyReasoningPortraitToModel } from './extra-capabilities';
import {
  applyReasoningPortraits,
  buildAiHubMixReasoningHintMap,
  type ModelsDevApiResponse,
  type ModelsDevProvider,
} from './models-dev';
import type { ReasoningEffort, ReasoningVerbosity } from './openai-reasoning-profile';

function assertInterleavedThinkingShape(model: {
  [key: string]: unknown;
  extra_capabilities?: {
    reasoning?: {
      supported?: boolean;
      interleaved?: boolean;
      summaries?: boolean;
      visibility?: string;
      continuation?: string[];
    };
  };
}): void {
  assert.equal(model.extra_capabilities?.reasoning?.supported, true);
  assert.equal(model.extra_capabilities?.reasoning?.interleaved, true);
  assert.equal(model.extra_capabilities?.reasoning?.summaries, true);
  assert.equal(model.extra_capabilities?.reasoning?.visibility, 'summary');
  assert.deepEqual(model.extra_capabilities?.reasoning?.continuation, ['thinking_blocks']);
}

function assertEffortPortrait(
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
  const model: {
    id: string;
    extra_capabilities?: {
      reasoning?: Record<string, unknown>;
    };
  } = {
    id: modelId,
  };

  applyReasoningPortraitToModel(model);

  const reasoning = model.extra_capabilities?.reasoning;

  assert.deepEqual({
    supported: reasoning?.supported,
    default_enabled: reasoning?.default_enabled,
    mode: reasoning?.mode,
    effort: reasoning?.effort,
    effort_options: reasoning?.effort_options,
    verbosity: reasoning?.verbosity,
    verbosity_options: reasoning?.verbosity_options,
    visibility: reasoning?.visibility,
  }, {
    supported: true,
    default_enabled: expected.defaultEnabled,
    mode: expected.mode,
    effort: expected.effort,
    effort_options: expected.effortOptions,
    verbosity: expected.verbosity,
    verbosity_options: expected.verbosityOptions,
    visibility: 'hidden',
  });
}

function assertReasoningPortrait(
  modelId: string,
  expected: {
    defaultEnabled: boolean;
    mode: string;
    budget?: Record<string, unknown>;
    effort?: string;
    effortOptions?: string[];
    interleaved?: boolean;
    summaries?: boolean;
    visibility?: string;
    continuation?: string[];
    notes?: string[];
  },
): void {
  const model: {
    id: string;
    extra_capabilities?: {
      reasoning?: Record<string, unknown>;
    };
  } = {
    id: modelId,
  };

  applyReasoningPortraitToModel(model);

  const reasoning = model.extra_capabilities?.reasoning;

  assert.deepEqual({
    supported: reasoning?.supported,
    default_enabled: reasoning?.default_enabled,
    mode: reasoning?.mode,
    budget: reasoning?.budget,
    effort: reasoning?.effort,
    effort_options: reasoning?.effort_options,
    interleaved: reasoning?.interleaved,
    summaries: reasoning?.summaries,
    visibility: reasoning?.visibility,
    continuation: reasoning?.continuation,
    notes: reasoning?.notes,
  }, {
    supported: true,
    default_enabled: expected.defaultEnabled,
    mode: expected.mode,
    budget: expected.budget,
    effort: expected.effort,
    effort_options: expected.effortOptions,
    interleaved: expected.interleaved,
    summaries: expected.summaries,
    visibility: expected.visibility,
    continuation: expected.continuation,
    notes: expected.notes,
  });
}

function assertNoXHigh(modelId: string): void {
  const model: {
    id: string;
    extra_capabilities?: {
      reasoning?: {
        effort_options?: string[];
      };
    };
  } = {
    id: modelId,
  };

  applyReasoningPortraitToModel(model);

  assert.equal(
    Boolean(model.extra_capabilities?.reasoning?.effort_options?.includes('xhigh')),
    false,
  );
}

function assertNoReasoningPortrait(modelId: string): void {
  const model: {
    id: string;
    extra_capabilities?: {
      reasoning?: Record<string, unknown>;
    };
  } = {
    id: modelId,
  };

  applyReasoningPortraitToModel(model);

  assert.equal(model.extra_capabilities?.reasoning, undefined);
}

test('migrates legacy interleaved reasoning_content into extra capabilities', () => {
  const model = {
    id: 'vendor/example-reasoner',
    interleaved: {
      field: 'reasoning_content',
    },
  };

  applyReasoningPortraitToModel(model);

  assertInterleavedThinkingShape(model);
});

test('matches interleaved reasoning portraits for canonical and slash-prefixed ids', () => {
  const models = [
    { id: 'deepseek-reasoner' },
    { id: 'deepseek/deepseek-r1-0528' },
    { id: 'moonshotai/kimi-k2.5' },
    { id: 'z-ai/glm-4.7' },
    { id: 'glm-5' },
  ];

  for (const model of models) {
    applyReasoningPortraitToModel(model);
    assertInterleavedThinkingShape(model);
  }
});

test('normalizes supported to true when existing extra reasoning keeps interleaved true', () => {
  const model = {
    id: 'deepseek-reasoner',
    extra_capabilities: {
      reasoning: {
        supported: false,
        interleaved: true,
      },
    },
  };

  applyReasoningPortraitToModel(model);

  assert.equal(model.extra_capabilities.reasoning.supported, true);
  assert.equal(model.extra_capabilities.reasoning.interleaved, true);
});

test('aihubmix reasoning hints promote reasoning support even without a portrait', () => {
  const aihubmix: ModelsDevProvider = {
    id: 'aihubmix',
    name: 'AIHubMix',
    models: [
      {
        id: 'vendor/super-thinker',
        name: 'Super Thinker',
        reasoning: {
          supported: false,
        },
        metadata: {
          features: ['thinking', 'function_calling'],
        },
      },
    ],
  };

  const hintMap = buildAiHubMixReasoningHintMap(aihubmix);
  const data: ModelsDevApiResponse = {
    providers: {
      sample: {
        id: 'sample',
        name: 'Sample',
        models: [
          {
            id: 'vendor/super-thinker',
            name: 'Super Thinker',
            reasoning: {
              supported: false,
            },
          },
        ],
      },
    },
  };

  applyReasoningPortraits(data, hintMap);

  const providers = data.providers as Record<string, ModelsDevProvider>;
  const model = providers.sample.models[0];
  assert.equal(model.extra_capabilities?.reasoning?.supported, true);
  assert.equal(typeof model.reasoning === 'object' && model.reasoning?.supported, true);
});

test('portrait normalization syncs legacy reasoning when extra reasoning becomes supported', () => {
  const data: ModelsDevApiResponse = {
    providers: {
      sample: {
        id: 'sample',
        name: 'Sample',
        models: [
          {
            id: 'openai/gpt-5',
            name: 'GPT-5',
            reasoning: {
              supported: false,
            },
          },
        ],
      },
    },
  };

  applyReasoningPortraits(data);

  const providers = data.providers as Record<string, ModelsDevProvider>;
  const model = providers.sample.models[0];
  assert.equal(model.extra_capabilities?.reasoning?.supported, true);
  assert.equal(typeof model.reasoning === 'object' && model.reasoning?.supported, true);
});

test('applies mixed reasoning portraits to Claude 4.6 variants', () => {
  const expectedNotes = [
    'Anthropic recommends adaptive thinking with effort for Claude 4.6; budget_tokens remains a deprecated compatibility path.',
  ];

  const modelIds = [
    'anthropic/claude-opus-4.6',
    'claude-sonnet-4-6@default',
    'us.anthropic.claude-sonnet-4-6',
  ];

  for (const modelId of modelIds) {
    assertReasoningPortrait(modelId, {
      defaultEnabled: false,
      mode: 'mixed',
      budget: {
        min: 1024,
        unit: 'tokens',
      },
      effort: 'medium',
      effortOptions: ['low', 'medium', 'high', 'max'],
      interleaved: true,
      summaries: true,
      visibility: 'summary',
      continuation: ['thinking_blocks'],
      notes: expectedNotes,
    });
  }

  assertNoXHigh('anthropic/claude-opus-4.6');
});

test('applies effort reasoning portraits to Claude Opus 4.7 variants', () => {
  const expectedNotes = [
    'Claude Opus 4.7 requires thinking.type = "adaptive" to enable thinking explicitly.',
    'Manual budget_tokens requests return 400 on Claude Opus 4.7.',
    'task_budget is separate from thinking control and should not be treated as a thinking budget.',
  ];

  const modelIds = [
    'claude-opus-4-7',
    'anthropic/claude-opus-4.7',
    'global.anthropic.claude-opus-4-7',
  ];

  for (const modelId of modelIds) {
    assertReasoningPortrait(modelId, {
      defaultEnabled: false,
      mode: 'effort',
      effort: 'medium',
      effortOptions: ['low', 'medium', 'high', 'xhigh', 'max'],
      interleaved: true,
      summaries: true,
      visibility: 'mixed',
      continuation: ['thinking_blocks'],
      notes: expectedNotes,
    });
  }
});

test('keeps budget reasoning portraits for Claude 3.7 Sonnet variants', () => {
  const modelIds = [
    'anthropic/claude-3.7-sonnet',
    'claude-3-7-sonnet-20250219',
  ];

  for (const modelId of modelIds) {
    assertReasoningPortrait(modelId, {
      defaultEnabled: false,
      mode: 'budget',
      budget: {
        min: 1024,
        unit: 'tokens',
      },
      interleaved: false,
      summaries: false,
      visibility: 'full',
      continuation: ['thinking_blocks'],
      notes: ['Anthropic uses thinking budget tokens'],
    });
  }
});

test('applies xhigh reasoning portraits for supported GPT-5.x variants', () => {
  assertEffortPortrait('gpt-5.2', {
    defaultEnabled: false,
    mode: 'effort',
    effort: 'none',
    effortOptions: ['none', 'low', 'medium', 'high', 'xhigh'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertEffortPortrait('gpt-5.2-pro', {
    defaultEnabled: true,
    mode: 'effort',
    effort: 'high',
    effortOptions: ['medium', 'high', 'xhigh'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertEffortPortrait('gpt-5.2-codex', {
    defaultEnabled: true,
    mode: 'effort',
    effort: 'medium',
    effortOptions: ['low', 'medium', 'high', 'xhigh'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertEffortPortrait('openai/gpt-5.3-codex', {
    defaultEnabled: true,
    mode: 'effort',
    effort: 'medium',
    effortOptions: ['low', 'medium', 'high', 'xhigh'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertEffortPortrait('openai/gpt-5.3-codex-spark', {
    defaultEnabled: true,
    mode: 'effort',
    effort: 'medium',
    effortOptions: ['low', 'medium', 'high', 'xhigh'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertEffortPortrait('gpt-5.4', {
    defaultEnabled: false,
    mode: 'effort',
    effort: 'none',
    effortOptions: ['none', 'low', 'medium', 'high', 'xhigh'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertEffortPortrait('openai/gpt-5.4-mini', {
    defaultEnabled: false,
    mode: 'effort',
    effort: 'none',
    effortOptions: ['none', 'low', 'medium', 'high', 'xhigh'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertEffortPortrait('gpt-5.4-nano', {
    defaultEnabled: false,
    mode: 'effort',
    effort: 'none',
    effortOptions: ['none', 'low', 'medium', 'high', 'xhigh'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertEffortPortrait('gpt-5.4-pro', {
    defaultEnabled: true,
    mode: 'effort',
    effort: 'high',
    effortOptions: ['medium', 'high', 'xhigh'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertEffortPortrait('openai/gpt-5.1-codex-max', {
    defaultEnabled: false,
    mode: 'effort',
    effort: 'none',
    effortOptions: ['none', 'low', 'medium', 'high'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });
});

test('does not add xhigh to unsupported GPT-5.x variants', () => {
  assertEffortPortrait('gpt-5.1', {
    defaultEnabled: false,
    mode: 'effort',
    effort: 'none',
    effortOptions: ['none', 'low', 'medium', 'high'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertEffortPortrait('gpt-5.1-codex', {
    defaultEnabled: false,
    mode: 'effort',
    effort: 'none',
    effortOptions: ['none', 'low', 'medium', 'high'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertEffortPortrait('gpt-5.1-codex-mini', {
    defaultEnabled: false,
    mode: 'effort',
    effort: 'none',
    effortOptions: ['none', 'low', 'medium', 'high'],
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertEffortPortrait('gpt-5-pro', {
    defaultEnabled: true,
    mode: 'fixed',
    effort: 'high',
    verbosity: 'medium',
    verbosityOptions: ['low', 'medium', 'high'],
  });

  assertNoXHigh('gpt-5.3-chat');
});

test('applies low-medium-high effort portraits for pre-gpt-5.1 o-series variants from the Responses API family rule', () => {
  const expected = {
    defaultEnabled: true,
    mode: 'effort' as const,
    effort: 'medium' as const,
    effortOptions: ['low', 'medium', 'high'] as ReasoningEffort[],
  };

  assertEffortPortrait('o1', expected);
  assertEffortPortrait('openai/o1-preview', expected);
  assertEffortPortrait('o1-mini', expected);
  assertEffortPortrait('openai/o1-pro', expected);
  assertEffortPortrait('o3', expected);
  assertEffortPortrait('openai/o3-mini-high', expected);
  assertEffortPortrait('o3-pro', expected);
  assertEffortPortrait('openai/o3-deep-research', expected);
  assertEffortPortrait('o4-mini', expected);
  assertEffortPortrait('openai/o4-mini-high', expected);
  assertEffortPortrait('o4-mini-deep-research', expected);

  assertNoXHigh('o1');
  assertNoXHigh('o3-mini-high');
  assertNoXHigh('o4-mini-deep-research');
});

test('does not infer effort portraits for GPT-5 chat aliases without official effort docs', () => {
  assertNoReasoningPortrait('gpt-5.1-chat');
  assertNoReasoningPortrait('openai/gpt-5.1-chat-latest');
  assertNoReasoningPortrait('gpt-5.2-chat');
  assertNoReasoningPortrait('openai/gpt-5.2-chat-latest');
});
