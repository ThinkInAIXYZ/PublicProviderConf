"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VercelProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const ModelInfo_1 = require("../types/ModelInfo");
class VercelProvider {
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
        if (model.id.includes('dall-e') || model.id.includes('stable-diffusion')) {
            modelType = ModelInfo_1.ModelType.ImageGeneration;
        }
        else if (model.id.includes('embedding')) {
            modelType = ModelInfo_1.ModelType.Embedding;
        }
        else if (model.id.includes('whisper') || model.id.includes('tts')) {
            modelType = ModelInfo_1.ModelType.Audio;
        }
        else {
            modelType = ModelInfo_1.ModelType.Chat;
        }
        const contextLength = model.context_length || 4096;
        const maxTokens = model.max_completion_tokens || Math.min(contextLength, 4096);
        return ModelInfo_1.ModelInfoBuilder.create(model.id, model.name, contextLength, maxTokens, vision, functionCall, reasoning, modelType);
    }
    async fetchModels() {
        try {
            const response = await this.client.get(this.apiUrl);
            return response.data.models.map(model => this.convertModel(model));
        }
        catch (error) {
            throw new Error(`Failed to fetch Vercel models: ${error}`);
        }
    }
    providerId() {
        return 'vercel';
    }
    providerName() {
        return 'Vercel AI Gateway';
    }
}
exports.VercelProvider = VercelProvider;
//# sourceMappingURL=VercelProvider.js.map