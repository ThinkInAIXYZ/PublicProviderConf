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
  ['openrouter', 'OpenRouter'],
  ['jiekou', 'Jiekou'],
  ['aihubmix', 'AIHubMix'],
]);

export function normalizeProviderId(providerId: string): string {
  const normalized = providerId.trim().toLowerCase().replace(/_/g, '-');
  return PROVIDER_ALIASES[normalized] ?? normalized;
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
