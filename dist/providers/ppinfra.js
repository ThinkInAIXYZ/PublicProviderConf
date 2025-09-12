"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PPInfraProvider = void 0;
class PPInfraProvider {
    apiUrl;
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
    }
    async fetchModels() {
        // TODO: Implement actual API call
        console.log(`Fetching PPInfra models from: ${this.apiUrl}`);
        return [];
    }
    providerId() {
        return 'ppinfra';
    }
    providerName() {
        return 'PPInfra';
    }
}
exports.PPInfraProvider = PPInfraProvider;
//# sourceMappingURL=ppinfra.js.map