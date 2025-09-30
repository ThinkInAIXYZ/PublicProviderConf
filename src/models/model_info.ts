export enum ModelType {
  Chat = "chat",
  Completion = "completion",
  Embedding = "embedding",
  ImageGeneration = "imagegeneration",
  Audio = "audio",
}

export interface ModelModalities {
  input?: string[];
  output?: string[];
  [key: string]: string[] | undefined;
}

export interface ModelCost {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  [key: string]: number | undefined;
}

export interface ModelLimit {
  context?: number;
  output?: number;
  requestsPerMinute?: number;
  requestsPerDay?: number;
  [key: string]: number | undefined;
}

export interface ModelInfo {
  id: string;
  name: string;
  contextLength: number;
  maxTokens: number;
  vision: boolean;
  functionCall: boolean;
  reasoning: boolean;
  type: ModelType;
  attachment?: boolean;
  temperature?: boolean;
  toolCall?: boolean;
  knowledge?: string;
  releaseDate?: string;
  lastUpdated?: string;
  openWeights?: boolean;
  experimental?: boolean;
  modalities?: ModelModalities;
  cost?: ModelCost;
  limit?: ModelLimit;
  metadata?: Record<string, unknown>;
}

export function createModelInfo(
  id: string,
  name: string,
  contextLength: number,
  maxTokens: number,
  vision: boolean,
  functionCall: boolean,
  reasoning: boolean,
  modelType: ModelType,
  overrides: Partial<Omit<ModelInfo, 'id' | 'name' | 'contextLength' | 'maxTokens' | 'vision' | 'functionCall' | 'reasoning' | 'type'>> = {},
): ModelInfo {
  return {
    id,
    name,
    contextLength,
    maxTokens,
    vision,
    functionCall,
    reasoning,
    type: modelType,
    ...overrides,
  };
}
