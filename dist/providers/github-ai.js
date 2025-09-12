"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubAiProvider = void 0;
class GithubAiProvider {
    apiUrl;
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
    }
    async fetchModels() {
        // TODO: Implement actual API call
        console.log(`Fetching GitHub AI models from: ${this.apiUrl}`);
        return [];
    }
    providerId() {
        return 'github_ai';
    }
    providerName() {
        return 'GitHub AI Models';
    }
}
exports.GithubAiProvider = GithubAiProvider;
//# sourceMappingURL=github-ai.js.map