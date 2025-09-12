"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelType = void 0;
exports.createModelInfo = createModelInfo;
var ModelType;
(function (ModelType) {
    ModelType["Chat"] = "chat";
    ModelType["Completion"] = "completion";
    ModelType["Embedding"] = "embedding";
    ModelType["ImageGeneration"] = "imageGeneration";
    ModelType["Audio"] = "audio";
})(ModelType || (exports.ModelType = ModelType = {}));
function createModelInfo(id, name, contextLength, maxTokens, vision, functionCall, reasoning, modelType) {
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
//# sourceMappingURL=model-info.js.map