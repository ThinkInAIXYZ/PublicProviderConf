import { fetch } from 'undici';
import { Provider } from './Provider';
import { createModelInfo, ModelInfo, ModelType } from '../models/model-info';

interface JiekouModel {
  id?: string;
  title?: string | null;
  display_name?: string | null;
  description?: string | null;
  context_size?: number | null;
  max_output_tokens?: number | null;
  features?: string[] | null;
  input_modalities?: string[] | null;
  output_modalities?: string[] | null;
  model_type?: string | null;
  status?: number | null;
  tags?: string[] | null;
  endpoints?: string[] | null;
  input_token_price_per_m?: number | string | null;
  output_token_price_per_m?: number | string | null;
  [key: string]: unknown;
}

interface JiekouResponse {
  data?: JiekouModel[] | null;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function normalizeList(values?: string[] | null): string[] | undefined {
  if (!Array.isArray(values)) {
    return undefined;
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const normalizedValue = String(value ?? '')
      .trim()
      .toLowerCase();
    if (!normalizedValue || seen.has(normalizedValue)) {
      continue;
    }
    seen.add(normalizedValue);
    normalized.push(normalizedValue);
  }

  return normalized.length > 0 ? normalized : undefined;
}

function hasVisionCapability({
  input,
  output,
  features,
}: {
  input?: string[];
  output?: string[];
  features?: string[];
}): boolean {
  const modalityValues = [...(input ?? []), ...(output ?? [])];
  if (modalityValues.some(value => value.includes('image') || value.includes('vision'))) {
    return true;
  }

  if (features?.some(value => value.includes('vision') || value.includes('image') || value.includes('video'))) {
    return true;
  }

  return false;
}

function determineModelType(modelType?: string | null, modelId?: string): ModelType {
  const normalizedType = (modelType ?? '').trim().toLowerCase();
  switch (normalizedType) {
    case 'completion':
      return ModelType.Completion;
    case 'embedding':
      return ModelType.Embedding;
    case 'image':
    case 'image_generation':
      return ModelType.ImageGeneration;
    case 'audio':
      return ModelType.Audio;
    case 'chat':
    default:
      break;
  }

  const normalizedId = (modelId ?? '').toLowerCase();
  if (normalizedId.includes('embed')) {
    return ModelType.Embedding;
  }
  if (normalizedId.includes('image') || normalizedId.includes('vision')) {
    return ModelType.ImageGeneration;
  }
  if (normalizedId.includes('audio') || normalizedId.includes('speech')) {
    return ModelType.Audio;
  }

  return ModelType.Chat;
}

function mapModel(model: JiekouModel): ModelInfo | null {
  const id = (model.id ?? '').trim();
  if (!id) {
    return null;
  }
  if (model.status !== null && model.status !== undefined && model.status !== 1) {
    return null;
  }

  const name = (model.display_name ?? model.title ?? id).trim() || id;
  const contextLength = toNumber(model.context_size) ?? 0;
  const maxTokens = toNumber(model.max_output_tokens) ?? contextLength;

  const inputModalities = normalizeList(model.input_modalities);
  const outputModalities = normalizeList(model.output_modalities);
  const features = normalizeList(model.features);
  const vision = hasVisionCapability({ input: inputModalities, output: outputModalities, features });

  const functionCall = features?.includes('function-calling') ?? false;
  const reasoning = features?.includes('reasoning') ?? false;

  const metadata: Record<string, unknown> = {};
  if (model.description) {
    metadata.description = String(model.description).trim();
  }
  if (Array.isArray(model.tags) && model.tags.length > 0) {
    metadata.tags = model.tags;
  }
  if (Array.isArray(model.endpoints) && model.endpoints.length > 0) {
    metadata.endpoints = model.endpoints;
  }
  if (features && features.length > 0) {
    metadata.features = features;
  }
  const inputPrice = toNumber(model.input_token_price_per_m);
  const outputPrice = toNumber(model.output_token_price_per_m);
  if (inputPrice !== undefined || outputPrice !== undefined) {
    const pricing: Record<string, number> = {};
    if (inputPrice !== undefined) {
      pricing.inputPerM = inputPrice;
    }
    if (outputPrice !== undefined) {
      pricing.outputPerM = outputPrice;
    }
    metadata.pricing = pricing;
  }

  const overrides: Partial<Omit<ModelInfo, 'id' | 'name' | 'contextLength' | 'maxTokens' | 'vision' | 'functionCall' | 'reasoning' | 'type'>> = {};
  if (inputModalities || outputModalities) {
    overrides.modalities = { input: inputModalities, output: outputModalities };
  }
  if (Object.keys(metadata).length > 0) {
    overrides.metadata = metadata;
  }

  return createModelInfo(
    id,
    name,
    contextLength,
    maxTokens,
    vision,
    functionCall,
    reasoning,
    determineModelType(model.model_type, id),
    overrides,
  );
}

export class JiekouProvider implements Provider {
  constructor(private readonly apiUrl: string) {}

  async fetchModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        console.warn(`⚠️  Jiekou request failed with status ${response.status}`);
        return [];
      }

      const json = (await response.json()) as JiekouResponse;
      const models = Array.isArray(json?.data) ? json.data : [];
      return models.map(mapModel).filter((model): model is ModelInfo => model !== null);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn('⚠️  Failed to fetch Jiekou models, returning empty list', reason);
      return [];
    }
  }

  providerId(): string {
    return 'jiekou';
  }

  providerName(): string {
    return 'Jiekou';
  }
}
