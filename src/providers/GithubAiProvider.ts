import axios, { AxiosInstance } from 'axios';
import { Provider } from './Provider';
import { ModelInfo, ModelInfoBuilder, ModelType } from '../types/ModelInfo';

interface GithubAiModel {
  id?: string;
  name: string;
  friendly_name?: string;
  display_name?: string;
  summary?: string;
  description?: string;
  version?: string;
  model_version?: number;
  publisher?: string;
  capabilities?: {
    vision?: boolean;
    function_calling?: boolean;
    chat_completion?: boolean;
    text_completion?: boolean;
    embeddings?: boolean;
  };
  model_family?: string;
  task?: string;
}

interface GithubAiResponse {
  models: GithubAiModel[];
}

export class GithubAiProvider implements Provider {
  private apiUrl: string;
  private client: AxiosInstance;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
    this.client = axios.create();
  }

  private convertModel(model: GithubAiModel): ModelInfo | null {
    // Skip models with missing required fields
    const displayName = model.friendly_name || model.display_name || model.name;
    const modelId = model.id || model.name;
    
    if (!model.name || !displayName) {
      return null;
    }
    
    const vision = model.capabilities?.vision || false;
    const functionCall = model.capabilities?.function_calling || false;
    const reasoning = false; // GitHub AI models don't explicitly advertise reasoning capabilities
    
    let modelType: ModelType;
    if (model.task === 'embeddings' || model.capabilities?.embeddings) {
      modelType = ModelType.Embedding;
    } else if (model.task === 'text-completion' || model.capabilities?.text_completion) {
      modelType = ModelType.Completion;
    } else {
      modelType = ModelType.Chat;
    }

    // Estimate context length and max tokens based on model family
    let contextLength: number;
    let maxTokens: number;

    if (model.name.includes('llama') && model.name.includes('70b')) {
      contextLength = 128000;
      maxTokens = 4096;
    } else if (model.name.includes('llama') && model.name.includes('8b')) {
      contextLength = 128000;
      maxTokens = 4096;
    } else if (model.name.includes('phi')) {
      contextLength = 128000;
      maxTokens = 4096;
    } else if (model.name.includes('mistral')) {
      contextLength = 32768;
      maxTokens = 4096;
    } else {
      contextLength = 4096;
      maxTokens = 2048;
    }

    return ModelInfoBuilder.create(
      modelId,
      displayName,
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
        console.warn('⚠️  GitHub AI API response structure unexpected, returning empty model list');
        return [];
      }
      
      return models.map(model => this.convertModel(model)).filter((model): model is ModelInfo => model !== null);
    } catch (error) {
      console.warn('⚠️  Failed to fetch GitHub AI models, returning empty list');
      return [];
    }
  }

  providerId(): string {
    return 'github_ai';
  }

  providerName(): string {
    return 'GitHub AI Models';
  }
}