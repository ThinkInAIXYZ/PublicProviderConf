import * as fs from 'fs';
import * as path from 'path';
import { Provider } from './Provider';
import { ModelInfo, ModelInfoBuilder, ModelType } from '../types/ModelInfo';

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

export class SiliconFlowProvider implements Provider {
  constructor() {}

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

  async fetchModels(): Promise<ModelInfo[]> {
    const templateModels = new Map<string, TemplateModel>();
    const matchToTemplate = new Map<string, TemplateModel>();
    
    // Load template models
    const templatePath = path.join('templates', 'siliconflow.json');
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
        throw new Error(`Failed to load SiliconFlow templates: ${error}`);
      }
    }

    const resultModels: ModelInfo[] = [];
    
    // Use all template models for SiliconFlow (no API call needed)
    for (const templateModel of templateModels.values()) {
      resultModels.push(this.convertTemplateModel(templateModel));
    }

    return resultModels;
  }

  providerId(): string {
    return 'siliconflow';
  }

  providerName(): string {
    return 'SiliconFlow';
  }
}