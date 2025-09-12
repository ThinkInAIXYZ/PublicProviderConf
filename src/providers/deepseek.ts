import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';

export class DeepSeekProvider implements Provider {
  constructor() {
    // No API key required, uses web scraping
  }

  async fetchModels(): Promise<ModelInfo[]> {
    // TODO: Implement web scraping
    console.log('Fetching DeepSeek models via web scraping');
    return [];
  }

  providerId(): string {
    return 'deepseek';
  }

  providerName(): string {
    return 'DeepSeek';
  }
}