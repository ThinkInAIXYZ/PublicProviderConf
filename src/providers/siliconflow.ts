import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';

export class SiliconFlowProvider implements Provider {
  constructor() {
    // Template-based, no API key required
  }

  async fetchModels(): Promise<ModelInfo[]> {
    // TODO: Implement template-based model generation
    console.log('Fetching SiliconFlow models via template');
    return [];
  }

  providerId(): string {
    return 'siliconflow';
  }

  providerName(): string {
    return 'SiliconFlow';
  }
}