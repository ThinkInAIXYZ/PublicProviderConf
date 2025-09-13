import axios, { AxiosInstance } from 'axios';
import { Provider } from './Provider';
import { ModelInfo, ModelInfoBuilder, ModelType } from '../types/ModelInfo';

interface VercelModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  max_completion_tokens?: number;
  capabilities?: {
    vision?: boolean;
    function_calling?: boolean;
    reasoning?: boolean;
  };
}

interface VercelResponse {
  models: VercelModel[];
}

export class VercelProvider implements Provider {
  private apiUrl: string;
  private client: AxiosInstance;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
    this.client = axios.create();
  }

  private convertModel(model: VercelModel): ModelInfo {
    const vision = model.capabilities?.vision || false;
    const functionCall = model.capabilities?.function_calling || false;
    const reasoning = model.capabilities?.reasoning || false;
    
    let modelType: ModelType;
    if (model.id.includes('dall-e') || model.id.includes('stable-diffusion')) {
      modelType = ModelType.ImageGeneration;
    } else if (model.id.includes('embedding')) {
      modelType = ModelType.Embedding;
    } else if (model.id.includes('whisper') || model.id.includes('tts')) {
      modelType = ModelType.Audio;
    } else {
      modelType = ModelType.Chat;
    }

    const contextLength = model.context_length || 4096;
    const maxTokens = model.max_completion_tokens || Math.min(contextLength, 4096);

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
      const response = await this.client.get<any>(this.apiUrl);
      
      // Handle different response structures
      const models = response.data.models || response.data.data || response.data;
      
      if (!Array.isArray(models)) {
        console.warn('⚠️  Vercel API response structure unexpected, returning empty model list');
        return [];
      }
      
      return models.map(model => this.convertModel(model));
    } catch (error) {
      console.warn('⚠️  Failed to fetch Vercel models, returning empty list');
      return [];
    }
  }

  providerId(): string {
    return 'vercel';
  }

  providerName(): string {
    return 'Vercel AI Gateway';
  }
}