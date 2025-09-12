import { ProviderInfo } from '../models/provider-info';
import { DataAggregator } from './data-aggregator';
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
export declare class DataProcessor {
    constructor();
    /**
     * Process providers with configurable options
     */
    processProviders(providers: ProviderInfo[], options?: ProcessingOptions): Promise<ProviderInfo[]>;
    /**
     * Process providers with all normalization steps
     */
    processProvidersWithNormalization(providers: ProviderInfo[]): Promise<ProviderInfo[]>;
    /**
     * Process and get statistics
     */
    processAndGetStatistics(providers: ProviderInfo[]): Promise<{
        processed: ProviderInfo[];
        statistics: ReturnType<typeof DataAggregator.getProviderStatistics>;
        capabilities: ReturnType<typeof DataAggregator.getUniqueCapabilities>;
    }>;
    /**
     * Validate all providers in the list
     */
    validateProviders(providers: ProviderInfo[]): {
        valid: ProviderInfo[];
        invalid: Array<{
            provider: ProviderInfo;
            error: string;
        }>;
    };
}
//# sourceMappingURL=data-processor.d.ts.map