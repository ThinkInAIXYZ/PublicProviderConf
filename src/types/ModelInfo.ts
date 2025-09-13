export enum ModelType {
  Chat = 'chat',
  Completion = 'completion',
  Embedding = 'embedding',
  ImageGeneration = 'imageGeneration',
  Audio = 'audio',
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
}

export class ModelInfoBuilder {
  static create(
    id: string,
    name: string,
    contextLength: number,
    maxTokens: number,
    vision: boolean,
    functionCall: boolean,
    reasoning: boolean,
    modelType: ModelType
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
    };
  }
}