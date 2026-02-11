import { fetch, ProxyAgent, type Dispatcher } from 'undici';
import { Provider } from './Provider';
import {
  createModelInfo,
  ModelCost,
  ModelInfo,
  ModelLimit,
  ModelModalities,
  ModelType,
} from '../models/model-info';
import {
  ModelsDevApiResponse,
  ModelsDevModel,
  ModelsDevProvider,
  normalizeProvidersList,
} from '../models/models-dev';
import { normalizeToggleInPlace, type ToggleConfig } from '../utils/toggles';

interface ZenMuxPricingEntry {
  value?: number | string | null;
  unit?: string | null;
  currency?: string | null;
}

interface ZenMuxPricings {
  completion?: ZenMuxPricingEntry[] | null;
  prompt?: ZenMuxPricingEntry[] | null;
  input_cache_read?: ZenMuxPricingEntry[] | null;
  input_cache_write?: ZenMuxPricingEntry[] | null;
  [key: string]: ZenMuxPricingEntry[] | null | undefined;
}

interface ZenMuxCapabilities {
  reasoning?: boolean;
  tool_calling?: boolean;
  function_calling?: boolean;
  vision?: boolean;
  attachments?: boolean;
}

interface ZenMuxModel {
  id?: string | null;
  display_name?: string | null;
  owned_by?: string | null;
  created?: number | null;
  input_modalities?: string[] | null;
  output_modalities?: string[] | null;
  capabilities?: ZenMuxCapabilities | null;
  context_length?: number | string | null;
  max_output_tokens?: number | string | null;
  max_tokens?: number | string | null;
  pricings?: ZenMuxPricings | null;
  [key: string]: unknown;
}

interface ZenMuxResponse {
  data?: ZenMuxModel[];
  object?: string;
}

type MatchSource = 'models.dev' | 'aihubmix' | 'zenmux';

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const normalized = trimmed.replace(/,/g, '');
    const parsed = Number(normalized);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function normalizeModalities(values?: string[] | null): string[] | undefined {
  if (!Array.isArray(values)) {
    return undefined;
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const entry = String(value ?? '').trim().toLowerCase();
    if (!entry || seen.has(entry)) {
      continue;
    }
    seen.add(entry);
    normalized.push(entry);
  }
  return normalized.length > 0 ? normalized : undefined;
}

function hasVisionCapability(modalities?: ModelModalities): boolean {
  const input = modalities?.input ?? [];
  const output = modalities?.output ?? [];
  return [...input, ...output].some(value => value.includes('image') || value.includes('vision'));
}

function determineModelType(id: string, modalities?: ModelModalities): ModelType {
  const normalizedId = id.toLowerCase();
  if (normalizedId.includes('embedding')) {
    return ModelType.Embedding;
  }
  if (normalizedId.includes('rerank')) {
    return ModelType.Rerank;
  }
  if (normalizedId.includes('image') || normalizedId.includes('diffusion')) {
    return ModelType.ImageGeneration;
  }
  if (normalizedId.includes('audio') || normalizedId.includes('speech') || normalizedId.includes('tts')) {
    return ModelType.Audio;
  }

  const output = modalities?.output ?? [];
  if (output.some(value => value.includes('image') || value.includes('video'))) {
    return ModelType.ImageGeneration;
  }
  if (output.some(value => value.includes('audio'))) {
    return ModelType.Audio;
  }

  return ModelType.Chat;
}

function parsePricingValue(list?: ZenMuxPricingEntry[] | null): number | undefined {
  if (!Array.isArray(list) || list.length === 0) {
    return undefined;
  }
  return toNumber(list[0]?.value);
}

function buildCost(pricings?: ZenMuxPricings | null): ModelCost | undefined {
  if (!pricings) {
    return undefined;
  }

  const input = parsePricingValue(pricings.prompt);
  const output = parsePricingValue(pricings.completion);
  const cacheRead = parsePricingValue(pricings.input_cache_read);
  const cacheWrite = parsePricingValue(pricings.input_cache_write);

  const cost: ModelCost = {};
  if (input !== undefined) {
    cost.input = input;
  }
  if (output !== undefined) {
    cost.output = output;
  }
  if (cacheRead !== undefined) {
    cost.cacheRead = cacheRead;
  }
  if (cacheWrite !== undefined) {
    cost.cacheWrite = cacheWrite;
  }

  return Object.keys(cost).length > 0 ? cost : undefined;
}

function normalizeReasoning(reasoning?: ModelsDevModel['reasoning']): ModelInfo['reasoning'] {
  if (typeof reasoning === 'boolean') {
    return reasoning;
  }
  if (reasoning && typeof reasoning === 'object') {
    const config: ToggleConfig = { ...(reasoning as ToggleConfig) };
    normalizeToggleInPlace(config);
    return config;
  }
  return false;
}

function convertCost(cost?: ModelsDevModel['cost']): ModelCost | undefined {
  if (!cost) {
    return undefined;
  }
  const converted: ModelCost = {};
  if (typeof cost.input === 'number') {
    converted.input = cost.input;
  }
  if (typeof cost.output === 'number') {
    converted.output = cost.output;
  }
  if (typeof cost.cache_read === 'number') {
    converted.cacheRead = cost.cache_read;
  }
  if (typeof cost.cache_write === 'number') {
    converted.cacheWrite = cost.cache_write;
  }
  return Object.keys(converted).length > 0 ? converted : undefined;
}

function convertLimit(limit?: ModelsDevModel['limit']): ModelLimit | undefined {
  if (!limit) {
    return undefined;
  }
  const converted: ModelLimit = {};
  if (typeof limit.context === 'number') {
    converted.context = limit.context;
  }
  if (typeof limit.output === 'number') {
    converted.output = limit.output;
  }
  if (typeof limit.requests_per_minute === 'number') {
    converted.requestsPerMinute = limit.requests_per_minute;
  }
  if (typeof limit.requests_per_day === 'number') {
    converted.requestsPerDay = limit.requests_per_day;
  }
  return Object.keys(converted).length > 0 ? converted : undefined;
}

function resolveTokenCounts(
  contextLength?: number,
  maxTokens?: number
): { contextLength: number; maxTokens: number } {
  let context = contextLength ?? 0;
  let max = maxTokens ?? 0;

  if (context <= 0 && max > 0) {
    context = max;
  }
  if (max <= 0 && context > 0) {
    max = context;
  }
  if (context <= 0) {
    context = 8192;
  }
  if (max <= 0) {
    max = context;
  }
  if (max > context) {
    max = context;
  }

  return { contextLength: context, maxTokens: max };
}

function mapModelsDevModel(
  model: ModelsDevModel,
  zenmuxId: string,
  nameOverride?: string,
): ModelInfo {
  const name = (nameOverride ?? model.display_name ?? model.name ?? zenmuxId).trim() || zenmuxId;

  const contextLengthRaw = toNumber(model.context_length ?? model.limit?.context);
  const maxTokensRaw = toNumber(model.max_output_tokens ?? model.limit?.output);
  const { contextLength, maxTokens } = resolveTokenCounts(contextLengthRaw, maxTokensRaw);

  const modalities: ModelModalities | undefined = model.modalities
    ? {
        input: model.modalities.input ? [...model.modalities.input] : undefined,
        output: model.modalities.output ? [...model.modalities.output] : undefined,
      }
    : undefined;

  const vision = typeof model.vision === 'boolean' ? model.vision : hasVisionCapability(modalities);
  const functionCall = Boolean(model.tool_call);
  const reasoning = normalizeReasoning(model.reasoning);

  const modelType = model.type
    ? determineModelType(model.type, modalities)
    : determineModelType(zenmuxId, modalities);

  const overrides: Partial<
    Omit<
      ModelInfo,
      'id' | 'name' | 'contextLength' | 'maxTokens' | 'vision' | 'functionCall' | 'reasoning' | 'type'
    >
  > = {};

  if (model.attachment !== undefined) {
    overrides.attachment = model.attachment;
  }
  if (model.temperature !== undefined) {
    overrides.temperature = model.temperature;
  }
  if (model.tool_call !== undefined) {
    overrides.toolCall = model.tool_call;
  }
  if (model.knowledge) {
    overrides.knowledge = model.knowledge;
  }
  if (model.release_date) {
    overrides.releaseDate = model.release_date;
  }
  if (model.last_updated) {
    overrides.lastUpdated = model.last_updated;
  }
  if (model.open_weights !== undefined) {
    overrides.openWeights = model.open_weights;
  }
  if (model.experimental !== undefined) {
    overrides.experimental = model.experimental;
  }
  if (modalities) {
    overrides.modalities = modalities;
  }
  const cost = convertCost(model.cost);
  if (cost) {
    overrides.cost = cost;
  }
  const limit = convertLimit(model.limit);
  if (limit) {
    overrides.limit = limit;
  }
  if (model.metadata) {
    overrides.metadata = { ...model.metadata };
  }

  return createModelInfo(
    zenmuxId,
    name,
    contextLength,
    maxTokens,
    vision,
    functionCall,
    reasoning,
    modelType,
    overrides,
  );
}

function parseZenMuxId(rawId: string): { owner?: string; matchKey: string } | null {
  const trimmed = rawId.trim();
  if (!trimmed) {
    return null;
  }
  const slashIndex = trimmed.lastIndexOf('/');
  const owner = slashIndex > 0 ? trimmed.slice(0, slashIndex) : undefined;
  const modelId = slashIndex >= 0 ? trimmed.slice(slashIndex + 1) : trimmed;
  const withoutFree = modelId.replace(/-free$/i, '').trim();
  if (!withoutFree) {
    return null;
  }
  return {
    owner: owner?.toLowerCase(),
    matchKey: withoutFree.toLowerCase(),
  };
}

function scoreMatch(candidateId: string, matchKey: string, owner?: string): number {
  const normalized = candidateId.toLowerCase();
  if (!normalized || !matchKey) {
    return 0;
  }
  if (owner && normalized === `${owner}/${matchKey}`) {
    return 4;
  }
  if (normalized === matchKey) {
    return 3;
  }
  if (normalized.endsWith(`/${matchKey}`)) {
    return 2;
  }
  if (normalized.includes(matchKey)) {
    return 1;
  }
  return 0;
}

function findBestMatch(
  providers: ModelsDevProvider[],
  matchKey: string,
  owner?: string,
): ModelsDevModel | null {
  let best: { score: number; model: ModelsDevModel; idLength: number } | null = null;

  for (const provider of providers) {
    for (const model of provider.models ?? []) {
      if (!model.id) {
        continue;
      }
      const score = scoreMatch(model.id, matchKey, owner);
      if (score === 0) {
        continue;
      }
      const idLength = model.id.length;
      if (!best || score > best.score || (score === best.score && idLength < best.idLength)) {
        best = { score, model, idLength };
      }
    }
  }

  return best?.model ?? null;
}

function createProxyDispatcher(): Dispatcher | undefined {
  const proxyUrl =
    process.env.HTTPS_PROXY ??
    process.env.https_proxy ??
    process.env.HTTP_PROXY ??
    process.env.http_proxy;

  if (!proxyUrl) {
    return undefined;
  }

  try {
    return new ProxyAgent(proxyUrl);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn('Warning: Failed to configure proxy for ZenMux provider:', reason);
    return undefined;
  }
}

export class ZenMuxProvider implements Provider {
  private readonly dispatcher?: Dispatcher;
  private readonly modelsDevProviders: ModelsDevProvider[];

  constructor(
    private readonly apiUrl: string,
    modelsDevData: ModelsDevApiResponse,
    private readonly aihubmixData?: ModelsDevProvider,
    private readonly timeoutMs = 30_000,
  ) {
    this.dispatcher = createProxyDispatcher();
    this.modelsDevProviders = normalizeProvidersList(modelsDevData.providers);
  }

  private matchModelId(rawId: string): { source: MatchSource; model?: ModelsDevModel } {
    const parsed = parseZenMuxId(rawId);
    if (!parsed) {
      return { source: 'zenmux' };
    }

    const modelsDevMatch = findBestMatch(this.modelsDevProviders, parsed.matchKey, parsed.owner);
    if (modelsDevMatch) {
      return { source: 'models.dev', model: modelsDevMatch };
    }

    if (this.aihubmixData?.models?.length) {
      const aihubmixMatch = findBestMatch([this.aihubmixData], parsed.matchKey, parsed.owner);
      if (aihubmixMatch) {
        return { source: 'aihubmix', model: aihubmixMatch };
      }
    }

    return { source: 'zenmux' };
  }

  private mapRawModel(raw: ZenMuxModel): { model: ModelInfo | null; source: MatchSource } {
    const id = (raw.id ?? '').trim();
    if (!id) {
      return { model: null, source: 'zenmux' };
    }

    const nameOverride = raw.display_name?.trim();
    const match = this.matchModelId(id);
    if (match.model) {
      return {
        model: mapModelsDevModel(match.model, id, nameOverride),
        source: match.source,
      };
    }

    const name = nameOverride || id;
    const inputModalities = normalizeModalities(raw.input_modalities);
    const outputModalities = normalizeModalities(raw.output_modalities);
    const modalities = inputModalities || outputModalities ? { input: inputModalities, output: outputModalities } : undefined;

    const contextLengthRaw = toNumber(raw.context_length);
    const maxTokensRaw = toNumber(raw.max_output_tokens ?? raw.max_tokens);
    const { contextLength, maxTokens } = resolveTokenCounts(contextLengthRaw, maxTokensRaw);

    const capabilities = raw.capabilities ?? undefined;
    const functionCall = Boolean(capabilities?.tool_calling || capabilities?.function_calling);
    const reasoning = Boolean(capabilities?.reasoning);
    const vision = Boolean(capabilities?.vision) || hasVisionCapability(modalities);

    const overrides: Partial<
      Omit<
        ModelInfo,
        'id' | 'name' | 'contextLength' | 'maxTokens' | 'vision' | 'functionCall' | 'reasoning' | 'type'
      >
    > = {};

    if (modalities) {
      overrides.modalities = modalities;
    }
    if (capabilities?.attachments !== undefined) {
      overrides.attachment = capabilities.attachments;
    }
    const cost = buildCost(raw.pricings);
    if (cost) {
      overrides.cost = cost;
    }

    const metadata: Record<string, unknown> = {};
    if (raw.owned_by) {
      metadata.ownedBy = raw.owned_by;
    }
    if (typeof raw.created === 'number') {
      metadata.created = raw.created;
    }
    if (Object.keys(metadata).length > 0) {
      overrides.metadata = metadata;
    }

    return {
      model: createModelInfo(
        id,
        name,
        contextLength,
        maxTokens,
        vision,
        functionCall,
        reasoning,
        determineModelType(id, modalities),
        overrides,
      ),
      source: 'zenmux',
    };
  }

  private async fetchRaw(): Promise<ZenMuxModel[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'GET',
        dispatcher: this.dispatcher,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'PublicProviderConf/1.0 (+https://github.com/ThinkInAIXYZ/PublicProviderConf)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const payload = (await response.json()) as ZenMuxResponse;
      return Array.isArray(payload?.data) ? payload.data : [];
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async fetchModels(): Promise<ModelInfo[]> {
    console.log('Fetching models from ZenMux API...');

    try {
      const rawModels = await this.fetchRaw();
      if (!rawModels.length) {
        console.log('ZenMux API returned no models.');
        return [];
      }

      const seen = new Set<string>();
      const models: ModelInfo[] = [];
      let matchedModelsDev = 0;
      let matchedAihubmix = 0;
      let unmatched = 0;

      for (const raw of rawModels) {
        const { model, source } = this.mapRawModel(raw);
        if (!model || seen.has(model.id)) {
          continue;
        }
        seen.add(model.id);
        models.push(model);

        if (source === 'models.dev') {
          matchedModelsDev += 1;
        } else if (source === 'aihubmix') {
          matchedAihubmix += 1;
        } else {
          unmatched += 1;
        }
      }

      console.log(
        `ZenMux models processed: ${models.length} total (${matchedModelsDev} models.dev, ${matchedAihubmix} aihubmix, ${unmatched} raw)`,
      );

      return models;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn('Warning: Failed to fetch ZenMux models, returning empty list:', reason);
      return [];
    }
  }

  providerId(): string {
    return 'zenmux';
  }

  providerName(): string {
    return 'ZenMux';
  }
}
