"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubAiProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const ModelInfo_1 = require("../types/ModelInfo");
class GithubAiProvider {
    apiUrl;
    client;
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.client = axios_1.default.create();
    }
    convertModel(model) {
        const vision = model.capabilities?.vision || false;
        const functionCall = model.capabilities?.function_calling || false;
        const reasoning = false; // GitHub AI models don't explicitly advertise reasoning capabilities
        let modelType;
        if (model.task === 'embeddings' || model.capabilities?.embeddings) {
            modelType = ModelInfo_1.ModelType.Embedding;
        }
        else if (model.task === 'text-completion' || model.capabilities?.text_completion) {
            modelType = ModelInfo_1.ModelType.Completion;
        }
        else {
            modelType = ModelInfo_1.ModelType.Chat;
        }
        // Estimate context length and max tokens based on model family
        let contextLength;
        let maxTokens;
        if (model.name.includes('llama') && model.name.includes('70b')) {
            contextLength = 128000;
            maxTokens = 4096;
        }
        else if (model.name.includes('llama') && model.name.includes('8b')) {
            contextLength = 128000;
            maxTokens = 4096;
        }
        else if (model.name.includes('phi')) {
            contextLength = 128000;
            maxTokens = 4096;
        }
        else if (model.name.includes('mistral')) {
            contextLength = 32768;
            maxTokens = 4096;
        }
        else {
            contextLength = 4096;
            maxTokens = 2048;
        }
        return ModelInfo_1.ModelInfoBuilder.create(model.name, model.display_name, contextLength, maxTokens, vision, functionCall, reasoning, modelType);
    }
    async fetchModels() {
        try {
            const response = await this.client.get(this.apiUrl);
            return response.data.models.map(model => this.convertModel(model));
        }
        catch (error) {
            throw new Error(`Failed to fetch GitHub AI models: ${error}`);
        }
    }
    providerId() {
        return 'github_ai';
    }
    providerName() {
        return 'GitHub AI Models';
    }
}
exports.GithubAiProvider = GithubAiProvider;
//# sourceMappingURL=GithubAiProvider.js.map