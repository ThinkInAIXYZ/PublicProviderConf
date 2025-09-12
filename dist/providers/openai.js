"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
class OpenAIProvider {
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    async fetchModels() {
        // TODO: Implement actual API call
        console.log(`Fetching OpenAI models with API key: ${this.apiKey ? 'provided' : 'not provided'}`);
        return [];
    }
    providerId() {
        return 'openai';
    }
    providerName() {
        return 'OpenAI';
    }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=openai.js.map