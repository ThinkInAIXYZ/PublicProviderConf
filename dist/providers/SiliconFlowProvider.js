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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiliconFlowProvider = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ModelInfo_1 = require("../types/ModelInfo");
class SiliconFlowProvider {
    constructor() { }
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
    async fetchModels() {
        const templateModels = new Map();
        const matchToTemplate = new Map();
        // Load template models
        const templatePath = path.join('templates', 'siliconflow.json');
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
                throw new Error(`Failed to load SiliconFlow templates: ${error}`);
            }
        }
        const resultModels = [];
        // Use all template models for SiliconFlow (no API call needed)
        for (const templateModel of templateModels.values()) {
            resultModels.push(this.convertTemplateModel(templateModel));
        }
        return resultModels;
    }
    providerId() {
        return 'siliconflow';
    }
    providerName() {
        return 'SiliconFlow';
    }
}
exports.SiliconFlowProvider = SiliconFlowProvider;
//# sourceMappingURL=SiliconFlowProvider.js.map