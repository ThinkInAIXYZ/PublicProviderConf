"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PPInfraProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const ModelInfo_1 = require("../types/ModelInfo");
class PPInfraProvider {
    apiUrl;
    client;
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.client = axios_1.default.create();
    }
    convertModel(model) {
        const vision = model.features?.some(f => f.includes('vision') || f.includes('image')) || false;
        const functionCall = model.features?.some(f => f.includes('function') || f.includes('tool')) || false;
        const reasoning = model.features?.some(f => f.includes('reasoning') || f.includes('thinking')) || false;
        let modelType;
        switch (model.model_type) {
            case 'chat':
                modelType = ModelInfo_1.ModelType.Chat;
                break;
            case 'completion':
                modelType = ModelInfo_1.ModelType.Completion;
                break;
            case 'embedding':
                modelType = ModelInfo_1.ModelType.Embedding;
                break;
            default:
                modelType = ModelInfo_1.ModelType.Chat;
        }
        return ModelInfo_1.ModelInfoBuilder.create(model.id, model.display_name, model.context_size, model.max_output_tokens, vision, functionCall, reasoning, modelType);
    }
    async fetchModels() {
        try {
            const response = await this.client.get(this.apiUrl);
            return response.data.data.map(model => this.convertModel(model));
        }
        catch (error) {
            throw new Error(`Failed to fetch PPInfra models: ${error}`);
        }
    }
    providerId() {
        return 'ppinfra';
    }
    providerName() {
        return 'PPInfra';
    }
}
exports.PPInfraProvider = PPInfraProvider;
//# sourceMappingURL=PPInfraProvider.js.map