"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const ModelInfo_1 = require("../types/ModelInfo");
class OpenRouterProvider {
    apiUrl;
    client;
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.client = axios_1.default.create();
    }
    convertModel(model) {
        const vision = model.capabilities?.vision || false;
        const functionCall = model.capabilities?.function_calling || false;
        const reasoning = model.capabilities?.reasoning || false;
        let modelType;
        if (model.architecture?.modality === 'text-to-image') {
            modelType = ModelInfo_1.ModelType.ImageGeneration;
        }
        else if (model.id.includes('embedding')) {
            modelType = ModelInfo_1.ModelType.Embedding;
        }
        else if (model.id.includes('whisper') || model.id.includes('tts')) {
            modelType = ModelInfo_1.ModelType.Audio;
        }
        else if (model.id.includes('instruct')) {
            modelType = ModelInfo_1.ModelType.Completion;
        }
        else {
            modelType = ModelInfo_1.ModelType.Chat;
        }
        const contextLength = model.context_length || 4096;
        const maxTokens = Math.min(contextLength, 4096); // Default to reasonable output limit
        return ModelInfo_1.ModelInfoBuilder.create(model.id, model.name, contextLength, maxTokens, vision, functionCall, reasoning, modelType);
    }
    async fetchModels() {
        try {
            const response = await this.client.get(this.apiUrl);
            return response.data.data.map(model => this.convertModel(model));
        }
        catch (error) {
            throw new Error(`Failed to fetch OpenRouter models: ${error}`);
        }
    }
    providerId() {
        return 'openrouter';
    }
    providerName() {
        return 'OpenRouter';
    }
}
exports.OpenRouterProvider = OpenRouterProvider;
//# sourceMappingURL=OpenRouterProvider.js.map