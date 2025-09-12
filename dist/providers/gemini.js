"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiProvider = void 0;
class GeminiProvider {
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    async fetchModels() {
        // TODO: Implement actual API call/web scraping
        console.log(`Fetching Gemini models with API key: ${this.apiKey ? 'provided' : 'not provided'}`);
        return [];
    }
    providerId() {
        return 'gemini';
    }
    providerName() {
        return 'Google Gemini';
    }
}
exports.GeminiProvider = GeminiProvider;
//# sourceMappingURL=gemini.js.map