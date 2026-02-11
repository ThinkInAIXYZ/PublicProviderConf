import { ModelInfo, ModelType } from './model-info';
import { normalizeToggleInPlace, ToggleConfig } from '../utils/toggles';
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
  family?: string;
  type?: string;
  context_length?: number;
  max_output_tokens?: number;
  attachment?: boolean;
  reasoning?: ReasoningConfig | boolean;
  temperature?: boolean;
  tool_call?: boolean;
  structured_output?: boolean;
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
  search?: SearchConfig | boolean;
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
    case ModelType.Embedding:
      return 'embedding';
    case ModelType.ImageGeneration:
      return 'image-generation';
    case ModelType.Audio:
      return 'audio';
    case ModelType.Rerank:
      return 'rerank';
    default:
      return 'unknown';
  }
}

function toModelsDevReasoning(reasoning: ModelInfo['reasoning']): ReasoningConfig | undefined {
  if (typeof reasoning === 'boolean') {
    return reasoning ? { supported: true, default: true } : { supported: false };
  }

  if (reasoning && typeof reasoning === 'object') {
    const normalized: ReasoningConfig = { ...reasoning };
    normalizeToggleInPlace(normalized as unknown as ToggleConfig);
    return normalized;
  }

  return undefined;
}

/**
 * Normalizes limit values by replacing 0 with 8192 for context and output fields.
 * This ensures that limit values are never 0 in the final output.
 */
export function normalizeLimitValues(limit: ModelsDevLimit): ModelsDevLimit {
  const normalized: ModelsDevLimit = { ...limit };
  
  if (normalized.context === 0) {
    normalized.context = 8192;
  }
  
  if (normalized.output === 0) {
    normalized.output = 8192;
  }
  
  return normalized;
}

export function createModelsDevModel(model: ModelInfo): ModelsDevModel {
  const toolCall = model.toolCall ?? model.functionCall;
  const reasoning = toModelsDevReasoning(model.reasoning);

  const baseLimit: ModelsDevLimit = model.limit
    ? {
        context: model.limit.context,
        output: model.limit.output,
        requests_per_minute: model.limit.requestsPerMinute,
        requests_per_day: model.limit.requestsPerDay,
      }
    : {};

  const limit: ModelsDevLimit = normalizeLimitValues({
    ...baseLimit,
    context: model.contextLength,
    output: model.maxTokens,
  });

  const result: ModelsDevModel = {
    id: model.id,
    name: model.name,
    display_name: model.name,
    type: convertModelType(model.type),
    context_length: model.contextLength,
    max_output_tokens: model.maxTokens,
    attachment: model.attachment,
    reasoning,
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
    limit,
    metadata: {
      ...model.metadata,
      source: 'public-provider-conf',
    },
    vision: model.vision,
  };

  delete result.context_length;
  delete result.max_output_tokens;

  return result;
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

function normalizeTypeValue(type?: string): string | undefined {
  if (!type) {
    return undefined;
  }
  const normalized = type.trim().toLowerCase();
  return normalized ? normalized : undefined;
}

function normalizeModelId(rawId?: string): string | null {
  const trimmed = rawId?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.toLowerCase();
}

function normalizeModelMatchKey(rawId?: string): string | null {
  const trimmed = rawId?.trim();
  if (!trimmed) {
    return null;
  }
  const slashIndex = trimmed.lastIndexOf('/');
  const modelId = slashIndex >= 0 ? trimmed.slice(slashIndex + 1) : trimmed;
  const withoutFree = modelId.replace(/-free$/i, '').trim();
  if (!withoutFree) {
    return null;
  }
  return withoutFree.toLowerCase();
}

function addTypeMapping(
  map: Map<string, string>,
  conflicts: Set<string>,
  key: string | null,
  type: string,
): void {
  if (!key || conflicts.has(key)) {
    return;
  }
  const existing = map.get(key);
  if (!existing) {
    map.set(key, type);
    return;
  }
  if (existing !== type) {
    map.delete(key);
    conflicts.add(key);
  }
}

const AIHUBMIX_TYPE_WHITELIST = new Set(['image-generation', 'embedding', 'rerank']);
const EMBEDDING_TYPE_PREFIXES = ['qwen3-embedding', 'bge-m3', 'bge-large-en', 'bge-large-zh'];
const RERANK_TYPE_PREFIXES = ['qwen3-reranker', 'bge-reranker'];

export function buildAiHubMixTypeMap(aihubmix?: ModelsDevProvider): Map<string, string> {
  const map = new Map<string, string>();
  const conflicts = new Set<string>();

  if (!aihubmix) {
    return map;
  }

  for (const model of aihubmix.models ?? []) {
    const normalizedType = normalizeTypeValue(model.type);
    if (!normalizedType || !AIHUBMIX_TYPE_WHITELIST.has(normalizedType)) {
      continue;
    }

    const rawId = model.id ?? model.name;
    const fullKey = normalizeModelId(rawId);
    addTypeMapping(map, conflicts, fullKey, normalizedType);

    const matchKey = normalizeModelMatchKey(rawId);
    if (matchKey && matchKey !== fullKey) {
      addTypeMapping(map, conflicts, matchKey, normalizedType);
    }
  }

  return map;
}

function resolveAiHubMixType(typeMap: Map<string, string>, modelId?: string): string | undefined {
  if (!modelId) {
    return undefined;
  }

  const fullKey = normalizeModelId(modelId);
  if (fullKey && typeMap.has(fullKey)) {
    return typeMap.get(fullKey);
  }

  const matchKey = normalizeModelMatchKey(modelId);
  if (matchKey && typeMap.has(matchKey)) {
    return typeMap.get(matchKey);
  }

  return undefined;
}

function resolveWhitelistedType(modelId?: string): string | undefined {
  if (!modelId) {
    return undefined;
  }

  const matchKey = normalizeModelMatchKey(modelId);
  const normalized = matchKey ?? normalizeModelId(modelId);
  if (!normalized) {
    return undefined;
  }

  const lowered = normalized.toLowerCase();
  if (EMBEDDING_TYPE_PREFIXES.some(prefix => lowered.startsWith(prefix))) {
    return 'embedding';
  }
  if (RERANK_TYPE_PREFIXES.some(prefix => lowered.startsWith(prefix))) {
    return 'rerank';
  }

  return undefined;
}

export function applyModelsDevTypeFallbacks(
  data: ModelsDevApiResponse,
  aihubmixTypeMap?: Map<string, string>,
): void {
  const providers = normalizeProvidersList(data.providers);
  const typeMap = aihubmixTypeMap ?? new Map<string, string>();

  for (const provider of providers) {
    for (const model of provider.models ?? []) {
      const matchId = model.id ?? model.name;
      const whitelistedType = resolveWhitelistedType(matchId);
      if (whitelistedType) {
        model.type = whitelistedType;
        continue;
      }

      const normalizedType = normalizeTypeValue(model.type);
      if (normalizedType) {
        continue;
      }

      const resolvedType =
        resolveAiHubMixType(typeMap, matchId) ?? resolveWhitelistedType(matchId);
      model.type = resolvedType ?? 'chat';
    }
  }
}

export function normalizeModelsDevModelFormat(model: ModelsDevModel): ModelsDevModel {
  const normalized = { ...model } as ModelsDevModel & Record<string, unknown>;
  const limit: ModelsDevLimit = { ...(normalized.limit ?? {}) };
  let touchedLimit = false;

  if (normalized.context_length !== undefined) {
    limit.context = normalized.context_length;
    delete normalized.context_length;
    touchedLimit = true;
  }

  if (normalized.max_output_tokens !== undefined) {
    limit.output = normalized.max_output_tokens;
    delete normalized.max_output_tokens;
    touchedLimit = true;
  }

  if (touchedLimit || normalized.limit) {
    normalized.limit = normalizeLimitValues(limit);
  }

  return normalized as ModelsDevModel;
}
