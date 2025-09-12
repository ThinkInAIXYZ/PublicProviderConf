import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';

export class OpenRouterProvider implements Provider {
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  async fetchModels(): Promise<ModelInfo[]> {
    // TODO: Implement actual API call
    console.log(`Fetching OpenRouter models from: ${this.apiUrl}`);
    return [];
  }

  providerId(): string {
    return 'openrouter';
  }

  providerName(): string {
    return 'OpenRouter';
  }
}