"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterProvider = void 0;
class OpenRouterProvider {
    apiUrl;
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
    }
    async fetchModels() {
        // TODO: Implement actual API call
        console.log(`Fetching OpenRouter models from: ${this.apiUrl}`);
        return [];
    }
    providerId() {
        return 'openrouter';
    }
    providerName() {
        return 'OpenRouter';
    }
}
exports.OpenRouterProvider = OpenRouterProvider;
//# sourceMappingURL=openrouter.js.map