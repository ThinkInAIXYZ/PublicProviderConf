"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VercelProvider = void 0;
class VercelProvider {
    apiUrl;
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
    }
    async fetchModels() {
        // TODO: Implement actual API call
        console.log(`Fetching Vercel models from: ${this.apiUrl}`);
        return [];
    }
    providerId() {
        return 'vercel';
    }
    providerName() {
        return 'Vercel AI Gateway';
    }
}
exports.VercelProvider = VercelProvider;
//# sourceMappingURL=vercel.js.map