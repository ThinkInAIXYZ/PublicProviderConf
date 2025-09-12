"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroqProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const ModelInfo_1 = require("../types/ModelInfo");
class GroqProvider {
    apiKey;
    apiUrl;
    client;
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiUrl = 'https://api.groq.com/openai/v1/models';
        this.client = axios_1.default.create();
    }
    static withUrl(apiUrl, apiKey) {
        const provider = new GroqProvider(apiKey);
        provider.apiUrl = apiUrl;
        return provider;
    }
    convertToModelInfo(groqModel) {
        const modelType = this.determineModelType(groqModel.id);
        const displayName = this.createDisplayName(groqModel.id, groqModel.owned_by);
        return ModelInfo_1.ModelInfoBuilder.create(groqModel.id, displayName, groqModel.context_window, groqModel.max_completion_tokens || groqModel.context_window, this.hasVisionCapability(groqModel.id), this.hasFunctionCallCapability(groqModel.id), this.hasReasoningCapability(groqModel.id), modelType);
    }
    determineModelType(modelId) {
        const idLower = modelId.toLowerCase();
        if (idLower.includes('whisper') || idLower.includes('tts')) {
            return ModelInfo_1.ModelType.Audio;
        }
        else if (idLower.includes('embedding')) {
            return ModelInfo_1.ModelType.Embedding;
        }
        else if (idLower.includes('image') || idLower.includes('dall') || idLower.includes('stable')) {
            return ModelInfo_1.ModelType.ImageGeneration;
        }
        else {
            // Most Groq models are chat/completion models
            return ModelInfo_1.ModelType.Chat;
        }
    }
    hasVisionCapability(modelId) {
        const idLower = modelId.toLowerCase();
        return idLower.includes('vision') || idLower.includes('multimodal');
    }
    hasFunctionCallCapability(modelId) {
        const idLower = modelId.toLowerCase();
        // Most modern LLMs support function calling except audio models
        return !idLower.includes('whisper') && !idLower.includes('tts') && !idLower.includes('guard');
    }
    hasReasoningCapability(modelId) {
        const idLower = modelId.toLowerCase();
        // Advanced reasoning models
        return idLower.includes('r1') || idLower.includes('reasoning') || idLower.includes('o1');
    }
    createDisplayName(modelId, ownedBy) {
        // Remove prefixes like "meta-llama/" or "openai/"
        const cleanId = modelId.includes('/') ?
            modelId.split('/').pop() || modelId : modelId;
        // Format the name nicely
        const formattedName = cleanId
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .split(/\s+/)
            .map(word => {
            if (word.length <= 2 || /^\d+$/.test(word)) {
                return word.toUpperCase();
            }
            else if (word === 'llama') {
                return 'LLaMA';
            }
            else if (word === 'gpt') {
                return 'GPT';
            }
            else if (word === 'oss') {
                return 'OSS';
            }
            else if (word === 'tts') {
                return 'TTS';
            }
            else if (/\d/.test(word) && word.length <= 4) {
                // Handle cases like "120b", "8b", "70b"
                return word.toUpperCase();
            }
            else {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }
        })
            .join(' ');
        // Add owner prefix if it's not already in the name
        if (!formattedName.toLowerCase().includes(ownedBy.toLowerCase())) {
            return `${ownedBy}: ${formattedName}`;
        }
        else {
            return formattedName;
        }
    }
    async fetchModels() {
        // Check if API key is provided
        if (!this.apiKey) {
            throw new Error('Groq API key is required. Please set GROQ_API_KEY environment variable or configure in providers.toml');
        }
        console.log('🔄 Fetching models from Groq API...');
        try {
            // Make API request with authorization header
            const response = await this.client.get(this.apiUrl, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.status !== 200) {
                throw new Error(`Groq API request failed with status ${response.status}: ${response.statusText}`);
            }
            console.log(`📋 Found ${response.data.data.length} models from Groq API`);
            // Convert to Vec of ModelInfo
            const models = [];
            for (const groqModel of response.data.data) {
                // Skip inactive models
                if (!groqModel.active) {
                    continue;
                }
                const modelInfo = this.convertToModelInfo(groqModel);
                models.push(modelInfo);
            }
            console.log(`✅ Successfully processed ${models.length} active Groq models`);
            return models;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const status = error.response?.status;
                const errorText = error.response?.data || error.message;
                throw new Error(`Groq API request failed with status ${status}: ${errorText}`);
            }
            throw new Error(`Failed to send request to Groq API: ${error}`);
        }
    }
    providerId() {
        return 'groq';
    }
    providerName() {
        return 'Groq';
    }
}
exports.GroqProvider = GroqProvider;
//# sourceMappingURL=GroqProvider.js.map