import { ProviderInfo } from '../models/provider-info';
import { ModelInfo } from '../models/model-info';

export class JsonValidator {
  static validateProviderInfo(provider: ProviderInfo): void {
    if (!provider.provider || provider.provider.trim() === '') {
      throw new Error('Provider ID cannot be empty');
    }
    
    if (!provider.providerName || provider.providerName.trim() === '') {
      throw new Error('Provider name cannot be empty');
    }
    
    if (!provider.models || provider.models.length === 0) {
      throw new Error('Provider must have at least one model');
    }
    
    for (const model of provider.models) {
      this.validateModelInfo(model);
    }
  }

  private static validateModelInfo(model: ModelInfo): void {
    if (!model.id || model.id.trim() === '') {
      throw new Error('Model ID cannot be empty');
    }
    
    if (!model.name || model.name.trim() === '') {
      throw new Error('Model name cannot be empty');
    }
    
    if (model.contextLength <= 0) {
      throw new Error('Context length must be greater than 0');
    }
    
    if (model.maxTokens <= 0) {
      throw new Error('Max tokens must be greater than 0');
    }
    
    if (model.maxTokens > model.contextLength) {
      throw new Error('Max tokens cannot exceed context length');
    }
  }

  /**
   * Validate JSON structure and content
   */
  static validateJson(data: any): boolean {
    try {
      if (typeof data === 'object' && data !== null) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Validate that the data can be serialized to JSON
   */
  static validateJsonSerializable(data: any): void {
    try {
      JSON.stringify(data);
    } catch (error) {
      throw new Error(`Data is not JSON serializable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}