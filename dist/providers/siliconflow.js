"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiliconFlowProvider = void 0;
class SiliconFlowProvider {
    constructor() {
        // Template-based, no API key required
    }
    async fetchModels() {
        // TODO: Implement template-based model generation
        console.log('Fetching SiliconFlow models via template');
        return [];
    }
    providerId() {
        return 'siliconflow';
    }
    providerName() {
        return 'SiliconFlow';
    }
}
exports.SiliconFlowProvider = SiliconFlowProvider;
//# sourceMappingURL=siliconflow.js.map