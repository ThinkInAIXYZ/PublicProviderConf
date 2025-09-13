import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';

export class AnthropicProvider implements Provider {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async fetchModels(): Promise<ModelInfo[]> {
    // TODO: Implement actual API call
    console.log(`Fetching Anthropic models with API key: ${this.apiKey ? 'provided' : 'not provided'}`);
    return [];
  }

  providerId(): string {
    return 'anthropic';
  }

  providerName(): string {
    return 'Anthropic';
  }
}