import { ModelInfo } from '../models/model-info';
import { Provider } from './Provider';
import { synthesizeCustomProvider } from '../discovery/synthesizeCustomProvider';
import type { CustomProviderSeedCatalog } from '../discovery/types';

export class CustomProvider implements Provider {
  private catalog?: CustomProviderSeedCatalog;

  async fetchModels(): Promise<ModelInfo[]> {
    const result = await synthesizeCustomProvider();
    this.catalog = result.catalog;

    console.log('Custom provider generation:');
    for (const summary of result.summaries) {
      console.log(`  ${summary.displayName}: ${summary.selected} selected`);
    }

    return result.models;
  }

  providerId(): string {
    return 'custom-provider';
  }

  providerName(): string {
    return 'custom provider';
  }

  providerLastUpdated(): Date {
    return new Date(this.catalog?.updatedAt ?? '2026-04-23T00:00:00.000Z');
  }

  providerDescription(): string | undefined {
    return this.catalog?.provider.description;
  }

  providerDoc(): string | undefined {
    return this.catalog?.provider.doc;
  }

  providerMetadata(): Record<string, unknown> | undefined {
    return this.catalog?.provider.metadata;
  }

  providerTags(): string[] | undefined {
    return this.catalog?.provider.tags ? [...this.catalog.provider.tags] : undefined;
  }
}
