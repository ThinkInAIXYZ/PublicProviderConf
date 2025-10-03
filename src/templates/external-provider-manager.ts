import axios, { AxiosInstance } from 'axios';
import { createModelInfo, ModelInfo, ModelType } from '../models/model-info';
import { createProviderInfo } from '../models/provider-info';
import { ModelsDevProvider, createModelsDevProvider } from '../models/models-dev';

interface ExternalProviderSource {
  id: string;
  load(): Promise<ModelsDevProvider | null>;
}

interface AiHubMixModel {
  model?: string;
  developer?: string;
  developer_id?: number;
  provider_id?: number;
  model_name?: string;
  model_ratio?: number;
  cache_ratio?: number;
  completion_ratio?: number;
  img_price_config?: string;
  billing_config?: string;
  desc?: string;
  desc_en?: string;
  order?: number;
  flag?: number;
  context_length?: string | number | null;
  input_images?: string | number | null;
  input_audios?: string | number | null;
  latency?: number;
  throughput?: number;
  usage?: string;
  usage_en?: string;
  modalities?: string;
  features?: string;
  tags?: string;
  types?: string;
  display_input?: string;
  display_output?: string;
  parameters?: unknown[];
}

interface AiHubMixResponse {
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

function parseNumericFlag(value?: string | number | null): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function parseTokenCount(value?: string | number | null): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  const normalized = String(value).trim().toLowerCase().replace(/,/g, '');
  if (!normalized) {
    return 0;
  }

  const match = normalized.match(/^(\d+(?:\.\d+)?)(\s*[kmb])?/);
  if (!match) {
    return 0;
  }

  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) {
    return 0;
  }

  const unit = match[2]?.trim();
  switch (unit) {
    case 'k':
      return Math.round(amount * 1_000);
    case 'm':
      return Math.round(amount * 1_000_000);
    case 'b':
      return Math.round(amount * 1_000_000_000);
    default:
      return Math.round(amount);
  }
}

function determineModelType(typeValues: string[]): ModelType {
  const normalized = typeValues.map(value => value.toLowerCase());

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

function inferVision(modalities: string[], inputImages?: string | number | null): boolean {
  if (modalities.some(value => value.includes('image') || value.includes('video'))) {
    return true;
  }
  if (parseNumericFlag(inputImages)) {
    return true;
  }
  return false;
}

function inferFunctionCall(features: string[]): boolean {
  return features.some(value => value.includes('function') || value.includes('tool'));
}

function inferReasoning(features: string[], tags: string[]): boolean {
  return (
    features.some(value => value.includes('reason') || value.includes('think')) ||
    tags.some(value => value.includes('reason'))
  );
}

function buildModelMetadata(
  model: AiHubMixModel,
  features: string[],
  tags: string[],
  modalities: string[],
  types: string[],
  contextLength: number,
): Record<string, unknown> | undefined {
  const metadata: Record<string, unknown> = {};

  if (model.developer) {
    metadata.developer = model.developer;
  }
  if (typeof model.developer_id === 'number') {
    metadata.developerId = model.developer_id;
  }
  if (typeof model.provider_id === 'number') {
    metadata.providerId = model.provider_id;
  }
  if (typeof model.model_ratio === 'number') {
    metadata.modelRatio = model.model_ratio;
  }
  if (typeof model.cache_ratio === 'number') {
    metadata.cacheRatio = model.cache_ratio;
  }
  if (typeof model.completion_ratio === 'number') {
    metadata.completionRatio = model.completion_ratio;
  }
  if (model.desc) {
    metadata.description = model.desc;
  }
  if (model.desc_en) {
    metadata.descriptionEn = model.desc_en;
  }
  if (typeof model.order === 'number') {
    metadata.order = model.order;
  }
  if (typeof model.flag === 'number') {
    metadata.flag = model.flag;
  }
  if (model.usage) {
    metadata.usage = model.usage;
  }
  if (model.usage_en) {
    metadata.usageEn = model.usage_en;
  }
  if (model.display_input) {
    metadata.displayInput = model.display_input;
  }
  if (model.display_output) {
    metadata.displayOutput = model.display_output;
  }
  if (model.billing_config) {
    metadata.billingConfig = model.billing_config;
  }
  if (model.img_price_config) {
    metadata.imagePriceConfig = model.img_price_config;
  }
  if (model.parameters && model.parameters.length > 0) {
    metadata.parameters = model.parameters;
  }
  if (model.context_length && !contextLength) {
    metadata.contextLengthRaw = model.context_length;
  }
  if (features.length > 0) {
    metadata.features = features;
  }
  if (tags.length > 0) {
    metadata.tags = tags;
  }
  if (modalities.length > 0) {
    metadata.modalities = modalities;
  }
  if (types.length > 0) {
    metadata.typeHints = types;
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

class AiHubMixSource implements ExternalProviderSource {
  readonly id = 'aihubmix';
  private client: AxiosInstance;

  constructor(private readonly apiUrl: string = 'https://aihubmix.com/call/mdl_info') {
    this.client = axios.create({ timeout: 30_000 });
  }

  private convertModel(rawModel: AiHubMixModel): ModelInfo | null {
    const id = rawModel.model?.trim();
    if (!id) {
      return null;
    }

    const name = rawModel.model_name?.trim() || id;
    const features = parseList(rawModel.features);
    const tags = parseList(rawModel.tags);
    const modalities = parseList(rawModel.modalities);
    const types = parseList(rawModel.types);

    const contextLength = parseTokenCount(rawModel.context_length);
    const maxTokens = contextLength > 0 ? contextLength : 0;

    const modelType = determineModelType(types);
    const vision = inferVision(modalities, rawModel.input_images);
    const functionCall = inferFunctionCall(features);
    const reasoning = inferReasoning(features, tags);

    const metadata = buildModelMetadata(rawModel, features, tags, modalities, types, contextLength);

    const modalitiesInfo = modalities.length > 0 ? { input: modalities, output: modalities } : undefined;

    const overrides: Partial<ModelInfo> = {};
    if (metadata) {
      overrides.metadata = metadata;
    }
    if (modalitiesInfo) {
      overrides.modalities = modalitiesInfo;
    }

    return createModelInfo(
      id,
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

  async load(): Promise<ModelsDevProvider | null> {
    try {
      const response = await this.client.get<AiHubMixResponse>(this.apiUrl);
      if (!response.data?.success) {
        console.warn('⚠️  AIHubMix API returned an unsuccessful response.');
        return null;
      }

      const models: ModelInfo[] = [];
      const seen = new Set<string>();

      for (const rawModel of response.data.data ?? []) {
        const converted = this.convertModel(rawModel);
        if (!converted) {
          continue;
        }
        if (seen.has(converted.id)) {
          continue;
        }
        seen.add(converted.id);
        models.push(converted);
      }

      if (models.length === 0) {
        console.warn('⚠️  AIHubMix API returned no models after normalization.');
        return null;
      }

      const providerInfo = createProviderInfo('aihubmix', 'AIHubMix', models, {
        api: this.apiUrl,
        metadata: {
          upstream: 'aihubmix-api',
          fetchedAt: new Date().toISOString(),
          modelCount: models.length,
        },
      });

      return createModelsDevProvider(providerInfo);
    } catch (error) {
      console.error(
        '❌ Failed to load AIHubMix models:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return null;
    }
  }
}

export class ExternalProviderManager {
  constructor(private readonly sources: ExternalProviderSource[] = [new AiHubMixSource()]) {}

  async loadAllProviders(): Promise<Map<string, ModelsDevProvider>> {
    const providers = new Map<string, ModelsDevProvider>();

    for (const source of this.sources) {
      try {
        const provider = await source.load();
        if (!provider) {
          continue;
        }
        providers.set(source.id, provider);
      } catch (error) {
        console.error(
          `❌ Failed to load external provider ${source.id}:`,
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }

    return providers;
  }
}

export { AiHubMixSource };
