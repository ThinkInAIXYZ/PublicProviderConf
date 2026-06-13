import type { ModelCost, ModelInfo, ModelLimit, ModelModalities, ModelType, ReasoningOption } from '../models/model-info';
import type { ExtraCapabilities, LegacyInterleaved } from '../models/extra-capabilities';

export type CustomProviderSourceId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'kimi'
  | 'deepseek'
  | 'zhipu'
  | 'minimax';

export interface CustomProviderSeedCatalog {
  updatedAt: string;
  maxModels: number;
  provider: {
    id: string;
    name: string;
    description?: string;
    doc?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  };
  sources: CustomProviderSourceSeed[];
}

export interface CustomProviderSourceSeed {
  id: CustomProviderSourceId;
  displayName: string;
  apiUrl?: string;
  apiKeyEnv?: string;
  docs?: string[];
  models: CustomProviderModelSeed[];
}

export interface CustomProviderModelSeed {
  id: string;
  name?: string;
  family?: string;
  contextLength: number;
  maxTokens: number;
  vision: boolean;
  functionCall: boolean;
  reasoning: ModelInfo['reasoning'];
  type?: ModelType | string;
  attachment?: boolean;
  temperature?: boolean;
  toolCall?: boolean;
  structuredOutput?: boolean;
  reasoningOptions?: ReasoningOption[];
  knowledge?: string;
  releaseDate?: string;
  lastUpdated?: string;
  openWeights?: boolean;
  experimental?: boolean;
  modalities?: ModelModalities;
  cost?: ModelCost;
  limit?: ModelLimit;
  metadata?: Record<string, unknown>;
  interleaved?: LegacyInterleaved;
  extraCapabilities?: ExtraCapabilities;
  selectionRank?: number;
}

export interface OfficialModelReference {
  id: string;
  name?: string;
  createdAt?: string;
  contextLength?: number;
  maxTokens?: number;
  supportedGenerationMethods?: string[];
  raw?: Record<string, unknown>;
}

export interface SourceDiscoveryResult {
  source: CustomProviderSourceSeed;
  models: ModelInfo[];
  summary: CustomProviderSourceSummary;
}

export interface CustomProviderSourceSummary {
  sourceId: CustomProviderSourceId;
  displayName: string;
  selected: number;
  apiModels: number;
  seedModels: number;
  status: 'api' | 'seed' | 'api-error';
  message?: string;
}

export interface ModelsAdapter {
  sourceId(): CustomProviderSourceId;
  displayName(): string;
  fetchModels(): Promise<SourceDiscoveryResult>;
}

export interface CustomProviderSynthesisResult {
  models: ModelInfo[];
  summaries: CustomProviderSourceSummary[];
  catalog: CustomProviderSeedCatalog;
}
