import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';

export class OllamaProvider implements Provider {
  constructor() {
    // Template-based, no API key required
  }

  async fetchModels(): Promise<ModelInfo[]> {
    // TODO: Implement template-based model generation
    console.log('Fetching Ollama models via template');
    return [];
  }

  providerId(): string {
    return 'ollama';
  }

  providerName(): string {
    return 'Ollama';
  }
}