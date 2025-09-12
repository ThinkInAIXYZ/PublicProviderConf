import { ModelInfo } from '../models/model-info';
export declare class DataNormalizer {
    /**
     * Normalize model name by trimming whitespace and standardizing format
     */
    static normalizeModelName(name: string): string;
    /**
     * Normalize a full ModelInfo object
     */
    static normalizeModelInfo(model: ModelInfo): ModelInfo;
    /**
     * Normalize an array of models
     */
    static normalizeModels(models: ModelInfo[]): ModelInfo[];
    /**
     * Remove duplicate models based on ID
     */
    static deduplicateModels(models: ModelInfo[]): ModelInfo[];
    /**
     * Sort models by name alphabetically
     */
    static sortModelsByName(models: ModelInfo[]): ModelInfo[];
    /**
     * Sort models by context length (largest first)
     */
    static sortModelsByContextLength(models: ModelInfo[]): ModelInfo[];
    /**
     * Apply all normalization steps to models
     */
    static normalizeAndCleanModels(models: ModelInfo[]): ModelInfo[];
}
//# sourceMappingURL=data-normalizer.d.ts.map