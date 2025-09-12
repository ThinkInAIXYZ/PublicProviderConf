"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenfluxProvider = void 0;
class TokenfluxProvider {
    apiUrl;
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
    }
    async fetchModels() {
        // TODO: Implement actual API call
        console.log(`Fetching Tokenflux models from: ${this.apiUrl}`);
        return [];
    }
    providerId() {
        return 'tokenflux';
    }
    providerName() {
        return 'Tokenflux';
    }
}
exports.TokenfluxProvider = TokenfluxProvider;
//# sourceMappingURL=tokenflux.js.map