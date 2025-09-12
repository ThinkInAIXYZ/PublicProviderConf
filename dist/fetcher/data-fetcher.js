"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataFetcher = void 0;
const provider_info_1 = require("../models/provider-info");
class DataFetcher {
    providers;
    constructor() {
        this.providers = [];
    }
    addProvider(provider) {
        this.providers.push(provider);
    }
    async fetchAll() {
        const results = [];
        for (const provider of this.providers) {
            try {
                const models = await provider.fetchModels();
                console.log(`Fetched ${models.length} models from ${provider.providerId()}`);
                const providerInfo = (0, provider_info_1.createProviderInfo)(provider.providerId(), provider.providerName(), models);
                results.push(providerInfo);
            }
            catch (error) {
                console.error(`Failed to fetch models from ${provider.providerId()}:`, error instanceof Error ? error.message : 'Unknown error');
            }
        }
        return results;
    }
}
exports.DataFetcher = DataFetcher;
//# sourceMappingURL=data-fetcher.js.map