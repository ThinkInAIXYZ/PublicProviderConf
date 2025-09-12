export declare enum ModelType {
    Chat = "chat",
    Completion = "completion",
    Embedding = "embedding",
    ImageGeneration = "imagegeneration",
    Audio = "audio"
}
export interface ModelInfo {
    id: string;
    name: string;
    contextLength: number;
    maxTokens: number;
    vision: boolean;
    functionCall: boolean;
    reasoning: boolean;
    type: ModelType;
}
export declare function createModelInfo(id: string, name: string, contextLength: number, maxTokens: number, vision: boolean, functionCall: boolean, reasoning: boolean, modelType: ModelType): ModelInfo;
//# sourceMappingURL=model_info.d.ts.map