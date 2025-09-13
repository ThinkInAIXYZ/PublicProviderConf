import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';

export class GeminiProvider implements Provider {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async fetchModels(): Promise<ModelInfo[]> {
    // TODO: Implement actual API call/web scraping
    console.log(`Fetching Gemini models with API key: ${this.apiKey ? 'provided' : 'not provided'}`);
    return [];
  }

  providerId(): string {
    return 'gemini';
  }

  providerName(): string {
    return 'Google Gemini';
  }
}