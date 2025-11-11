import axios, { AxiosInstance } from 'axios';
import { Provider } from './Provider';
import { createModelInfo, ModelCost, ModelInfo, ModelLimit, ModelType } from '../models/model-info';

interface AiHubMixPricing {
  input?: number | string | null;
  output?: number | string | null;
  cache_read?: number | string | null;
}

interface AiHubMixModel {
  model_id?: string;
  desc?: string;
  types?: string;
  features?: string;
  input_modalities?: string;
  max_output?: number | string | null;
  context_length?: number | string | null;
  pricing?: AiHubMixPricing;
  metadata?: Record<string, unknown>;
}

interface AiHubMixResponse {
  message?: string;
  success?: boolean;
  data?: AiHubMixModel[];
}

function parseList(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

function parseNumericValue(value?: string | number | null): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  const withoutCommas = normalized.replace(/,/g, '');
  const sanitized = withoutCommas.replace(/^[^0-9.]+/, '');
  const match = sanitized.match(/^([\d.]+)([kmb])?/i);
  if (match) {
    const amount = Number.parseFloat(match[1]);
    if (!Number.isFinite(amount)) {
      return null;
    }

    const suffix = match[2]?.toLowerCase();
    let multiplier = 1;
    switch (suffix) {
      case 'k':
        multiplier = 1_000;
        break;
      case 'm':
        multiplier = 1_000_000;
        break;
      case 'b':
        multiplier = 1_000_000_000;
        break;
    }

    return amount * multiplier;
  }

  const fallback = Number.parseFloat(withoutCommas);
  return Number.isFinite(fallback) ? fallback : null;
}

function parseTokenCount(value?: string | number | null): number {
  const parsed = parseNumericValue(value);
  if (parsed === null) {
    return 0;
  }

  return Math.max(0, Math.round(parsed));
}

function determineModelType(typeHints: string[]): ModelType {
  const normalized = typeHints.map(value => value.toLowerCase());

  if (normalized.some(value => value.includes('embedding'))) {
    return ModelType.Embedding;
  }
  if (
    normalized.some(value =>
      value.includes('image') || value.includes('vision') || value.includes('t2i'),
    )
  ) {
    return ModelType.ImageGeneration;
  }
  if (
    normalized.some(value =>
      value.includes('speech') || value.includes('tts') || value.includes('audio'),
    )
  ) {
    return ModelType.Audio;
  }
  if (normalized.some(value => value.includes('completion'))) {
    return ModelType.Completion;
  }

  return ModelType.Chat;
}

function buildCost(pricing?: AiHubMixPricing): ModelCost | undefined {
  if (!pricing) {
    return undefined;
  }

  const cost: ModelCost = {};
  const input = parseNumericValue(pricing.input);
  const output = parseNumericValue(pricing.output);
  const cacheRead = parseNumericValue(pricing.cache_read);

  if (input !== null) {
    cost.input = input;
  }
  if (output !== null) {
    cost.output = output;
  }
  if (cacheRead !== null) {
    cost.cacheRead = cacheRead;
  }

  return Object.keys(cost).length > 0 ? cost : undefined;
}

export class AiHubMixProvider implements Provider {
  private readonly client: AxiosInstance;

  constructor(private readonly apiUrl: string) {
    this.client = axios.create({ timeout: 30_000 });
  }

  private convertModel(raw: AiHubMixModel): ModelInfo | null {
    const id = raw.model_id?.trim();
    if (!id) {
      return null;
    }

    const contextLength = parseTokenCount(raw.context_length);
    const rawMax = parseTokenCount(raw.max_output);
    const maxTokens = Math.max(rawMax, contextLength);

    const features = parseList(raw.features);
    const types = parseList(raw.types);
    const modalities = parseList(raw.input_modalities);

    const vision = modalities.some(value =>
      value.toLowerCase().includes('image') || value.toLowerCase().includes('vision'),
    );
    const functionCall = features.some(value => {
      const normalized = value.toLowerCase();
      return normalized.includes('function_calling') || normalized.includes('tools') || normalized.includes('tool');
    });
    const reasoning = features.some(value => value.toLowerCase().includes('thinking'));

    const metadata: Record<string, unknown> = {};
    if (raw.desc) {
      metadata.description = raw.desc.trim();
    }
    if (types.length > 0) {
      metadata.typeHints = types;
    }
    if (features.length > 0) {
      metadata.features = features;
    }
    if (modalities.length > 0) {
      metadata.inputModalities = modalities;
    }
    if (raw.pricing) {
      metadata.pricing = raw.pricing;
    }

    const overrides: Partial<ModelInfo> = {};
    if (Object.keys(metadata).length > 0) {
      overrides.metadata = metadata;
    }

    if (modalities.length > 0) {
      overrides.modalities = { input: modalities };
    }

    const cost = buildCost(raw.pricing);
    if (cost) {
      overrides.cost = cost;
    }

    const limit: ModelLimit = {};
    if (contextLength > 0) {
      limit.context = contextLength;
    }
    if (rawMax > 0) {
      limit.output = rawMax;
    }
    if (Object.keys(limit).length > 0) {
      overrides.limit = limit;
    }

    const modelType = determineModelType(types);

    return createModelInfo(
      id,
      id,
      contextLength,
      maxTokens,
      vision,
      functionCall,
      reasoning,
      modelType,
      overrides,
    );
  }

  async fetchModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.client.get<AiHubMixResponse>(this.apiUrl);
      if (!response.data?.success) {
        throw new Error(response.data?.message ?? 'API returned unsuccessful response.');
      }

      const seen = new Set<string>();
      const models: ModelInfo[] = [];

      for (const rawModel of response.data.data ?? []) {
        const converted = this.convertModel(rawModel);
        if (!converted || seen.has(converted.id)) {
          continue;
        }
        seen.add(converted.id);
        models.push(converted);
      }

      return models;
    } catch (error) {
      throw new Error(
        `Failed to fetch AIHubMix models: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  providerId(): string {
    return 'aihubmix';
  }

  providerName(): string {
    return 'AIHubMix';
  }
}
