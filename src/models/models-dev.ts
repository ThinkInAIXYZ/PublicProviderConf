import { ModelInfo, ModelType } from './model-info';
import { ProviderInfo } from './provider-info';

export interface ModelsDevModalities {
  input?: string[];
  output?: string[];
  [key: string]: string[] | undefined;
}

export interface ModelsDevCost {
  input?: number;
  output?: number;
  cache_read?: number;
  cache_write?: number;
  [key: string]: number | undefined;
}

export interface ModelsDevLimit {
  context?: number;
  output?: number;
  requests_per_minute?: number;
  requests_per_day?: number;
  [key: string]: number | undefined;
}

export interface ReasoningBudget {
  default?: number;
  min?: number;
  max?: number;
}

export interface ReasoningConfig {
  supported?: boolean;
  default?: boolean;
  budget?: ReasoningBudget;
  effort?: 'minimal' | 'low' | 'medium' | 'high';
  verbosity?: 'low' | 'medium' | 'high';
}

export interface SearchConfig {
  supported?: boolean;
  default?: boolean;
  forced_search?: boolean;
  search_strategy?: 'turbo' | 'max';
}

export interface ModelsDevModel {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  type?: string;
  context_length?: number;
  max_output_tokens?: number;
  attachment?: boolean;
  reasoning?: ReasoningConfig;
  temperature?: boolean;
  tool_call?: boolean;
  knowledge?: string;
  release_date?: string;
  last_updated?: string;
  open_weights?: boolean;
  experimental?: boolean;
  modalities?: ModelsDevModalities;
  cost?: ModelsDevCost;
  limit?: ModelsDevLimit;
  metadata?: Record<string, unknown>;
  provider?: string;
  vision?: boolean;
  search?: SearchConfig;
}

export interface ModelsDevProvider {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  updated_at?: string;
  models: ModelsDevModel[];
  api?: string;
  doc?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
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
  const toolCall = model.toolCall ?? model.functionCall;

  return {
    id: model.id,
    name: model.name,
    display_name: model.name,
    type: convertModelType(model.type),
    context_length: model.contextLength,
    max_output_tokens: model.maxTokens,
    attachment: model.attachment,
    reasoning: { supported: model.reasoning, default: model.reasoning ? true : undefined },
    temperature: model.temperature,
    tool_call: toolCall,
    knowledge: model.knowledge,
    release_date: model.releaseDate,
    last_updated: model.lastUpdated,
    open_weights: model.openWeights,
    experimental: model.experimental,
    modalities: model.modalities
      ? {
          ...model.modalities,
        }
      : undefined,
    cost: model.cost
      ? {
          input: model.cost.input,
          output: model.cost.output,
          cache_read: model.cost.cacheRead,
          cache_write: model.cost.cacheWrite,
        }
      : undefined,
    limit: model.limit
      ? {
          context: model.limit.context,
          output: model.limit.output,
          requests_per_minute: model.limit.requestsPerMinute,
          requests_per_day: model.limit.requestsPerDay,
        }
      : undefined,
    metadata: {
      ...model.metadata,
      source: 'public-provider-conf',
    },
    vision: model.vision,
  };
}

export function createModelsDevProvider(provider: ProviderInfo): ModelsDevProvider {
  return {
    id: provider.provider,
    name: provider.providerName,
    display_name: provider.providerName,
    description: provider.description,
    updated_at: provider.lastUpdated.toISOString(),
    api: provider.api,
    doc: provider.doc,
    tags: provider.tags,
    models: provider.models.map(createModelsDevModel),
    metadata: {
      ...provider.metadata,
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
