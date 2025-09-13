import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';

export class GithubAiProvider implements Provider {
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  async fetchModels(): Promise<ModelInfo[]> {
    // TODO: Implement actual API call
    console.log(`Fetching GitHub AI models from: ${this.apiUrl}`);
    return [];
  }

  providerId(): string {
    return 'github_ai';
  }

  providerName(): string {
    return 'GitHub AI Models';
  }
}