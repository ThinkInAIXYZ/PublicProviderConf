import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';

export class PPInfraProvider implements Provider {
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  async fetchModels(): Promise<ModelInfo[]> {
    // TODO: Implement actual API call
    console.log(`Fetching PPInfra models from: ${this.apiUrl}`);
    return [];
  }

  providerId(): string {
    return 'ppinfra';
  }

  providerName(): string {
    return 'PPInfra';
  }
}