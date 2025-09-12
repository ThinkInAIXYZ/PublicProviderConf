import { ModelInfo } from '../models/model-info';

export class DataNormalizer {
  /**
   * Normalize model name by trimming whitespace and standardizing format
   */
  static normalizeModelName(name: string): string {
    return name.trim();
  }
  
  /**
   * Normalize a full ModelInfo object
   */
  static normalizeModelInfo(model: ModelInfo): ModelInfo {
    return {
      ...model,
      name: this.normalizeModelName(model.name),
      id: model.id.trim(),
    };
  }

  /**
   * Normalize an array of models
   */
  static normalizeModels(models: ModelInfo[]): ModelInfo[] {
    return models.map(model => this.normalizeModelInfo(model));
  }

  /**
   * Remove duplicate models based on ID
   */
  static deduplicateModels(models: ModelInfo[]): ModelInfo[] {
    const seen = new Set<string>();
    const unique: ModelInfo[] = [];
    
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
  static sortModelsByName(models: ModelInfo[]): ModelInfo[] {
    return [...models].sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Sort models by context length (largest first)
   */
  static sortModelsByContextLength(models: ModelInfo[]): ModelInfo[] {
    return [...models].sort((a, b) => b.contextLength - a.contextLength);
  }

  /**
   * Apply all normalization steps to models
   */
  static normalizeAndCleanModels(models: ModelInfo[]): ModelInfo[] {
    return this.sortModelsByName(
      this.deduplicateModels(
        this.normalizeModels(models)
      )
    );
  }
}