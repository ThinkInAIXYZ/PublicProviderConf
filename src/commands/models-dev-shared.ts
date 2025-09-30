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

export function normalizeProviderId(providerId: string): string {
  const normalized = providerId.trim().toLowerCase().replace(/_/g, '-');
  return PROVIDER_ALIASES[normalized] ?? normalized;
}

export function createProvider(providerId: string, config: ProviderConfig): Provider | null {
  try {
    switch (providerId) {
      case 'ppinfra':
        return new providers.PPInfraProvider(config.apiUrl);

      case 'openrouter':
        return new providers.OpenRouterProvider(config.apiUrl);

      case 'gemini':
        return new providers.GeminiProvider(config.getApiKey());

      case 'vercel':
        return new providers.VercelProvider(config.apiUrl);

      case 'github_ai':
        return new providers.GithubAiProvider(config.apiUrl);

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

      case 'deepseek':
        return new providers.DeepSeekProvider();

      case 'openai':
        return new providers.OpenAIProvider(config.getApiKey());

      case 'anthropic':
        return new providers.AnthropicProvider(config.getApiKey());

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

export function createProvidersFromConfig(
  config: AppConfig,
  excludedProviders: Set<string> = new Set(),
): Provider[] {
  const providerInstances: Provider[] = [];

  for (const [providerId, providerConfig] of Object.entries(config.providers)) {
    const normalizedId = normalizeProviderId(providerId);
    if (excludedProviders.has(normalizedId)) {
      console.log(`ℹ️  Skipping ${providerId}: already available via models.dev or templates`);
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
  for (const [key, provider] of Object.entries(baseProvidersRecord)) {
    const normalizedId = normalizeProviderId(getModelsDevProviderId(provider));
    const template = templatesById.get(normalizedId);
    if (template) {
      baseProvidersRecord[key] = mergeProviderWithTemplate(provider, template);
      templatesById.delete(normalizedId);
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

  return {
    baseDataWithTemplates,
    templatesById,
    existingProviderIds,
  };
}
