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
exports.DeepSeekProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const ModelInfo_1 = require("../types/ModelInfo");
class DeepSeekProvider {
    docsUrl;
    client;
    constructor() {
        this.docsUrl = 'https://api-docs.deepseek.com/quick_start/pricing';
        this.client = axios_1.default.create({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
    }
    async scrapeModelDetails() {
        const response = await this.client.get(this.docsUrl);
        const htmlContent = response.data;
        const $ = cheerio.load(htmlContent);
        const models = new Map();
        // Try to parse table format from the docs
        this.parseModelTable($, models);
        // If no models found in table, add fallback models based on known information
        if (models.size === 0) {
            this.addFallbackModels(models);
        }
        return models;
    }
    parseModelTable($, models) {
        $('table').each((_, table) => {
            const $table = $(table);
            const rows = $table.find('tr');
            // Find header row containing "MODEL"
            let modelTable = false;
            rows.each((_, row) => {
                const $row = $(row);
                const cells = $row.find('td, th');
                if (cells.length > 0) {
                    const headerText = $(cells[0]).text().toUpperCase();
                    if (headerText.includes('MODEL')) {
                        modelTable = true;
                        return false; // break
                    }
                }
            });
            if (!modelTable) {
                return; // continue
            }
            // Parse model data from subsequent rows
            let parsingData = false;
            rows.each((_, row) => {
                const $row = $(row);
                const cells = $row.find('td, th');
                if (cells.length >= 2) {
                    const firstCell = $(cells[0]).text().trim();
                    // Skip header rows
                    if (firstCell.toUpperCase().includes('MODEL')) {
                        parsingData = true;
                        return; // continue
                    }
                    if (parsingData) {
                        // Look for model names in the first column
                        if (firstCell.includes('deepseek-chat') || firstCell.includes('deepseek-reasoner')) {
                            this.extractModelFromRow($, cells, models);
                        }
                    }
                }
            });
        });
    }
    extractModelFromRow($, cells, models) {
        if (cells.length < 2) {
            return;
        }
        const modelCol = $(cells[0]).text().trim();
        const detailsCol = $(cells[1]).text().trim();
        // Extract model names from the text
        if (modelCol.includes('deepseek-chat')) {
            const modelDetails = this.createDeepseekChatDetails(detailsCol);
            models.set('deepseek-chat', modelDetails);
        }
        if (modelCol.includes('deepseek-reasoner')) {
            const modelDetails = this.createDeepseekReasonerDetails(detailsCol);
            models.set('deepseek-reasoner', modelDetails);
        }
    }
    createDeepseekChatDetails(_details) {
        return {
            name: 'DeepSeek Chat',
            contextLength: 128000, // 128K context
            maxTokens: 8192, // Maximum 8K output
            vision: false, // Based on documentation, no vision support mentioned
            functionCall: true, // Supports function calling
            reasoning: false, // Non-thinking mode
        };
    }
    createDeepseekReasonerDetails(_details) {
        return {
            name: 'DeepSeek Reasoner',
            contextLength: 128000, // 128K context
            maxTokens: 65536, // Maximum 64K output
            vision: false, // Based on documentation, no vision support mentioned
            functionCall: false, // Does not support function calling (switches to chat mode if tools are provided)
            reasoning: true, // Thinking mode with reasoning capabilities
        };
    }
    addFallbackModels(models) {
        console.log('📄 Using fallback DeepSeek model definitions');
        // Add known DeepSeek models based on the official documentation
        models.set('deepseek-chat', {
            name: 'DeepSeek Chat',
            contextLength: 128000,
            maxTokens: 8192,
            vision: false,
            functionCall: true,
            reasoning: false,
        });
        models.set('deepseek-reasoner', {
            name: 'DeepSeek Reasoner',
            contextLength: 128000,
            maxTokens: 65536,
            vision: false,
            functionCall: false,
            reasoning: true,
        });
    }
    convertModel(modelId, details) {
        // All DeepSeek models are chat/completion models
        const modelType = ModelInfo_1.ModelType.Chat;
        return ModelInfo_1.ModelInfoBuilder.create(modelId, `DeepSeek: ${details.name}`, details.contextLength, details.maxTokens, details.vision, details.functionCall, details.reasoning, modelType);
    }
    async fetchModels() {
        console.log('🔄 Fetching DeepSeek models from documentation...');
        // Scrape model information from documentation
        const modelDetails = await this.scrapeModelDetails();
        if (modelDetails.size === 0) {
            throw new Error('No DeepSeek models found');
        }
        const result = [];
        for (const [modelId, details] of modelDetails) {
            result.push(this.convertModel(modelId, details));
        }
        console.log(`✅ Successfully processed ${result.length} DeepSeek models`);
        return result;
    }
    providerId() {
        return 'deepseek';
    }
    providerName() {
        return 'DeepSeek';
    }
}
exports.DeepSeekProvider = DeepSeekProvider;
//# sourceMappingURL=DeepSeekProvider.js.map