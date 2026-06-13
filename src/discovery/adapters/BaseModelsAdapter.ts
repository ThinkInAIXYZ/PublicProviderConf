import { createModelInfo, ModelInfo, ModelType } from '../../models/model-info';
import type {
  CustomProviderModelSeed,
  CustomProviderSourceSeed,
  CustomProviderSourceSummary,
  ModelsAdapter,
  OfficialModelReference,
  SourceDiscoveryResult,
} from '../types';

function cloneArray<T>(value?: T[]): T[] | undefined {
  return value ? [...value] : undefined;
}

function toModelType(value?: string | ModelType): ModelType {
  if (!value) {
    return ModelType.Chat;
  }

  if (Object.values(ModelType).includes(value as ModelType)) {
    return value as ModelType;
  }

  const normalized = String(value).trim().toLowerCase();
  switch (normalized) {
    case 'embedding':
      return ModelType.Embedding;
    case 'image-generation':
    case 'imagegeneration':
      return ModelType.ImageGeneration;
    case 'audio':
      return ModelType.Audio;
    case 'rerank':
      return ModelType.Rerank;
    default:
      return ModelType.Chat;
  }
}

function cloneReasoning(reasoning: ModelInfo['reasoning']): ModelInfo['reasoning'] {
  return typeof reasoning === 'object' && reasoning !== null ? { ...reasoning } : reasoning;
}

function createModelFromSeed(
  source: CustomProviderSourceSeed,
  seed: CustomProviderModelSeed,
  apiReference: OfficialModelReference | undefined,
  status: CustomProviderSourceSummary['status'],
): ModelInfo {
  const contextLength = apiReference?.contextLength ?? seed.contextLength;
  const maxTokens = apiReference?.maxTokens ?? seed.maxTokens;
  const sourceMetadata: Record<string, unknown> = {
    ...seed.metadata,
    sourceProvider: source.id,
    sourceProviderName: source.displayName,
    sourceApiUrl: source.apiUrl,
    sourceDocs: cloneArray(source.docs),
    sourceStatus: status,
    apiListed: Boolean(apiReference),
  };

  if (apiReference?.createdAt) {
    sourceMetadata.apiCreatedAt = apiReference.createdAt;
  }
  if (apiReference?.supportedGenerationMethods?.length) {
    sourceMetadata.supportedGenerationMethods = [...apiReference.supportedGenerationMethods];
  }

  return createModelInfo(
    seed.id,
    seed.name ?? seed.id,
    contextLength,
    maxTokens,
    seed.vision,
    seed.functionCall,
    cloneReasoning(seed.reasoning),
    toModelType(seed.type),
    {
      attachment: seed.attachment,
      temperature: seed.temperature,
      toolCall: seed.toolCall,
      structuredOutput: seed.structuredOutput,
      knowledge: seed.knowledge,
      releaseDate: seed.releaseDate,
      lastUpdated: seed.lastUpdated,
      openWeights: seed.openWeights,
      experimental: seed.experimental,
      modalities: seed.modalities ? { ...seed.modalities } : undefined,
      cost: seed.cost ? { ...seed.cost } : undefined,
      limit: seed.limit ? { ...seed.limit, context: contextLength, output: maxTokens } : {
        context: contextLength,
        output: maxTokens,
      },
      metadata: sourceMetadata,
      interleaved: seed.interleaved === undefined
        ? undefined
        : typeof seed.interleaved === 'object'
          ? { ...seed.interleaved }
          : seed.interleaved,
      extraCapabilities: seed.extraCapabilities
        ? {
            ...seed.extraCapabilities,
            reasoning: seed.extraCapabilities.reasoning
              ? {
                  ...seed.extraCapabilities.reasoning,
                  effort_options: cloneArray(seed.extraCapabilities.reasoning.effort_options),
                  verbosity_options: cloneArray(seed.extraCapabilities.reasoning.verbosity_options),
                  level_options: cloneArray(seed.extraCapabilities.reasoning.level_options),
                  continuation: cloneArray(seed.extraCapabilities.reasoning.continuation),
                  notes: cloneArray(seed.extraCapabilities.reasoning.notes),
                  budget: seed.extraCapabilities.reasoning.budget
                    ? { ...seed.extraCapabilities.reasoning.budget }
                    : undefined,
                }
              : undefined,
          }
        : undefined,
    },
  );
}

function sortSeeds(seeds: CustomProviderModelSeed[]): CustomProviderModelSeed[] {
  return [...seeds].sort((a, b) => {
    const rankDelta = (a.selectionRank ?? Number.MAX_SAFE_INTEGER) -
      (b.selectionRank ?? Number.MAX_SAFE_INTEGER);
    return rankDelta !== 0 ? rankDelta : a.id.localeCompare(b.id);
  });
}

export abstract class SeededModelsAdapter implements ModelsAdapter {
  constructor(protected readonly source: CustomProviderSourceSeed) {}

  sourceId(): CustomProviderSourceSeed['id'] {
    return this.source.id;
  }

  displayName(): string {
    return this.source.displayName;
  }

  async fetchModels(): Promise<SourceDiscoveryResult> {
    let apiReferences: OfficialModelReference[] = [];
    let status: CustomProviderSourceSummary['status'] = 'seed';
    let message: string | undefined;

    const apiKey = this.source.apiKeyEnv ? process.env[this.source.apiKeyEnv] : undefined;
    if (apiKey) {
      try {
        apiReferences = await this.fetchOfficialModels(apiKey);
        status = 'api';
      } catch (error) {
        status = 'api-error';
        message = error instanceof Error ? error.message : String(error);
      }
    } else if (this.source.apiKeyEnv) {
      message = `Missing ${this.source.apiKeyEnv}`;
    }

    const referencesById = new Map(apiReferences.map(model => [model.id, model]));
    const models = sortSeeds(this.source.models).map(seed =>
      createModelFromSeed(this.source, seed, referencesById.get(seed.id), status),
    );

    return {
      source: this.source,
      models,
      summary: {
        sourceId: this.source.id,
        displayName: this.source.displayName,
        selected: models.length,
        apiModels: apiReferences.length,
        seedModels: this.source.models.length,
        status,
        message,
      },
    };
  }

  protected async fetchOfficialModels(_apiKey: string): Promise<OfficialModelReference[]> {
    return [];
  }
}
