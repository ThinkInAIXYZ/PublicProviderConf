import axios, { AxiosInstance } from 'axios';
import { Provider } from './Provider';
import { ModelInfo, ModelInfoBuilder, ModelType } from '../types/ModelInfo';

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  architecture?: {
    modality: string;
  };
  capabilities?: {
    vision?: boolean;
    function_calling?: boolean;
    reasoning?: boolean;
  };
}

interface OpenRouterResponse {
  data: OpenRouterModel[];
}

export class OpenRouterProvider implements Provider {
  private apiUrl: string;
  private client: AxiosInstance;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
    this.client = axios.create();
  }

  private convertModel(model: OpenRouterModel): ModelInfo {
    const vision = model.capabilities?.vision || false;
    const functionCall = model.capabilities?.function_calling || false;
    const reasoning = model.capabilities?.reasoning || false;
    
    let modelType: ModelType;
    if (model.architecture?.modality === 'text-to-image') {
      modelType = ModelType.ImageGeneration;
    } else if (model.id.includes('embedding')) {
      modelType = ModelType.Embedding;
    } else if (model.id.includes('whisper') || model.id.includes('tts')) {
      modelType = ModelType.Audio;
    } else if (model.id.includes('instruct')) {
      modelType = ModelType.Completion;
    } else {
      modelType = ModelType.Chat;
    }

    const contextLength = model.context_length || 4096;
    const maxTokens = Math.min(contextLength, 4096); // Default to reasonable output limit

    return ModelInfoBuilder.create(
      model.id,
      model.name,
      contextLength,
      maxTokens,
      vision,
      functionCall,
      reasoning,
      modelType
    );
  }

  async fetchModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.client.get<OpenRouterResponse>(this.apiUrl);
      
      return response.data.data.map(model => this.convertModel(model));
    } catch (error) {
      throw new Error(`Failed to fetch OpenRouter models: ${error}`);
    }
  }

  providerId(): string {
    return 'openrouter';
  }

  providerName(): string {
    return 'OpenRouter';
  }
}