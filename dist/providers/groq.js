"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroqProvider = void 0;
class GroqProvider {
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    async fetchModels() {
        // TODO: Implement actual API call
        console.log('Fetching Groq models with API key');
        return [];
    }
    providerId() {
        return 'groq';
    }
    providerName() {
        return 'Groq';
    }
}
exports.GroqProvider = GroqProvider;
//# sourceMappingURL=groq.js.map