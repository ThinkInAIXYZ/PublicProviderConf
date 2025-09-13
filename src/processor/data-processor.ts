import { ProviderInfo } from '../models/provider-info';
import { DataNormalizer } from './data-normalizer';
import { DataAggregator } from './data-aggregator';
import { JsonValidator } from '../output/json-validator';

export interface ProcessingOptions {
  /** Whether to normalize model names and data */
  normalize?: boolean;
  /** Whether to remove duplicate models within providers */
  deduplicate?: boolean;
  /** Whether to sort models alphabetically */
  sort?: boolean;
  /** Whether to validate data integrity */
  validate?: boolean;
  /** Minimum number of models required per provider */
  minModelsPerProvider?: number;
}

export class DataProcessor {
  constructor() {}
  
  /**
   * Process providers with configurable options
   */
  async processProviders(
    providers: ProviderInfo[], 
    options: ProcessingOptions = {}
  ): Promise<ProviderInfo[]> {
    const {
      normalize = true,
      deduplicate = true,
      sort = true,
      validate = true,
      minModelsPerProvider = 0,
    } = options;

    let processedProviders = [...providers];

    // Filter providers by minimum model count
    if (minModelsPerProvider > 0) {
      processedProviders = DataAggregator.filterProvidersByMinModels(
        processedProviders, 
        minModelsPerProvider
      );
    }

    // Process each provider
    for (const provider of processedProviders) {
      // Validate provider data if requested
      if (validate) {
        try {
          JsonValidator.validateProviderInfo(provider);
        } catch (error) {
          console.warn(`⚠️  Validation failed for provider ${provider.provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          continue;
        }
      }

      // Normalize, deduplicate, and sort models
      if (normalize || deduplicate || sort) {
        let models = provider.models;
        
        if (normalize) {
          models = DataNormalizer.normalizeModels(models);
        }
        
        if (deduplicate) {
          models = DataNormalizer.deduplicateModels(models);
        }
        
        if (sort) {
          models = DataNormalizer.sortModelsByName(models);
        }
        
        provider.models = models;
      }
    }

    return processedProviders;
  }

  /**
   * Process providers with all normalization steps
   */
  async processProvidersWithNormalization(providers: ProviderInfo[]): Promise<ProviderInfo[]> {
    return this.processProviders(providers, {
      normalize: true,
      deduplicate: true,
      sort: true,
      validate: true,
    });
  }

  /**
   * Process and get statistics
   */
  async processAndGetStatistics(providers: ProviderInfo[]): Promise<{
    processed: ProviderInfo[];
    statistics: ReturnType<typeof DataAggregator.getProviderStatistics>;
    capabilities: ReturnType<typeof DataAggregator.getUniqueCapabilities>;
  }> {
    const processed = await this.processProviders(providers);
    const statistics = DataAggregator.getProviderStatistics(processed);
    const capabilities = DataAggregator.getUniqueCapabilities(processed);

    return {
      processed,
      statistics,
      capabilities,
    };
  }

  /**
   * Validate all providers in the list
   */
  validateProviders(providers: ProviderInfo[]): { valid: ProviderInfo[]; invalid: Array<{ provider: ProviderInfo; error: string }> } {
    const valid: ProviderInfo[] = [];
    const invalid: Array<{ provider: ProviderInfo; error: string }> = [];

    for (const provider of providers) {
      try {
        JsonValidator.validateProviderInfo(provider);
        valid.push(provider);
      } catch (error) {
        invalid.push({
          provider,
          error: error instanceof Error ? error.message : 'Unknown validation error'
        });
      }
    }

    return { valid, invalid };
  }
}