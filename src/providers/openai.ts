import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';

export class OpenAIProvider implements Provider {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async fetchModels(): Promise<ModelInfo[]> {
    // TODO: Implement actual API call
    console.log(`Fetching OpenAI models with API key: ${this.apiKey ? 'provided' : 'not provided'}`);
    return [];
  }

  providerId(): string {
    return 'openai';
  }

  providerName(): string {
    return 'OpenAI';
  }
}