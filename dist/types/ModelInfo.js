"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelInfoBuilder = exports.ModelType = void 0;
var ModelType;
(function (ModelType) {
    ModelType["Chat"] = "chat";
    ModelType["Completion"] = "completion";
    ModelType["Embedding"] = "embedding";
    ModelType["ImageGeneration"] = "imageGeneration";
    ModelType["Audio"] = "audio";
})(ModelType || (exports.ModelType = ModelType = {}));
class ModelInfoBuilder {
    static create(id, name, contextLength, maxTokens, vision, functionCall, reasoning, modelType) {
        return {
            id,
            name,
            contextLength,
            maxTokens,
            vision,
            functionCall,
            reasoning,
            type: modelType,
        };
    }
}
exports.ModelInfoBuilder = ModelInfoBuilder;
//# sourceMappingURL=ModelInfo.js.map