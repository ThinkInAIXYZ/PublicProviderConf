"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProviderInfo = createProviderInfo;
function createProviderInfo(provider, providerName, models) {
    return {
        provider,
        providerName,
        lastUpdated: new Date().toISOString(),
        models,
    };
}
//# sourceMappingURL=provider.js.map