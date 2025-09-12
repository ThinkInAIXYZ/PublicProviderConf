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
exports.GeminiProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const ModelInfo_1 = require("../types/ModelInfo");
class GeminiProvider {
    apiUrl;
    docsUrl;
    client;
    apiKey;
    constructor(apiKey) {
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/models';
        this.docsUrl = 'https://ai.google.dev/gemini-api/docs/models';
        this.client = axios_1.default.create({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        this.apiKey = apiKey;
    }
    async fetchApiModels() {
        if (!this.apiKey) {
            return [];
        }
        try {
            const response = await this.client.get(this.apiUrl, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            if (response.status !== 200) {
                throw new Error(`API request failed with status: ${response.status}`);
            }
            return response.data.data.map(model => model.id);
        }
        catch (error) {
            console.warn('Failed to fetch Gemini models from API:', error);
            return [];
        }
    }
    async scrapeModelDetails() {
        const response = await this.client.get(this.docsUrl);
        const htmlContent = response.data;
        const $ = cheerio.load(htmlContent);
        const models = new Map();
        // Try to parse table format first
        this.parseTableFormat($, models);
        // If no models found in table, try parsing other formats
        if (models.size === 0) {
            this.parseListFormat($, models);
        }
        // Add some known models if scraping fails
        if (models.size === 0) {
            this.addFallbackModels(models);
        }
        return models;
    }
    parseTableFormat($, models) {
        $('table').each((_, table) => {
            const $table = $(table);
            const rows = $table.find('tr');
            // Skip header row
            rows.slice(1).each((_, row) => {
                const $row = $(row);
                const cells = $row.find('td, th');
                if (cells.length >= 3) {
                    const rawModelText = $(cells[0]).text();
                    const description = $(cells[1]).text().trim();
                    const optimizedFor = $(cells[2]).text().trim();
                    // Extract clean model name from the raw text
                    const cleanModelName = this.extractCleanModelName(rawModelText);
                    if (cleanModelName) {
                        const modelDetails = this.createModelDetails(cleanModelName, description, optimizedFor);
                        const modelId = `models/${cleanModelName}`;
                        models.set(modelId, modelDetails);
                    }
                }
            });
        });
    }
    parseListFormat($, models) {
        $('li').each((_, item) => {
            const $item = $(item);
            const codeElem = $item.find('code');
            if (codeElem.length > 0) {
                const rawModelId = codeElem.text().trim();
                const description = $item.text().replace(rawModelId, '').trim();
                if (rawModelId.includes('gemini') || rawModelId.includes('models/')) {
                    // Clean the model ID
                    const cleanModelId = rawModelId.startsWith('models/') ? rawModelId : `models/${rawModelId}`;
                    const modelName = cleanModelId.replace('models/', '');
                    const modelDetails = this.createModelDetails(modelName, description, '');
                    models.set(cleanModelId, modelDetails);
                }
            }
        });
    }
    addFallbackModels(models) {
        // Add known Gemini models as fallback
        const fallbackModels = [
            ['models/gemini-1.5-pro-latest', 'Gemini 1.5 Pro', 2097152, 8192, true, true, true],
            ['models/gemini-1.5-flash-latest', 'Gemini 1.5 Flash', 1048576, 8192, true, true, false],
            ['models/gemini-1.0-pro', 'Gemini 1.0 Pro', 32768, 2048, false, true, false],
            ['models/embedding-gecko-001', 'Embedding Gecko', 2048, 0, false, false, false],
        ];
        for (const [id, name, context, maxTokens, vision, func, reasoning] of fallbackModels) {
            models.set(id, {
                name: name,
                contextLength: context,
                maxTokens: maxTokens,
                vision: vision,
                functionCall: func,
                reasoning: reasoning,
            });
        }
    }
    extractCleanModelName(rawText) {
        const text = rawText.trim();
        // Split by newlines and extract the model ID part
        const lines = text.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('gemini-') || (trimmedLine.includes('gemini') && trimmedLine.includes('-'))) {
                // Clean up the model name - remove extra spaces, newlines
                const cleanName = trimmedLine.split(/\s+/).join('-')
                    .replace(/--/g, '-')
                    .replace(/^-+|-+$/g, '')
                    .toLowerCase();
                if (cleanName.includes('gemini')) {
                    return cleanName;
                }
            }
        }
        // Fallback: try to extract from the first part if it contains gemini
        if (text.toLowerCase().includes('gemini')) {
            const firstPart = lines[0]?.trim() || text.trim();
            if (firstPart.toLowerCase().includes('gemini')) {
                // Convert display name to model ID format
                const cleanName = firstPart
                    .toLowerCase()
                    .replace(/gemini\s+/g, 'gemini-')
                    .replace(/\s+/g, '-')
                    .replace(/--/g, '-')
                    .replace(/^-+|-+$/g, '');
                return cleanName;
            }
        }
        return null;
    }
    createModelDetails(modelName, description, optimizedFor) {
        // Clean model name - remove any prefixes and ensure consistent format
        const cleanName = modelName.startsWith('models/') ?
            modelName.replace('models/', '') : modelName;
        // Create display name from clean model name
        const displayName = this.createDisplayName(cleanName);
        // Detect capabilities from name and description
        const text = `${cleanName} ${description} ${optimizedFor}`.toLowerCase();
        const vision = text.includes('vision') || text.includes('image') || text.includes('multimodal') || cleanName.includes('1.5');
        const functionCall = text.includes('function') || text.includes('tool') || text.includes('calling') || cleanName.includes('pro');
        const reasoning = text.includes('reasoning') || text.includes('complex') || cleanName.includes('pro');
        // Determine context length and max tokens based on model name
        let contextLength;
        let maxTokens;
        if (cleanName.includes('1.5-pro')) {
            contextLength = 2097152;
            maxTokens = 8192;
        }
        else if (cleanName.includes('1.5-flash')) {
            contextLength = 1048576;
            maxTokens = 8192;
        }
        else if (cleanName.includes('1.0-pro')) {
            contextLength = 32768;
            maxTokens = 2048;
        }
        else if (cleanName.includes('embedding')) {
            contextLength = 2048;
            maxTokens = 0;
        }
        else {
            contextLength = 32768;
            maxTokens = 4096;
        }
        return {
            name: `Google: ${displayName}`,
            contextLength,
            maxTokens,
            vision,
            functionCall,
            reasoning,
        };
    }
    createDisplayName(modelName) {
        // Convert kebab-case model name to display name
        return modelName
            .split('-')
            .map(part => {
            if (part.length === 1 || /^\d+$/.test(part)) {
                return part.toUpperCase();
            }
            else {
                return part.charAt(0).toUpperCase() + part.slice(1);
            }
        })
            .join(' ');
    }
    convertModel(modelId, details) {
        const modelType = modelId.includes('embedding') ? ModelInfo_1.ModelType.Embedding : ModelInfo_1.ModelType.Chat;
        return ModelInfo_1.ModelInfoBuilder.create(modelId, details.name, details.contextLength, details.maxTokens, details.vision, details.functionCall, details.reasoning, modelType);
    }
    async fetchModels() {
        // First, try to get model list from API (if API key is provided)
        const apiModels = await this.fetchApiModels();
        // Then scrape detailed information from documentation
        const modelDetails = await this.scrapeModelDetails();
        const result = [];
        if (apiModels.length > 0) {
            // Use API models as the authoritative list
            for (const modelId of apiModels) {
                const details = modelDetails.get(modelId);
                if (details) {
                    result.push(this.convertModel(modelId, details));
                }
                else {
                    // Create basic model info if details not found
                    const basicDetails = this.createModelDetails(modelId, '', '');
                    result.push(this.convertModel(modelId, basicDetails));
                }
            }
        }
        else {
            // If no API key or API failed, use scraped data
            for (const [modelId, details] of modelDetails) {
                result.push(this.convertModel(modelId, details));
            }
        }
        return result;
    }
    providerId() {
        return 'gemini';
    }
    providerName() {
        return 'Google Gemini';
    }
}
exports.GeminiProvider = GeminiProvider;
//# sourceMappingURL=GeminiProvider.js.map