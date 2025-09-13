import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';

export class VercelProvider implements Provider {
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  async fetchModels(): Promise<ModelInfo[]> {
    // TODO: Implement actual API call
    console.log(`Fetching Vercel models from: ${this.apiUrl}`);
    return [];
  }

  providerId(): string {
    return 'vercel';
  }

  providerName(): string {
    return 'Vercel AI Gateway';
  }
}