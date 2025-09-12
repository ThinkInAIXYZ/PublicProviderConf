"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ModelInfo_1 = require("../types/ModelInfo");
class OpenAIProvider {
    apiUrl;
    client;
    apiKey;
    constructor(apiKey) {
        this.apiUrl = 'https://api.openai.com/v1/models';
        this.client = axios_1.default.create();
        this.apiKey = apiKey;
    }
    createDefaultModel(modelId) {
        // Analyze model ID to determine capabilities
        const isEmbedding = modelId.includes('embedding');
        const isImageGen = modelId.includes('dall-e');
        const isAudio = modelId.includes('whisper') || modelId.includes('tts');
        const isReasoning = modelId.includes('o1') || modelId.includes('o3') || modelId.includes('o4');
        const hasVision = modelId.includes('4o') || modelId.includes('gpt-4') || modelId.includes('gpt-5') || modelId.includes('vision');
        const hasFunctionCall = !isEmbedding && !isAudio && !modelId.includes('instruct');
        let modelType;
        if (isEmbedding) {
            modelType = ModelInfo_1.ModelType.Embedding;
        }
        else if (isImageGen) {
            modelType = ModelInfo_1.ModelType.ImageGeneration;
        }
        else if (isAudio) {
            modelType = ModelInfo_1.ModelType.Audio;
        }
        else if (modelId.includes('instruct')) {
            modelType = ModelInfo_1.ModelType.Completion;
        }
        else {
            modelType = ModelInfo_1.ModelType.Chat;
        }
        // Determine context length and max tokens based on model family
        let contextLength;
        let maxTokens;
        if (modelId.includes('gpt-5')) {
            contextLength = 272000;
            maxTokens = 128000;
        }
        else if (modelId.includes('gpt-4.1')) {
            contextLength = 1000000;
            maxTokens = 32000;
        }
        else if (modelId.includes('gpt-4o') || modelId.includes('gpt-4-turbo')) {
            contextLength = 128000;
            maxTokens = 8192;
        }
        else if (modelId.includes('o1') || modelId.includes('o3')) {
            contextLength = 128000;
            maxTokens = 32768;
        }
        else if (modelId.includes('gpt-4-32k')) {
            contextLength = 32768;
            maxTokens = 4096;
        }
        else if (modelId.includes('gpt-4')) {
            contextLength = 8192;
            maxTokens = 4096;
        }
        else if (modelId.includes('16k')) {
            contextLength = 16384;
            maxTokens = 4096;
        }
        else if (modelId.includes('embedding')) {
            contextLength = 8191;
            maxTokens = 8191;
        }
        else if (modelId.includes('dall-e-3')) {
            contextLength = 4000;
            maxTokens = 4000;
        }
        else if (modelId.includes('dall-e')) {
            contextLength = 1000;
            maxTokens = 1000;
        }
        else if (modelId.includes('tts') || modelId.includes('whisper')) {
            contextLength = 4096;
            maxTokens = 4096;
        }
        else {
            contextLength = 4096;
            maxTokens = 4096;
        }
        // Create display name from ID
        const displayName = modelId
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => {
            if (word.length === 0)
                return '';
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
            .join(' ');
        return ModelInfo_1.ModelInfoBuilder.create(modelId, displayName, contextLength, maxTokens, hasVision, hasFunctionCall, isReasoning, modelType);
    }
    convertTemplateModel(template) {
        let modelType;
        switch (template.type) {
            case 'chat':
                modelType = ModelInfo_1.ModelType.Chat;
                break;
            case 'completion':
                modelType = ModelInfo_1.ModelType.Completion;
                break;
            case 'embedding':
                modelType = ModelInfo_1.ModelType.Embedding;
                break;
            case 'imageGeneration':
                modelType = ModelInfo_1.ModelType.ImageGeneration;
                break;
            case 'audio':
                modelType = ModelInfo_1.ModelType.Audio;
                break;
            default:
                modelType = ModelInfo_1.ModelType.Chat;
        }
        return ModelInfo_1.ModelInfoBuilder.create(template.id, template.name, template.contextLength, template.maxTokens, template.vision, template.functionCall, template.reasoning, modelType);
    }
    async fetchAvailableModelIds() {
        if (!this.apiKey) {
            return [];
        }
        try {
            const response = await this.client.get(this.apiUrl, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            return response.data.data.map(model => model.id);
        }
        catch (error) {
            console.warn('Failed to fetch OpenAI models from API, using templates only');
            return [];
        }
    }
    loadTemplateModels() {
        const templateModels = new Map();
        const matchToTemplate = new Map();
        const templatePath = path.join('templates', 'openai.json');
        if (fs.existsSync(templatePath)) {
            try {
                const templateContent = fs.readFileSync(templatePath, 'utf-8');
                const models = JSON.parse(templateContent);
                for (const model of models) {
                    // Store template by primary ID
                    templateModels.set(model.id, model);
                    // Create match patterns lookup
                    if (model.match) {
                        for (const matchPattern of model.match) {
                            matchToTemplate.set(matchPattern, model);
                        }
                    }
                    // Also add primary ID as a match pattern if not already in match list
                    if (!model.match || !model.match.includes(model.id)) {
                        matchToTemplate.set(model.id, model);
                    }
                }
            }
            catch (error) {
                console.warn('Failed to load OpenAI templates:', error);
            }
        }
        return templateModels;
    }
    async fetchModels() {
        const templateModels = this.loadTemplateModels();
        const availableModelIds = await this.fetchAvailableModelIds();
        const resultModels = [];
        const matchedModels = new Set();
        if (availableModelIds.length === 0) {
            // No API key or API call failed, use all template models
            for (const templateModel of templateModels.values()) {
                resultModels.push(this.convertTemplateModel(templateModel));
            }
        }
        else {
            // Match API models with templates using match patterns
            for (const modelId of availableModelIds) {
                const templateModel = templateModels.get(modelId);
                if (templateModel) {
                    // Use actual API model ID, but template configuration
                    const modelInfo = this.convertTemplateModel(templateModel);
                    modelInfo.id = modelId; // Use actual API ID
                    resultModels.push(modelInfo);
                    matchedModels.add(modelId);
                    console.log(`✓ Matched API model '${modelId}' with template '${templateModel.id}'.`);
                }
            }
            // Add unmatched models with default configuration
            for (const modelId of availableModelIds) {
                if (!matchedModels.has(modelId)) {
                    const defaultModel = this.createDefaultModel(modelId);
                    resultModels.push(defaultModel);
                    console.log(`⚠️  API model '${modelId}' not found in templates, using default configuration.`);
                }
            }
        }
        return resultModels;
    }
    providerId() {
        return 'openai';
    }
    providerName() {
        return 'OpenAI';
    }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=OpenAIProvider.js.map