import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { Provider } from './Provider';
import { ModelInfo, ModelInfoBuilder, ModelType } from '../types/ModelInfo';

interface OpenAIModel {
  id: string;
}

interface OpenAIResponse {
  data: OpenAIModel[];
}

interface TemplateModel {
  id: string;
  name: string;
  contextLength: number;
  maxTokens: number;
  vision: boolean;
  functionCall: boolean;
  reasoning: boolean;
  type: string;
  match?: string[];
}

export class OpenAIProvider implements Provider {
  private apiUrl: string;
  private client: AxiosInstance;
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiUrl = 'https://api.openai.com/v1/models';
    this.client = axios.create();
    this.apiKey = apiKey;
  }

  private createDefaultModel(modelId: string): ModelInfo {
    // Analyze model ID to determine capabilities
    const isEmbedding = modelId.includes('embedding');
    const isImageGen = modelId.includes('dall-e');
    const isAudio = modelId.includes('whisper') || modelId.includes('tts');
    const isReasoning = modelId.includes('o1') || modelId.includes('o3') || modelId.includes('o4');
    const hasVision = modelId.includes('4o') || modelId.includes('gpt-4') || modelId.includes('gpt-5') || modelId.includes('vision');
    const hasFunctionCall = !isEmbedding && !isAudio && !modelId.includes('instruct');

    let modelType: ModelType;
    if (isEmbedding) {
      modelType = ModelType.Embedding;
    } else if (isImageGen) {
      modelType = ModelType.ImageGeneration;
    } else if (isAudio) {
      modelType = ModelType.Audio;
    } else if (modelId.includes('instruct')) {
      modelType = ModelType.Completion;
    } else {
      modelType = ModelType.Chat;
    }

    // Determine context length and max tokens based on model family
    let contextLength: number;
    let maxTokens: number;

    if (modelId.includes('gpt-5')) {
      contextLength = 272000;
      maxTokens = 128000;
    } else if (modelId.includes('gpt-4.1')) {
      contextLength = 1000000;
      maxTokens = 32000;
    } else if (modelId.includes('gpt-4o') || modelId.includes('gpt-4-turbo')) {
      contextLength = 128000;
      maxTokens = 8192;
    } else if (modelId.includes('o1') || modelId.includes('o3')) {
      contextLength = 128000;
      maxTokens = 32768;
    } else if (modelId.includes('gpt-4-32k')) {
      contextLength = 32768;
      maxTokens = 4096;
    } else if (modelId.includes('gpt-4')) {
      contextLength = 8192;
      maxTokens = 4096;
    } else if (modelId.includes('16k')) {
      contextLength = 16384;
      maxTokens = 4096;
    } else if (modelId.includes('embedding')) {
      contextLength = 8191;
      maxTokens = 8191;
    } else if (modelId.includes('dall-e-3')) {
      contextLength = 4000;
      maxTokens = 4000;
    } else if (modelId.includes('dall-e')) {
      contextLength = 1000;
      maxTokens = 1000;
    } else if (modelId.includes('tts') || modelId.includes('whisper')) {
      contextLength = 4096;
      maxTokens = 4096;
    } else {
      contextLength = 4096;
      maxTokens = 4096;
    }

    // Create display name from ID
    const displayName = modelId
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => {
        if (word.length === 0) return '';
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');

    return ModelInfoBuilder.create(
      modelId,
      displayName,
      contextLength,
      maxTokens,
      hasVision,
      hasFunctionCall,
      isReasoning,
      modelType
    );
  }

  private convertTemplateModel(template: TemplateModel): ModelInfo {
    let modelType: ModelType;
    switch (template.type) {
      case 'chat':
        modelType = ModelType.Chat;
        break;
      case 'completion':
        modelType = ModelType.Completion;
        break;
      case 'embedding':
        modelType = ModelType.Embedding;
        break;
      case 'imageGeneration':
        modelType = ModelType.ImageGeneration;
        break;
      case 'audio':
        modelType = ModelType.Audio;
        break;
      default:
        modelType = ModelType.Chat;
    }

    return ModelInfoBuilder.create(
      template.id,
      template.name,
      template.contextLength,
      template.maxTokens,
      template.vision,
      template.functionCall,
      template.reasoning,
      modelType
    );
  }

  private async fetchAvailableModelIds(): Promise<string[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await this.client.get<OpenAIResponse>(this.apiUrl, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data.data.map(model => model.id);
    } catch (error) {
      console.warn('Failed to fetch OpenAI models from API, using templates only');
      return [];
    }
  }

  private loadTemplateModels(): Map<string, TemplateModel> {
    const templateModels = new Map<string, TemplateModel>();
    const matchToTemplate = new Map<string, TemplateModel>();
    
    const templatePath = path.join('templates', 'openai.json');
    if (fs.existsSync(templatePath)) {
      try {
        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        const models: TemplateModel[] = JSON.parse(templateContent);
        
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
      } catch (error) {
        console.warn('Failed to load OpenAI templates:', error);
      }
    }

    return templateModels;
  }

  async fetchModels(): Promise<ModelInfo[]> {
    const templateModels = this.loadTemplateModels();
    const availableModelIds = await this.fetchAvailableModelIds();
    
    const resultModels: ModelInfo[] = [];
    const matchedModels = new Set<string>();

    if (availableModelIds.length === 0) {
      // No API key or API call failed, use all template models
      for (const templateModel of templateModels.values()) {
        resultModels.push(this.convertTemplateModel(templateModel));
      }
    } else {
      // Match API models with templates using match patterns
      for (const modelId of availableModelIds) {
        const templateModel = templateModels.get(modelId);
        if (templateModel) {
          // Use actual API model ID, but template configuration
          const modelInfo = this.convertTemplateModel(templateModel);
          modelInfo.id = modelId; // Use actual API ID
          resultModels.push(modelInfo);
          matchedModels.add(modelId);
          console.log(`✓ Matched API model '${modelId}' with template '${templateModel.id}'.`);
        }
      }
      
      // Add unmatched models with default configuration
      for (const modelId of availableModelIds) {
        if (!matchedModels.has(modelId)) {
          const defaultModel = this.createDefaultModel(modelId);
          resultModels.push(defaultModel);
          console.log(`⚠️  API model '${modelId}' not found in templates, using default configuration.`);
        }
      }
    }

    return resultModels;
  }

  providerId(): string {
    return 'openai';
  }

  providerName(): string {
    return 'OpenAI';
  }
}