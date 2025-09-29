import { ModelInfo, ModelType } from './model-info';
import { ProviderInfo } from './provider-info';

export interface ModelsDevCapabilities {
  vision?: boolean;
  function_calling?: boolean;
  reasoning?: boolean;
  [key: string]: unknown;
}

export interface ModelsDevModel {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  type?: string;
  context_length?: number;
  max_output_tokens?: number;
  capabilities?: ModelsDevCapabilities;
  metadata?: Record<string, unknown>;
}

export interface ModelsDevProvider {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  updated_at?: string;
  models: ModelsDevModel[];
  metadata?: Record<string, unknown>;
}

export interface ModelsDevApiResponse {
  providers: Record<string, ModelsDevProvider> | ModelsDevProvider[];
  version?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export function convertModelType(modelType: ModelType): string {
  switch (modelType) {
    case ModelType.Chat:
      return 'chat';
    case ModelType.Completion:
      return 'completion';
    case ModelType.Embedding:
      return 'embedding';
    case ModelType.ImageGeneration:
      return 'image-generation';
    case ModelType.Audio:
      return 'audio';
    default:
      return 'unknown';
  }
}

export function createModelsDevModel(model: ModelInfo): ModelsDevModel {
  return {
    id: model.id,
    name: model.name,
    display_name: model.name,
    type: convertModelType(model.type),
    context_length: model.contextLength,
    max_output_tokens: model.maxTokens,
    capabilities: {
      vision: model.vision,
      function_calling: model.functionCall,
      reasoning: model.reasoning,
    },
    metadata: {
      source: 'public-provider-conf',
    },
  };
}

export function createModelsDevProvider(provider: ProviderInfo): ModelsDevProvider {
  return {
    id: provider.provider,
    name: provider.providerName,
    display_name: provider.providerName,
    updated_at: provider.lastUpdated.toISOString(),
    models: provider.models.map(createModelsDevModel),
    metadata: {
      source: 'public-provider-conf',
    },
  };
}

export function getProviderId(provider: ModelsDevProvider): string {
  return provider.id || provider.name;
}

export function normalizeProvidersList(providers: ModelsDevApiResponse['providers']): ModelsDevProvider[] {
  if (Array.isArray(providers)) {
    return providers;
  }

  if (providers && typeof providers === 'object') {
    return Object.values(providers);
  }

  return [];
}

export function providersToRecord(
  providers: ModelsDevApiResponse['providers']
): Record<string, ModelsDevProvider> {
  if (Array.isArray(providers)) {
    const record: Record<string, ModelsDevProvider> = {};
    for (const provider of providers) {
      const id = getProviderId(provider);
      if (id) {
        record[id] = provider;
      }
    }
    return record;
  }

  if (providers && typeof providers === 'object') {
    return providers as Record<string, ModelsDevProvider>;
  }

  return {};
}

export function mergeProviders(
  existing: ModelsDevApiResponse['providers'],
  additions: ModelsDevProvider[]
): ModelsDevApiResponse['providers'] {
  if (Array.isArray(existing)) {
    const existingIds = new Set(existing.map(provider => getProviderId(provider)));
    const merged = [...existing];
    for (const provider of additions) {
      if (!existingIds.has(getProviderId(provider))) {
        merged.push(provider);
      }
    }
    return merged;
  }

  if (existing && typeof existing === 'object') {
    const record = { ...(existing as Record<string, ModelsDevProvider>) };
    for (const provider of additions) {
      const id = getProviderId(provider);
      if (!record[id]) {
        record[id] = provider;
      }
    }
    return record;
  }

  // If structure unknown, fallback to array
  return additions;
}
