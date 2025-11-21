import axios, { AxiosInstance } from 'axios';
import { Provider } from './Provider';
import { createModelInfo, ModelInfo, ModelType } from '../models/model-info';

interface PPInfraModel {
  id: string;
  display_name: string;
  context_size: number;
  max_output_tokens: number;
  features: string[];
  model_type: string;
}

interface PPInfraResponse {
  data: PPInfraModel[];
}

export class PPInfraProvider implements Provider {
  private apiUrl: string;
  private client: AxiosInstance;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
    this.client = axios.create();
  }

  private convertModel(model: PPInfraModel): ModelInfo {
    const vision = model.features?.some(f => f.includes('vision') || f.includes('image')) || false;
    const functionCall = model.features?.some(f => f.includes('function') || f.includes('tool')) || false;
    const reasoning = model.features?.some(f => f.includes('reasoning') || f.includes('thinking')) || false;

    let modelType: ModelType;
    switch (model.model_type) {
      case 'chat':
      case 'completion':
        modelType = ModelType.Chat;
        break;
      case 'embedding':
        modelType = ModelType.Embedding;
        break;
      default:
        modelType = ModelType.Chat;
    }

    return createModelInfo(
      model.id,
      model.display_name,
      model.context_size,
      model.max_output_tokens,
      vision,
      functionCall,
      reasoning,
      modelType
    );
  }

  async fetchModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.client.get<PPInfraResponse>(this.apiUrl);
      return response.data.data.map(model => this.convertModel(model));
    } catch (error) {
      throw new Error(`Failed to fetch PPInfra models: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  providerId(): string {
    return 'ppinfra';
  }

  providerName(): string {
    return 'PPInfra';
  }
}
