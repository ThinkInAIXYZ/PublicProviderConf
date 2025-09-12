"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepSeekProvider = void 0;
class DeepSeekProvider {
    constructor() {
        // No API key required, uses web scraping
    }
    async fetchModels() {
        // TODO: Implement web scraping
        console.log('Fetching DeepSeek models via web scraping');
        return [];
    }
    providerId() {
        return 'deepseek';
    }
    providerName() {
        return 'DeepSeek';
    }
}
exports.DeepSeekProvider = DeepSeekProvider;
//# sourceMappingURL=deepseek.js.map