"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaProvider = void 0;
class OllamaProvider {
    constructor() {
        // Template-based, no API key required
    }
    async fetchModels() {
        // TODO: Implement template-based model generation
        console.log('Fetching Ollama models via template');
        return [];
    }
    providerId() {
        return 'ollama';
    }
    providerName() {
        return 'Ollama';
    }
}
exports.OllamaProvider = OllamaProvider;
//# sourceMappingURL=ollama.js.map