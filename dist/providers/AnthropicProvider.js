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
exports.AnthropicProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ModelInfo_1 = require("../types/ModelInfo");
class AnthropicProvider {
    apiUrl;
    client;
    apiKey;
    constructor(apiKey) {
        this.apiUrl = 'https://api.anthropic.com/v1/models';
        this.client = axios_1.default.create();
        this.apiKey = apiKey;
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
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                }
            });
            if (response.status !== 200) {
                throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
            }
            return response.data.data.map(model => model.id);
        }
        catch (error) {
            console.warn('Failed to fetch Anthropic models from API:', error);
            return [];
        }
    }
    loadTemplateModels() {
        const templatePath = path.join('templates', 'anthropic.json');
        const modelsMap = new Map();
        if (!fs.existsSync(templatePath)) {
            throw new Error('Anthropic template file not found at templates/anthropic.json');
        }
        try {
            const templateContent = fs.readFileSync(templatePath, 'utf-8');
            const templateModels = JSON.parse(templateContent);
            for (const model of templateModels) {
                modelsMap.set(model.id, model);
            }
        }
        catch (error) {
            throw new Error(`Failed to load Anthropic templates: ${error}`);
        }
        return modelsMap;
    }
    async fetchModels() {
        const templateModels = this.loadTemplateModels();
        const availableModelIds = await this.fetchAvailableModelIds();
        const resultModels = [];
        if (availableModelIds.length === 0) {
            // No API key or API call failed, use all template models
            for (const templateModel of templateModels.values()) {
                resultModels.push(this.convertTemplateModel(templateModel));
            }
        }
        else {
            // Only include template models that are available via API
            for (const modelId of availableModelIds) {
                const templateModel = templateModels.get(modelId);
                if (templateModel) {
                    resultModels.push(this.convertTemplateModel(templateModel));
                }
            }
        }
        return resultModels;
    }
    providerId() {
        return 'anthropic';
    }
    providerName() {
        return 'Anthropic';
    }
}
exports.AnthropicProvider = AnthropicProvider;
//# sourceMappingURL=AnthropicProvider.js.map