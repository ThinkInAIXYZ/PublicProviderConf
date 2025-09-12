"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataNormalizer = void 0;
class DataNormalizer {
    /**
     * Normalize model name by trimming whitespace and standardizing format
     */
    static normalizeModelName(name) {
        return name.trim();
    }
    /**
     * Normalize a full ModelInfo object
     */
    static normalizeModelInfo(model) {
        return {
            ...model,
            name: this.normalizeModelName(model.name),
            id: model.id.trim(),
        };
    }
    /**
     * Normalize an array of models
     */
    static normalizeModels(models) {
        return models.map(model => this.normalizeModelInfo(model));
    }
    /**
     * Remove duplicate models based on ID
     */
    static deduplicateModels(models) {
        const seen = new Set();
        const unique = [];
        for (const model of models) {
            if (!seen.has(model.id)) {
                seen.add(model.id);
                unique.push(model);
            }
        }
        return unique;
    }
    /**
     * Sort models by name alphabetically
     */
    static sortModelsByName(models) {
        return [...models].sort((a, b) => a.name.localeCompare(b.name));
    }
    /**
     * Sort models by context length (largest first)
     */
    static sortModelsByContextLength(models) {
        return [...models].sort((a, b) => b.contextLength - a.contextLength);
    }
    /**
     * Apply all normalization steps to models
     */
    static normalizeAndCleanModels(models) {
        return this.sortModelsByName(this.deduplicateModels(this.normalizeModels(models)));
    }
}
exports.DataNormalizer = DataNormalizer;
//# sourceMappingURL=data-normalizer.js.map