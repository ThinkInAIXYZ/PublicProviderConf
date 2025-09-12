import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { Provider } from './Provider';
import { ModelInfo, ModelInfoBuilder, ModelType } from '../types/ModelInfo';

interface AnthropicModel {
  id: string;
}

interface AnthropicResponse {
  data: AnthropicModel[];
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
}

export class AnthropicProvider implements Provider {
  private apiUrl: string;
  private client: AxiosInstance;
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiUrl = 'https://api.anthropic.com/v1/models';
    this.client = axios.create();
    this.apiKey = apiKey;
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
      const response = await this.client.get<AnthropicResponse>(this.apiUrl, {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        }
      });

      if (response.status !== 200) {
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
      }

      return response.data.data.map(model => model.id);
    } catch (error) {
      console.warn('Failed to fetch Anthropic models from API:', error);
      return [];
    }
  }

  private loadTemplateModels(): Map<string, TemplateModel> {
    const templatePath = path.join('templates', 'anthropic.json');
    const modelsMap = new Map<string, TemplateModel>();

    if (!fs.existsSync(templatePath)) {
      throw new Error('Anthropic template file not found at templates/anthropic.json');
    }

    try {
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const templateModels: TemplateModel[] = JSON.parse(templateContent);

      for (const model of templateModels) {
        modelsMap.set(model.id, model);
      }
    } catch (error) {
      throw new Error(`Failed to load Anthropic templates: ${error}`);
    }

    return modelsMap;
  }

  async fetchModels(): Promise<ModelInfo[]> {
    const templateModels = this.loadTemplateModels();
    const availableModelIds = await this.fetchAvailableModelIds();
    
    const resultModels: ModelInfo[] = [];

    if (availableModelIds.length === 0) {
      // No API key or API call failed, use all template models
      for (const templateModel of templateModels.values()) {
        resultModels.push(this.convertTemplateModel(templateModel));
      }
    } else {
      // Only include template models that are available via API
      for (const modelId of availableModelIds) {
        const templateModel = templateModels.get(modelId);
        if (templateModel) {
          resultModels.push(this.convertTemplateModel(templateModel));
        }
      }
    }

    return resultModels;
  }

  providerId(): string {
    return 'anthropic';
  }

  providerName(): string {
    return 'Anthropic';
  }
}