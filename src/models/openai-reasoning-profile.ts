export type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
export type ReasoningVerbosity = 'low' | 'medium' | 'high';
export type OpenAIReasoningMode = 'effort' | 'fixed';

export interface OpenAIReasoningProfile {
  defaultEnabled: boolean;
  mode: OpenAIReasoningMode;
  effort: ReasoningEffort;
  effortOptions?: ReasoningEffort[];
  verbosity?: ReasoningVerbosity;
  verbosityOptions?: ReasoningVerbosity[];
}

interface OpenAIReasoningRule {
  matches: (baseId: string, portableBaseId: string) => boolean;
  profile: OpenAIReasoningProfile;
}

const PRE_GPT51_O_SERIES_FAMILIES = [
  'o1-preview',
  'o1-mini',
  'o1-pro',
  'o1',
  'o3-mini',
  'o3-pro',
  'o3',
  'o4-mini',
] as const;

const LEGACY_GPT5_FAMILIES = [
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
  'gpt-5-codex',
] as const;

const GPT5_TEXT_VERBOSITY: ReasoningVerbosity = 'medium';
const GPT5_TEXT_VERBOSITY_OPTIONS: ReasoningVerbosity[] = ['low', 'medium', 'high'];

function withGpt5TextVerbosity(profile: OpenAIReasoningProfile): OpenAIReasoningProfile {
  return {
    ...profile,
    verbosity: GPT5_TEXT_VERBOSITY,
    verbosityOptions: [...GPT5_TEXT_VERBOSITY_OPTIONS],
  };
}

const OPENAI_REASONING_RULES: OpenAIReasoningRule[] = [
  {
    matches: (_baseId, portableBaseId) => isPortableExactOrSnapshot(portableBaseId, 'gpt-5-pro'),
    profile: withGpt5TextVerbosity({
      defaultEnabled: true,
      mode: 'fixed',
      effort: 'high',
    }),
  },
  {
    matches: (_baseId, portableBaseId) => isPortableExactOrSnapshot(portableBaseId, 'gpt-5-4-pro'),
    profile: withGpt5TextVerbosity({
      defaultEnabled: true,
      mode: 'effort',
      effort: 'high',
      effortOptions: ['medium', 'high', 'xhigh'],
    }),
  },
  {
    matches: (_baseId, portableBaseId) =>
      isPortableFamilyVariant(portableBaseId, 'gpt-5-4') &&
      !isPortableFamilyVariant(portableBaseId, 'gpt-5-4-pro'),
    profile: withGpt5TextVerbosity({
      defaultEnabled: false,
      mode: 'effort',
      effort: 'none',
      effortOptions: ['none', 'low', 'medium', 'high', 'xhigh'],
    }),
  },
  {
    matches: (_baseId, portableBaseId) => isPortableFamilyVariant(portableBaseId, 'gpt-5-3-codex'),
    profile: withGpt5TextVerbosity({
      defaultEnabled: true,
      mode: 'effort',
      effort: 'medium',
      effortOptions: ['low', 'medium', 'high', 'xhigh'],
    }),
  },
  {
    matches: (_baseId, portableBaseId) => isPortableExactOrSnapshot(portableBaseId, 'gpt-5-2-pro'),
    profile: withGpt5TextVerbosity({
      defaultEnabled: true,
      mode: 'effort',
      effort: 'high',
      effortOptions: ['medium', 'high', 'xhigh'],
    }),
  },
  {
    matches: (_baseId, portableBaseId) => isPortableExactOrSnapshot(portableBaseId, 'gpt-5-2-codex'),
    profile: withGpt5TextVerbosity({
      defaultEnabled: true,
      mode: 'effort',
      effort: 'medium',
      effortOptions: ['low', 'medium', 'high', 'xhigh'],
    }),
  },
  {
    matches: (_baseId, portableBaseId) =>
      isPortableFamilyVariant(portableBaseId, 'gpt-5-2') &&
      !isPortableFamilyVariant(portableBaseId, 'gpt-5-2-pro') &&
      !isPortableFamilyVariant(portableBaseId, 'gpt-5-2-codex') &&
      !isPortableFamilyVariant(portableBaseId, 'gpt-5-2-chat'),
    profile: withGpt5TextVerbosity({
      defaultEnabled: false,
      mode: 'effort',
      effort: 'none',
      effortOptions: ['none', 'low', 'medium', 'high', 'xhigh'],
    }),
  },
  {
    matches: (_baseId, portableBaseId) =>
      isPortableFamilyVariant(portableBaseId, 'gpt-5-1') &&
      !isPortableFamilyVariant(portableBaseId, 'gpt-5-1-chat'),
    profile: withGpt5TextVerbosity({
      defaultEnabled: false,
      mode: 'effort',
      effort: 'none',
      effortOptions: ['none', 'low', 'medium', 'high'],
    }),
  },
  // OpenAI only publishes a family-level rule for pre-gpt-5.1 reasoning models:
  // they default to medium and do not support none. Keep this mapping conservative.
  {
    matches: (_baseId, portableBaseId) =>
      PRE_GPT51_O_SERIES_FAMILIES.some(family => isPortableFamilyVariant(portableBaseId, family)),
    profile: {
      defaultEnabled: true,
      mode: 'effort',
      effort: 'medium',
      effortOptions: ['low', 'medium', 'high'],
    },
  },
  {
    matches: (_baseId, portableBaseId) =>
      LEGACY_GPT5_FAMILIES.some(family => isPortableExactOrSnapshot(portableBaseId, family)),
    profile: withGpt5TextVerbosity({
      defaultEnabled: true,
      mode: 'effort',
      effort: 'medium',
      effortOptions: ['minimal', 'low', 'medium', 'high'],
    }),
  },
];

function normalizeModelId(rawId?: string): string {
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

function isPortableFamilyVariant(portableBaseId: string, family: string): boolean {
  return portableBaseId === family || portableBaseId.startsWith(`${family}-`);
}

function isPortableExactOrSnapshot(portableBaseId: string, family: string): boolean {
  return portableBaseId === family || new RegExp(`^${family}-\\d{4}-\\d{2}-\\d{2}$`).test(portableBaseId);
}

function cloneOpenAIReasoningProfile(profile: OpenAIReasoningProfile): OpenAIReasoningProfile {
  const effortOptions = profile.effortOptions ? [...profile.effortOptions] : undefined;
  const verbosityOptions = profile.verbosityOptions ? [...profile.verbosityOptions] : undefined;

  return {
    ...profile,
    effortOptions,
    verbosity: profile.verbosity,
    verbosityOptions,
  };
}

export function getOpenAIReasoningProfile(
  modelId?: string,
): OpenAIReasoningProfile | undefined {
  const normalizedId = normalizeModelId(modelId);
  if (!normalizedId) {
    return undefined;
  }

  const baseId = extractBaseId(normalizedId);
  const portableBaseId = baseId.replace(/\./g, '-');

  for (const rule of OPENAI_REASONING_RULES) {
    if (rule.matches(baseId, portableBaseId)) {
      return cloneOpenAIReasoningProfile(rule.profile);
    }
  }

  return undefined;
}
