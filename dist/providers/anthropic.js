"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = void 0;
class AnthropicProvider {
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    async fetchModels() {
        // TODO: Implement actual API call
        console.log(`Fetching Anthropic models with API key: ${this.apiKey ? 'provided' : 'not provided'}`);
        return [];
    }
    providerId() {
        return 'anthropic';
    }
    providerName() {
        return 'Anthropic';
    }
}
exports.AnthropicProvider = AnthropicProvider;
//# sourceMappingURL=anthropic.js.map