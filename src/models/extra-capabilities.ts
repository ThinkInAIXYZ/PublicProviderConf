import { getOpenAIReasoningProfile } from './openai-reasoning-profile';

export type ReasoningMode = 'budget' | 'effort' | 'level' | 'fixed' | 'mixed';
export type ReasoningVisibility = 'hidden' | 'summary' | 'full' | 'mixed' | 'omitted';

export interface LegacyInterleavedDescriptor {
  field?: string;
  [key: string]: unknown;
}

export type LegacyInterleaved = boolean | LegacyInterleavedDescriptor;

export interface ExtraCapabilitiesReasoningBudget {
  min?: number;
  max?: number;
  default?: number;
  auto?: number;
  off?: number;
  unit?: 'tokens';
}

export interface ExtraCapabilitiesReasoning {
  supported?: boolean;
  default_enabled?: boolean;
  mode?: ReasoningMode;
  budget?: ExtraCapabilitiesReasoningBudget;
  effort?: string;
  effort_options?: string[];
  verbosity?: string;
  verbosity_options?: string[];
  level?: string;
  level_options?: string[];
  interleaved?: boolean;
  summaries?: boolean;
  visibility?: ReasoningVisibility;
  continuation?: string[];
  notes?: string[];
  [key: string]: unknown;
}

export interface ExtraCapabilities {
  reasoning?: ExtraCapabilitiesReasoning;
  [key: string]: unknown;
}

interface ReasoningPortraitDefinition {
  matches: (normalizedId: string, baseId: string, portableBaseId: string) => boolean;
  portrait: ExtraCapabilitiesReasoning;
}

interface ReasoningModelLike {
  id?: string;
  name?: string;
  reasoning?: unknown;
  extra_capabilities?: ExtraCapabilities;
  interleaved?: LegacyInterleaved;
}

function cloneBudget(
  budget?: ExtraCapabilitiesReasoningBudget,
): ExtraCapabilitiesReasoningBudget | undefined {
  return budget ? { ...budget } : undefined;
}

export function cloneReasoningPortrait(
  portrait?: ExtraCapabilitiesReasoning,
): ExtraCapabilitiesReasoning | undefined {
  if (!portrait) {
    return undefined;
  }

  return {
    ...portrait,
    budget: cloneBudget(portrait.budget),
    effort_options: portrait.effort_options ? [...portrait.effort_options] : undefined,
    verbosity_options: portrait.verbosity_options ? [...portrait.verbosity_options] : undefined,
    level_options: portrait.level_options ? [...portrait.level_options] : undefined,
    continuation: portrait.continuation ? [...portrait.continuation] : undefined,
    notes: portrait.notes ? [...portrait.notes] : undefined,
  };
}

function mergeReasoningPortrait(
  base: ExtraCapabilitiesReasoning,
  override?: ExtraCapabilitiesReasoning,
): ExtraCapabilitiesReasoning {
  if (!override) {
    return cloneReasoningPortrait(base) ?? {};
  }

  return {
    ...base,
    ...override,
    budget: base.budget || override.budget ? { ...base.budget, ...override.budget } : undefined,
    effort_options: override.effort_options ? [...override.effort_options] : base.effort_options ? [...base.effort_options] : undefined,
    verbosity_options: override.verbosity_options ? [...override.verbosity_options] : base.verbosity_options ? [...base.verbosity_options] : undefined,
    level_options: override.level_options ? [...override.level_options] : base.level_options ? [...base.level_options] : undefined,
    continuation: override.continuation ? [...override.continuation] : base.continuation ? [...base.continuation] : undefined,
    notes: override.notes ? [...override.notes] : base.notes ? [...base.notes] : undefined,
  };
}

function normalizeReasoningSupport(
  reasoning: ExtraCapabilitiesReasoning,
): ExtraCapabilitiesReasoning {
  if (reasoning.interleaved === true && reasoning.supported !== true) {
    return {
      ...reasoning,
      supported: true,
    };
  }

  return reasoning;
}

function normalizeId(rawId?: string): string {
  return String(rawId ?? '')
    .trim()
    .toLowerCase()
    .replace(/\(free\)/g, '')
    .replace(/\s+/g, '');
}

function extractBaseId(normalizedId: string): string {
  const parts = normalizedId.split('/');
  return parts[parts.length - 1] ?? normalizedId;
}

function isGeminiImageVariant(baseId: string): boolean {
  return baseId.includes('image');
}

function isGeminiAudioVariant(baseId: string): boolean {
  return baseId.includes('tts') || baseId.includes('audio');
}

function normalizeFreeSuffix(baseId: string): string {
  return baseId.replace(/(?::free|-free)$/i, '');
}

function isQwenExcludedVariant(baseId: string): boolean {
  return (
    baseId.includes('instruct-2507') ||
    baseId.includes('-instruct') ||
    baseId.includes('qwen3-coder') ||
    baseId.includes('embedding') ||
    baseId.includes('reranker') ||
    baseId.includes('asr') ||
    baseId.includes('livetranslate') ||
    baseId.includes('realtime') ||
    baseId.includes('captioner')
  );
}

function getQwenSnapshotDate(baseId: string, family: string): number | undefined {
  const match = baseId.match(new RegExp(`^${family}-(\\d{4})-(\\d{2})-(\\d{2})$`));
  if (!match) {
    return undefined;
  }

  return Number(`${match[1]}${match[2]}${match[3]}`);
}

function matchesQwenCommercialReasoningBase(baseId: string): boolean {
  const commercialFamilies = ['qwen-plus', 'qwen-flash', 'qwen-turbo'];
  const firstReasoningSnapshot = 20250428;

  for (const family of commercialFamilies) {
    if (baseId === family || baseId === `${family}-latest`) {
      return true;
    }

    const snapshotDate = getQwenSnapshotDate(baseId, family);
    if (snapshotDate !== undefined) {
      return snapshotDate >= firstReasoningSnapshot;
    }
  }

  return false;
}

function matchesQwen35ReasoningBase(baseId: string): boolean {
  return (
    baseId.startsWith('qwen3.5-plus') ||
    baseId.startsWith('qwen3.5-flash') ||
    /^qwen3\.5-\d+b(?:-[a-z]\d+b)?(?:-|$)/.test(baseId)
  );
}

function matchesQwen3MaxReasoningBase(baseId: string): boolean {
  if (baseId === 'qwen3-max' || baseId === 'qwen3-max-preview') {
    return true;
  }

  if (baseId.startsWith('qwen3-max') && baseId.includes('thinking')) {
    return true;
  }

  const snapshotDate = getQwenSnapshotDate(baseId, 'qwen3-max');
  return snapshotDate !== undefined && snapshotDate >= 20260123;
}

function matchesQwen3ReasoningBase(baseId: string): boolean {
  if (baseId.startsWith('qwen3.6-') || matchesQwen3MaxReasoningBase(baseId)) {
    return true;
  }

  if (baseId.startsWith('qwen3-vl-')) {
    return (
      baseId.includes('thinking') ||
      baseId.startsWith('qwen3-vl-plus') ||
      baseId.startsWith('qwen3-vl-flash') ||
      /^qwen3-vl-(?:\d+b|235b|30b)-/.test(baseId)
    );
  }

  if (baseId.startsWith('qwen3-omni-')) {
    return baseId.includes('thinking') || baseId.startsWith('qwen3-omni-flash');
  }

  if (/^qwen3-next-\d+b-[a-z0-9]+-thinking/.test(baseId)) {
    return true;
  }

  if (/^qwen3-(?:235b|32b|30b|14b|8b|4b|1\.7b|0\.6b).*-thinking/.test(baseId)) {
    return true;
  }

  return /^qwen3-(?:235b-a22b|32b|30b-a3b|14b|8b|4b|1\.7b|0\.6b)$/.test(baseId);
}

function matchesQwenInterleavedReasoningBase(baseId: string): boolean {
  const normalizedBaseId = normalizeFreeSuffix(baseId);
  if (isQwenExcludedVariant(normalizedBaseId)) {
    return false;
  }

  return (
    normalizedBaseId.startsWith('qwq-') ||
    matchesQwen35ReasoningBase(normalizedBaseId) ||
    matchesQwen3ReasoningBase(normalizedBaseId) ||
    matchesQwenCommercialReasoningBase(normalizedBaseId)
  );
}

function matchesInterleavedReasoningBase(baseId: string): boolean {
  return (
    baseId === 'deepseek-reasoner' ||
    baseId === 'deepseek-r1' ||
    baseId === 'deepseek-r1-0528' ||
    baseId === 'kimi-k2-thinking' ||
    baseId === 'kimi-k2.5' ||
    baseId === 'glm-4.7' ||
    baseId === 'glm-5' ||
    baseId === 'minimax-m2.7' ||
    baseId === 'minimax-m2.7-highspeed' ||
    matchesQwenInterleavedReasoningBase(baseId)
  );
}

function matchesAnthropicModelVariant(normalizedId: string, pattern: RegExp): boolean {
  const portableId = normalizedId.replace(/\./g, '-');
  return pattern.test(normalizedId) || pattern.test(portableId);
}

const CLAUDE_37_SONNET_PATTERN = /(^|[/:@.-])claude-3[.-]7-sonnet(?=$|[/:@.-])/;
const CLAUDE_46_PATTERN = /(^|[/:@.-])claude-(?:sonnet|opus)-4[.-]6(?=$|[/:@.-])/;
const CLAUDE_OPUS_47_PATTERN = /(^|[/:@.-])claude-opus-4[.-]7(?=$|[/:@.-])/;
const CLAUDE_THINKING_VARIANT_PATTERN = /(^|[/:@.-])claude(?=$|[/:@.-])/;
const THINKING_SUFFIX_PATTERN = /(^|[/:@.-])think(?:ing)?(?=$|[/:@.-])/;

const CLAUDE_46_NOTES = [
  'Anthropic recommends adaptive thinking with effort for Claude 4.6; budget_tokens remains a deprecated compatibility path.',
];

const CLAUDE_OPUS_47_NOTES = [
  'Claude Opus 4.7 requires thinking.type = "adaptive" to enable thinking explicitly.',
  'Manual budget_tokens requests return 400 on Claude Opus 4.7.',
  'task_budget is separate from thinking control and should not be treated as a thinking budget.',
];

const DEFAULT_INTERLEAVED_REASONING_PORTRAIT: ExtraCapabilitiesReasoning = {
  supported: true,
  interleaved: true,
  summaries: true,
  visibility: 'summary',
  continuation: ['thinking_blocks'],
};

const REASONING_PORTRAITS: ReasoningPortraitDefinition[] = [
  {
    matches: (_normalizedId, baseId) => matchesInterleavedReasoningBase(baseId),
    portrait: DEFAULT_INTERLEAVED_REASONING_PORTRAIT,
  },
  {
    matches: normalizedId => matchesAnthropicModelVariant(normalizedId, CLAUDE_37_SONNET_PATTERN),
    portrait: {
      supported: true,
      default_enabled: false,
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
    },
  },
  {
    matches: normalizedId => matchesAnthropicModelVariant(normalizedId, CLAUDE_46_PATTERN),
    portrait: {
      supported: true,
      default_enabled: false,
      mode: 'mixed',
      budget: {
        min: 1024,
        unit: 'tokens',
      },
      effort: 'medium',
      effort_options: ['low', 'medium', 'high', 'max'],
      interleaved: true,
      summaries: true,
      visibility: 'summary',
      continuation: ['thinking_blocks'],
      notes: CLAUDE_46_NOTES,
    },
  },
  {
    matches: normalizedId => matchesAnthropicModelVariant(normalizedId, CLAUDE_OPUS_47_PATTERN),
    portrait: {
      supported: true,
      default_enabled: false,
      mode: 'effort',
      effort: 'high',
      effort_options: ['low', 'medium', 'high', 'xhigh', 'max'],
      interleaved: true,
      summaries: true,
      visibility: 'omitted',
      continuation: ['thinking_blocks'],
      notes: CLAUDE_OPUS_47_NOTES,
    },
  },
  {
    matches: (_normalizedId, baseId) => baseId.includes('gemini-2.5-pro'),
    portrait: {
      supported: true,
      default_enabled: true,
      mode: 'budget',
      budget: {
        min: 128,
        max: 32768,
        default: -1,
        auto: -1,
        unit: 'tokens',
      },
      summaries: true,
      visibility: 'summary',
      continuation: ['thought_signatures'],
    },
  },
  {
    matches: (_normalizedId, baseId) => baseId.includes('gemini-2.5-flash-lite'),
    portrait: {
      supported: true,
      default_enabled: false,
      mode: 'budget',
      budget: {
        min: 512,
        max: 24576,
        default: -1,
        auto: -1,
        unit: 'tokens',
      },
      summaries: true,
      visibility: 'summary',
      continuation: ['thought_signatures'],
    },
  },
  {
    matches: (_normalizedId, baseId) =>
      baseId.includes('gemini-2.5-flash') && !isGeminiImageVariant(baseId) && !isGeminiAudioVariant(baseId),
    portrait: {
      supported: true,
      default_enabled: true,
      mode: 'budget',
      budget: {
        min: 0,
        max: 24576,
        default: -1,
        auto: -1,
        off: 0,
        unit: 'tokens',
      },
      summaries: true,
      visibility: 'summary',
      continuation: ['thought_signatures'],
    },
  },
  {
    matches: (_normalizedId, baseId) => /^gemini-3(?:\.\d+)?-pro/.test(baseId),
    portrait: {
      supported: true,
      default_enabled: true,
      mode: 'level',
      level: 'high',
      level_options: ['low', 'high'],
      summaries: true,
      visibility: 'summary',
      continuation: ['thought_signatures'],
    },
  },
  {
    matches: (_normalizedId, baseId) =>
      /^gemini-3(?:\.\d+)?-flash/.test(baseId) &&
      !baseId.includes('flash-lite') &&
      !isGeminiImageVariant(baseId) &&
      !isGeminiAudioVariant(baseId),
    portrait: {
      supported: true,
      default_enabled: true,
      mode: 'level',
      level: 'high',
      level_options: ['minimal', 'low', 'medium', 'high'],
      summaries: true,
      visibility: 'summary',
      continuation: ['thought_signatures'],
    },
  },
];

function toOpenAIReasoningPortrait(modelId?: string): ExtraCapabilitiesReasoning | undefined {
  const profile = getOpenAIReasoningProfile(modelId);
  if (!profile) {
    return undefined;
  }

  return {
    supported: true,
    default_enabled: profile.defaultEnabled,
    mode: profile.mode,
    effort: profile.effort,
    effort_options: profile.effortOptions ? [...profile.effortOptions] : undefined,
    verbosity: profile.verbosity,
    verbosity_options: profile.verbosityOptions ? [...profile.verbosityOptions] : undefined,
    visibility: 'hidden',
  };
}

export function getReasoningPortrait(modelId?: string): ExtraCapabilitiesReasoning | undefined {
  const normalizedId = normalizeId(modelId);
  if (!normalizedId) {
    return undefined;
  }

  const openAIReasoningPortrait = toOpenAIReasoningPortrait(normalizedId);
  if (openAIReasoningPortrait) {
    return openAIReasoningPortrait;
  }

  const baseId = extractBaseId(normalizedId);
  const portableBaseId = baseId.replace(/\./g, '-');

  for (const definition of REASONING_PORTRAITS) {
    if (definition.matches(normalizedId, baseId, portableBaseId)) {
      return cloneReasoningPortrait(definition.portrait);
    }
  }

  return undefined;
}

export function cloneExtraCapabilities(
  extraCapabilities?: ExtraCapabilities,
): ExtraCapabilities | undefined {
  if (!extraCapabilities) {
    return undefined;
  }

  const cloned: ExtraCapabilities = { ...extraCapabilities };
  if (extraCapabilities.reasoning) {
    cloned.reasoning = cloneReasoningPortrait(extraCapabilities.reasoning);
  }
  return cloned;
}

export function cloneLegacyInterleaved(
  interleaved?: LegacyInterleaved,
): LegacyInterleaved | undefined {
  if (interleaved === undefined) {
    return undefined;
  }

  if (typeof interleaved === 'boolean') {
    return interleaved;
  }

  return { ...interleaved };
}

function reasoningFromLegacyInterleaved(
  interleaved?: LegacyInterleaved,
): ExtraCapabilitiesReasoning | undefined {
  if (interleaved === undefined || interleaved === false) {
    return undefined;
  }

  if (interleaved === true) {
    return {
      supported: true,
      interleaved: true,
    };
  }

  const field = typeof interleaved.field === 'string' ? interleaved.field.trim().toLowerCase() : '';
  if (!field || field === 'reasoning_content' || field === 'reasoning_details') {
    return cloneReasoningPortrait(DEFAULT_INTERLEAVED_REASONING_PORTRAIT);
  }

  return {
    supported: true,
    interleaved: true,
  };
}

function getClaudeThinkingDefaultOverride(rawIdentifier?: string): ExtraCapabilitiesReasoning | undefined {
  const normalizedId = normalizeId(rawIdentifier);
  if (!normalizedId) {
    return undefined;
  }

  const portableId = normalizedId.replace(/\./g, '-');
  if (!CLAUDE_THINKING_VARIANT_PATTERN.test(portableId) || !THINKING_SUFFIX_PATTERN.test(portableId)) {
    return undefined;
  }

  return {
    supported: true,
    default_enabled: true,
  };
}

export function applyReasoningPortraitToModel<T extends ReasoningModelLike>(
  model: T,
  reasoningHint?: ExtraCapabilitiesReasoning,
): void {
  const identifier = model.id ?? model.name;
  const portrait = getReasoningPortrait(identifier);
  const hint = cloneReasoningPortrait(reasoningHint);
  const legacy = reasoningFromLegacyInterleaved(model.interleaved);
  const existing = cloneReasoningPortrait(model.extra_capabilities?.reasoning);
  const claudeThinkingDefault = getClaudeThinkingDefaultOverride(identifier);

  let normalizedReasoning: ExtraCapabilitiesReasoning | undefined;
  for (const candidate of [portrait, hint, legacy, existing, claudeThinkingDefault]) {
    if (!candidate) {
      continue;
    }
    normalizedReasoning = normalizedReasoning
      ? mergeReasoningPortrait(normalizedReasoning, candidate)
      : cloneReasoningPortrait(candidate);
  }

  if (!normalizedReasoning) {
    return;
  }

  const extraCapabilities = cloneExtraCapabilities(model.extra_capabilities) ?? {};
  extraCapabilities.reasoning = normalizeReasoningSupport(normalizedReasoning);
  model.extra_capabilities = extraCapabilities;
}

export function syncReasoningFlagFromExtra<T extends ReasoningModelLike>(model: T): void {
  const reasoning = model.extra_capabilities?.reasoning;
  if (!reasoning || (reasoning.supported !== true && reasoning.interleaved !== true)) {
    return;
  }
  const defaultEnabled =
    typeof reasoning.default_enabled === 'boolean' ? reasoning.default_enabled : undefined;

  if (typeof model.reasoning === 'boolean') {
    model.reasoning = (defaultEnabled !== undefined
      ? { supported: true, default: defaultEnabled }
      : model.reasoning
        ? { supported: true, default: true }
        : { supported: true }) as T['reasoning'];
    return;
  }

  if (model.reasoning && typeof model.reasoning === 'object') {
    const nextReasoning: Record<string, unknown> = {
      ...(model.reasoning as Record<string, unknown>),
      supported: true,
    };
    if (defaultEnabled !== undefined) {
      nextReasoning.default = defaultEnabled;
    }
    model.reasoning = nextReasoning as T['reasoning'];
    return;
  }

  model.reasoning = (defaultEnabled !== undefined
    ? { supported: true, default: defaultEnabled }
    : { supported: true }) as T['reasoning'];
}
