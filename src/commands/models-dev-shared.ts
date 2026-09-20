import { promises as fs } from 'fs';
import { join } from 'path';
import * as providers from '../providers';
import { Provider } from '../providers/Provider';
import { ModelsDevClient } from '../fetcher/models-dev-client';
import {
  ModelsDevApiResponse,
  ModelsDevProvider,
  normalizeProvidersList,
  getProviderId as getModelsDevProviderId,
  providersToRecord,
} from '../models/models-dev';
import {
  ModelsDevTemplateManager,
  mergeProviderWithTemplate,
} from '../templates/models-dev-template-manager';
import { AppConfig, ProviderConfig } from '../config/app-config';

export const PROVIDER_ALIASES: Record<string, string> = {
  'github-ai': 'github-models',
  'openrouter-ai': 'openrouter',
  'jiekou-ai': 'jiekou',
};

const MODELS_DEV_ONLY_PROVIDERS = new Set([
  'vercel',
  'anthropic',
  'deepseek',
  'github_ai',
  'github-models',
  'gemini',
  'openai',
]);

const LIVE_PROVIDER_OVERRIDES = new Map<string, string>([
  ['custom-provider', 'custom provider'],
  ['openrouter', 'OpenRouter'],
  ['jiekou', 'Jiekou'],
  ['aihubmix', 'AIHubMix'],
]);

export function normalizeProviderId(providerId: string): string {
  const normalized = providerId.trim().toLowerCase().replace(/_/g, '-');
  return PROVIDER_ALIASES[normalized] ?? normalized;
}

/**
 * Some upstream providers report `limit.output` equal to (or larger than)
 * `limit.context`, which is physically meaningless: a model cannot emit more
 * tokens than its entire context window. The providers below get those values
 * repaired.
 */
export const LIMIT_OUTPUT_REPAIR_PROVIDERS = new Set([
  'siliconflow',
  'siliconflow-com',
]);

interface OutputLimitRule {
  match: RegExp;
  maxOutput: number;
}

/**
 * Known output-token ceilings per model family, cross-checked against the same
 * models served by other providers in the models.dev dataset (official vendors
 * first, then the most common consensus value).
 */
export const OUTPUT_LIMIT_RULES: OutputLimitRule[] = [
  { match: /deepseek-v3\.2/i, maxOutput: 65536 },
  { match: /deepseek-(v3\.1|v3|r1)/i, maxOutput: 8192 },
  { match: /deepseek-ocr/i, maxOutput: 8192 },
  { match: /qwen3-vl/i, maxOutput: 32768 },
  { match: /qwen3-coder/i, maxOutput: 65536 },
  { match: /qwen3-235b-a22b-thinking/i, maxOutput: 131072 },
  { match: /qwen3/i, maxOutput: 32768 },
  { match: /qwen2\.5/i, maxOutput: 8192 },
  { match: /glm-5/i, maxOutput: 131072 },
  { match: /glm-4\.5/i, maxOutput: 98304 },
  { match: /kimi-k2/i, maxOutput: 262144 },
  { match: /step-3/i, maxOutput: 256000 },
  { match: /hunyuan/i, maxOutput: 117964 },
];

/** Fallback for model families that match no rule above. */
export const DEFAULT_OUTPUT_RATIO = 0.38;

/**
 * Repairs pathological `limit.output` values (output >= context) for the
 * providers listed in `LIMIT_OUTPUT_REPAIR_PROVIDERS`, using the per-family
 * ceilings from `OUTPUT_LIMIT_RULES` and falling back to a fraction of the
 * context window. Runs after template merging so stale template values cannot
 * resurrect the bad numbers.
 */
export function correctLimitOutput(
  providers: ModelsDevApiResponse['providers'],
  rules: OutputLimitRule[] = OUTPUT_LIMIT_RULES,
  fallbackRatio: number = DEFAULT_OUTPUT_RATIO,
): number {
  let corrected = 0;

  for (const provider of normalizeProvidersList(providers)) {
    if (!LIMIT_OUTPUT_REPAIR_PROVIDERS.has(normalizeProviderId(getModelsDevProviderId(provider)))) {
      continue;
    }

    for (const model of provider.models ?? []) {
      const limit = model.limit;
      if (!limit) {
        continue;
      }

      const { context, output } = limit;
      if (typeof context !== 'number' || typeof output !== 'number') {
        continue;
      }
      if (context <= 0 || output < context) {
        continue;
      }

      const rule = rules.find(entry => entry.match.test(model.id ?? ''));
      let nextOutput = rule ? rule.maxOutput : Math.round(context * fallbackRatio);
      if (nextOutput >= context) {
        // The family ceiling does not fit this context window; stay below it.
        nextOutput = Math.round(context * fallbackRatio);
      }
      limit.output = nextOutput;
      corrected += 1;
    }
  }

  return corrected;
}

export function createProvider(providerId: string, config: ProviderConfig): Provider | null {
  try {
    const normalizedId = normalizeProviderId(providerId);
    if (MODELS_DEV_ONLY_PROVIDERS.has(providerId) || MODELS_DEV_ONLY_PROVIDERS.has(normalizedId)) {
      console.log(`ℹ️  Skipping ${providerId}: models.dev dataset already covers this provider.`);
      return null;
    }

    switch (providerId) {
      case 'ppinfra':
        return new providers.PPInfraProvider(config.apiUrl);

      case 'tokenflux':
        return new providers.TokenfluxProvider(config.apiUrl);

      case 'custom-provider':
        return new providers.CustomProvider();

      case 'openrouter':
        return new providers.OpenRouterProvider(config.apiUrl);

      case 'jiekou':
        console.log('create jekou')
        return new providers.JiekouProvider(config.apiUrl);

      case 'aihubmix':
        return new providers.AiHubMixProvider(config.apiUrl);

      case 'groq': {
        const groqApiKey = config.getApiKey();
        if (groqApiKey) {
          return new providers.GroqProvider(groqApiKey);
        }
        console.log('⚠️  Skipping Groq: No API key found (set GROQ_API_KEY environment variable)');
        return null;
      }

      default:
        console.log(`⚠️  Unknown provider: ${providerId}`);
        return null;
    }
  } catch (error) {
    console.error(
      `❌ Failed to create provider ${providerId}:`,
      error instanceof Error ? error.message : 'Unknown error',
    );
    return null;
  }
}

export interface ExclusionSources {
  modelsDev: Set<string>;
  templates: Set<string>;
}

export function getExclusionReason(providerId: string, sources: ExclusionSources): string {
  const reasons: string[] = [];

  if (sources.modelsDev.has(providerId)) {
    reasons.push('models.dev dataset');
  }
  if (sources.templates.has(providerId)) {
    reasons.push('manual template');
  }
  if (reasons.length === 0) {
    return 'already included in combined dataset';
  }
  if (reasons.length === 1) {
    return `covered by ${reasons[0]}`;
  }

  const lastReason = reasons.pop();
  return `covered by ${reasons.join(', ')} and ${lastReason}`;
}

export function createProvidersFromConfig(
  config: AppConfig,
  excludedProviders: Set<string> = new Set(),
  exclusionSources?: ExclusionSources,
): Provider[] {
  const providerInstances: Provider[] = [];

  for (const [providerId, providerConfig] of Object.entries(config.providers)) {
    const normalizedId = normalizeProviderId(providerId);
    const overrideName = LIVE_PROVIDER_OVERRIDES.get(normalizedId);

    if (!overrideName && excludedProviders.has(normalizedId)) {
      if (exclusionSources) {
        const reason = getExclusionReason(normalizedId, exclusionSources);
        console.log(`ℹ️  Skipping ${providerId}: ${reason}`);
      } else {
        console.log(`ℹ️  Skipping ${providerId}: already available via models.dev or templates`);
      }
      continue;
    }

    if (overrideName && excludedProviders.has(normalizedId)) {
      console.log(
        `ℹ️  Forcing ${overrideName} provider to fetch live data despite coverage in base dataset.`,
      );
    }

    const provider = createProvider(providerId, providerConfig);
    if (provider) {
      providerInstances.push(provider);
    }
  }

  return providerInstances;
}

export function findProviderConfig(
  providersConfig: AppConfig['providers'],
  normalizedId: string,
): { key: string; config: ProviderConfig } | null {
  for (const [key, config] of Object.entries(providersConfig)) {
    if (normalizeProviderId(key) === normalizedId) {
      return { key, config };
    }
  }

  return null;
}

export interface BaseContext {
  baseDataWithTemplates: ModelsDevApiResponse;
  templatesById: Map<string, ModelsDevProvider>;
  existingProviderIds: Set<string>;
  exclusionSources: ExclusionSources;
}

export async function loadBaseContext(): Promise<BaseContext> {
  const modelsDevClient = new ModelsDevClient();

  const baseData = await modelsDevClient.fetchProviders();

  const templateManager = new ModelsDevTemplateManager();
  const loadedTemplates = await templateManager.loadAllTemplates();

  const templatesById = new Map<string, ModelsDevProvider>();
  const templateIds: string[] = [];
  const loggedTemplateSkips = new Set<string>();
  for (const template of loadedTemplates.values()) {
    const normalizedId = normalizeProviderId(template.id);
    const overrideName = LIVE_PROVIDER_OVERRIDES.get(normalizedId);
    if (overrideName) {
      if (!loggedTemplateSkips.has(normalizedId)) {
        console.log(
          `ℹ️  Skipping ${overrideName} manual template: live provider will write dist/${normalizedId}.json directly.`,
        );
        loggedTemplateSkips.add(normalizedId);
      }
      continue;
    }
    templatesById.set(normalizedId, template);
    templateIds.push(normalizedId);
  }

  const baseProvidersRecord = providersToRecord(baseData.providers);
  const modelsDevIds = new Set<string>();
  const loggedModelsDevSkips = new Set<string>();
  for (const [key, provider] of Object.entries(baseProvidersRecord)) {
    const normalizedId = normalizeProviderId(getModelsDevProviderId(provider));
    const overrideName = LIVE_PROVIDER_OVERRIDES.get(normalizedId);
    if (overrideName) {
      if (!loggedModelsDevSkips.has(normalizedId)) {
        console.log(
          `ℹ️  Removing ${overrideName} entry from models.dev snapshot in favor of the live provider.`,
        );
        loggedModelsDevSkips.add(normalizedId);
      }
      delete baseProvidersRecord[key];
      continue;
    }
    modelsDevIds.add(normalizedId);
    const template = templatesById.get(normalizedId);
    if (template) {
      baseProvidersRecord[key] = mergeProviderWithTemplate(provider, template);
      templatesById.delete(normalizedId);
    }
  }

  // Merge ollama-cloud into ollama, preferring cloud data on conflicts
  const ollamaTemplate = templatesById.get('ollama');
  const ollamaCloud = baseProvidersRecord['ollama-cloud'];
  if (ollamaTemplate && ollamaCloud) {
    const combined = mergeProviderWithTemplate(ollamaTemplate, ollamaCloud);
    combined.id = 'ollama';
    combined.name = combined.name || 'Ollama';
    combined.display_name = combined.display_name || 'Ollama';

    baseProvidersRecord['ollama'] = combined;
    delete baseProvidersRecord['ollama-cloud'];

    templatesById.delete('ollama');

    if (modelsDevIds.delete('ollama-cloud')) {
      modelsDevIds.add('ollama');
    }
  }

  const templatesRemaining = new Map(templatesById);

  for (const template of templatesRemaining.values()) {
    const providerId = template.id;
    if (providerId && !baseProvidersRecord[providerId]) {
      baseProvidersRecord[providerId] = mergeProviderWithTemplate(template);
    }
  }

  const baseProvidersWithTemplates = templateManager.rebuildProviders(
    baseData.providers,
    baseProvidersRecord,
  );

  const baseDataWithTemplates: ModelsDevApiResponse = {
    ...baseData,
    providers: baseProvidersWithTemplates,
  };

  const correctedLimitOutputs = correctLimitOutput(baseDataWithTemplates.providers);
  if (correctedLimitOutputs > 0) {
    console.log(
      `ℹ️  Repaired limit.output for ${correctedLimitOutputs} model(s) where upstream reported output >= context.`,
    );
  }

  const existingProviderIds = new Set(
    normalizeProvidersList(baseDataWithTemplates.providers).map(provider =>
      normalizeProviderId(getModelsDevProviderId(provider)),
    ),
  );

  for (const id of templateIds) {
    existingProviderIds.add(id);
  }

  for (const [overrideId, overrideName] of LIVE_PROVIDER_OVERRIDES) {
    if (existingProviderIds.delete(overrideId)) {
      console.log(
        `ℹ️  Forcing ${overrideName} provider to refetch live data for dist output.`,
      );
    }
  }

  const exclusionSources: ExclusionSources = {
    modelsDev: modelsDevIds,
    templates: new Set(templateIds),
  };

  return {
    baseDataWithTemplates,
    templatesById,
    existingProviderIds,
    exclusionSources,
  };
}

export async function loadAihubmixFallback(outputDir: string): Promise<ModelsDevProvider | null> {
  const candidates = [join(outputDir, 'aihubmix.json'), join('dist', 'aihubmix.json')];

  for (const filePath of candidates) {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as ModelsDevProvider;
      if (parsed && Array.isArray(parsed.models)) {
        return parsed;
      }
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        continue;
      }
      console.warn(`⚠️  Failed to read ${filePath}: ${err.message ?? String(err)}`);
    }
  }

  return null;
}
