import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';

export class GroqProvider implements Provider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchModels(): Promise<ModelInfo[]> {
    // TODO: Implement actual API call
    console.log('Fetching Groq models with API key');
    return [];
  }

  providerId(): string {
    return 'groq';
  }

  providerName(): string {
    return 'Groq';
  }
}