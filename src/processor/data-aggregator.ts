import { ProviderInfo } from '../models/provider-info';
import { AggregatedOutput, AggregatedProvider } from '../output/types';

export class DataAggregator {
  /**
   * Aggregate multiple providers into a single output structure
   */
  static aggregateProviders(providers: ProviderInfo[]): AggregatedOutput {
    const aggregatedProviders: Record<string, AggregatedProvider> = {};
    let totalModels = 0;

    for (const provider of providers) {
      const aggregatedProvider: AggregatedProvider = {
        providerId: provider.provider,
        providerName: provider.providerName,
        lastUpdated: provider.lastUpdated,
        models: provider.models,
        api: provider.api,
        doc: provider.doc,
        description: provider.description,
        tags: provider.tags,
        metadata: provider.metadata,
      };
      
      totalModels += provider.models.length;
      aggregatedProviders[provider.provider] = aggregatedProvider;
    }

    return {
      version: '1.0.0',
      generatedAt: new Date(),
      totalModels,
      providers: aggregatedProviders,
    };
  }

  /**
   * Get statistics about the aggregated data
   */
  static getProviderStatistics(providers: ProviderInfo[]): {
    totalProviders: number;
    totalModels: number;
    averageModelsPerProvider: number;
    providersWithMostModels: string;
    providersWithLeastModels: string;
  } {
    if (providers.length === 0) {
      return {
        totalProviders: 0,
        totalModels: 0,
        averageModelsPerProvider: 0,
        providersWithMostModels: '',
        providersWithLeastModels: '',
      };
    }

    const totalModels = providers.reduce((sum, p) => sum + p.models.length, 0);
    const averageModelsPerProvider = totalModels / providers.length;
    
    const sortedByModelCount = [...providers].sort((a, b) => b.models.length - a.models.length);
    const providersWithMostModels = sortedByModelCount[0]?.providerName || '';
    const providersWithLeastModels = sortedByModelCount[sortedByModelCount.length - 1]?.providerName || '';

    return {
      totalProviders: providers.length,
      totalModels,
      averageModelsPerProvider: Math.round(averageModelsPerProvider * 100) / 100,
      providersWithMostModels,
      providersWithLeastModels,
    };
  }

  /**
   * Filter providers by minimum number of models
   */
  static filterProvidersByMinModels(providers: ProviderInfo[], minModels: number): ProviderInfo[] {
    return providers.filter(provider => provider.models.length >= minModels);
  }

  /**
   * Get all unique model capabilities across all providers
   */
  static getUniqueCapabilities(providers: ProviderInfo[]): {
    vision: number;
    functionCall: number;
    reasoning: number;
    totalModels: number;
  } {
    let visionCount = 0;
    let functionCallCount = 0;
    let reasoningCount = 0;
    let totalModels = 0;

    for (const provider of providers) {
      for (const model of provider.models) {
        totalModels++;
        if (model.vision) visionCount++;
        if (model.functionCall) functionCallCount++;
        if (model.reasoning) reasoningCount++;
      }
    }

    return {
      vision: visionCount,
      functionCall: functionCallCount,
      reasoning: reasoningCount,
      totalModels,
    };
  }
}
