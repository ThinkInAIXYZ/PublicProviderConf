import { ProviderInfo } from '../models/provider-info';
import { AggregatedOutput } from '../output/types';
export declare class DataAggregator {
    /**
     * Aggregate multiple providers into a single output structure
     */
    static aggregateProviders(providers: ProviderInfo[]): AggregatedOutput;
    /**
     * Get statistics about the aggregated data
     */
    static getProviderStatistics(providers: ProviderInfo[]): {
        totalProviders: number;
        totalModels: number;
        averageModelsPerProvider: number;
        providersWithMostModels: string;
        providersWithLeastModels: string;
    };
    /**
     * Filter providers by minimum number of models
     */
    static filterProvidersByMinModels(providers: ProviderInfo[], minModels: number): ProviderInfo[];
    /**
     * Get all unique model capabilities across all providers
     */
    static getUniqueCapabilities(providers: ProviderInfo[]): {
        vision: number;
        functionCall: number;
        reasoning: number;
        totalModels: number;
    };
}
//# sourceMappingURL=data-aggregator.d.ts.map