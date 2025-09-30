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
};

const MODELS_DEV_ONLY_PROVIDERS = new Set([
  'openrouter',
  'vercel',
  'anthropic',
  'deepseek',
  'github_ai',
  'github-models',
  'gemini',
  'openai',
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
  const inModelsDev = sources.modelsDev.has(providerId);
  const inTemplates = sources.templates.has(providerId);

  if (inModelsDev && inTemplates) {
    return 'covered by models.dev dataset and manual template';
  }
  if (inModelsDev) {
    return 'already provided by models.dev dataset';
  }
  if (inTemplates) {
    return 'served via manual template';
  }
  return 'already included in combined dataset';
}

export function createProvidersFromConfig(
  config: AppConfig,
  excludedProviders: Set<string> = new Set(),
  exclusionSources?: ExclusionSources,
): Provider[] {
  const providerInstances: Provider[] = [];

  for (const [providerId, providerConfig] of Object.entries(config.providers)) {
    const normalizedId = normalizeProviderId(providerId);
    if (excludedProviders.has(normalizedId)) {
      if (exclusionSources) {
        const reason = getExclusionReason(normalizedId, exclusionSources);
        console.log(`ℹ️  Skipping ${providerId}: ${reason}`);
      } else {
        console.log(`ℹ️  Skipping ${providerId}: already available via models.dev or templates`);
      }
      continue;
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

  for (const template of loadedTemplates.values()) {
    const normalizedId = normalizeProviderId(template.id);
    templatesById.set(normalizedId, template);
    templateIds.push(normalizedId);
  }

  const baseProvidersRecord = providersToRecord(baseData.providers);
  const modelsDevIds = new Set<string>();
  for (const [key, provider] of Object.entries(baseProvidersRecord)) {
    const normalizedId = normalizeProviderId(getModelsDevProviderId(provider));
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
