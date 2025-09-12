"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataProcessor = void 0;
const data_normalizer_1 = require("./data-normalizer");
const data_aggregator_1 = require("./data-aggregator");
const json_validator_1 = require("../output/json-validator");
class DataProcessor {
    constructor() { }
    /**
     * Process providers with configurable options
     */
    async processProviders(providers, options = {}) {
        const { normalize = true, deduplicate = true, sort = true, validate = true, minModelsPerProvider = 0, } = options;
        let processedProviders = [...providers];
        // Filter providers by minimum model count
        if (minModelsPerProvider > 0) {
            processedProviders = data_aggregator_1.DataAggregator.filterProvidersByMinModels(processedProviders, minModelsPerProvider);
        }
        // Process each provider
        for (const provider of processedProviders) {
            // Validate provider data if requested
            if (validate) {
                try {
                    json_validator_1.JsonValidator.validateProviderInfo(provider);
                }
                catch (error) {
                    console.warn(`⚠️  Validation failed for provider ${provider.provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    continue;
                }
            }
            // Normalize, deduplicate, and sort models
            if (normalize || deduplicate || sort) {
                let models = provider.models;
                if (normalize) {
                    models = data_normalizer_1.DataNormalizer.normalizeModels(models);
                }
                if (deduplicate) {
                    models = data_normalizer_1.DataNormalizer.deduplicateModels(models);
                }
                if (sort) {
                    models = data_normalizer_1.DataNormalizer.sortModelsByName(models);
                }
                provider.models = models;
            }
        }
        return processedProviders;
    }
    /**
     * Process providers with all normalization steps
     */
    async processProvidersWithNormalization(providers) {
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
    async processAndGetStatistics(providers) {
        const processed = await this.processProviders(providers);
        const statistics = data_aggregator_1.DataAggregator.getProviderStatistics(processed);
        const capabilities = data_aggregator_1.DataAggregator.getUniqueCapabilities(processed);
        return {
            processed,
            statistics,
            capabilities,
        };
    }
    /**
     * Validate all providers in the list
     */
    validateProviders(providers) {
        const valid = [];
        const invalid = [];
        for (const provider of providers) {
            try {
                json_validator_1.JsonValidator.validateProviderInfo(provider);
                valid.push(provider);
            }
            catch (error) {
                invalid.push({
                    provider,
                    error: error instanceof Error ? error.message : 'Unknown validation error'
                });
            }
        }
        return { valid, invalid };
    }
}
exports.DataProcessor = DataProcessor;
//# sourceMappingURL=data-processor.js.map