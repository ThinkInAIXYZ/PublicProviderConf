import { Provider } from '../providers/Provider';
import { ProviderInfo, createProviderInfo } from '../models/provider-info';

export class DataFetcher {
  private providers: Provider[];

  constructor() {
    this.providers = [];
  }

  addProvider(provider: Provider): void {
    this.providers.push(provider);
  }

  async fetchAll(): Promise<ProviderInfo[]> {
    const results: ProviderInfo[] = [];
    
    for (const provider of this.providers) {
      try {
        const models = await provider.fetchModels();
        console.log(`Fetched ${models.length} models from ${provider.providerId()}`);
        
        const providerInfo = createProviderInfo(
          provider.providerId(),
          provider.providerName(),
          models
        );
        
        results.push(providerInfo);
      } catch (error) {
        console.error(`Failed to fetch models from ${provider.providerId()}:`, 
          error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    return results;
  }
}