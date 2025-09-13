import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { Provider } from './Provider';
import { ModelInfo, ModelInfoBuilder, ModelType } from '../types/ModelInfo';

interface GeminiApiModel {
  id: string;
  object: string;
  owned_by: string;
}

interface GeminiApiResponse {
  object: string;
  data: GeminiApiModel[];
}

interface GeminiModelDetails {
  name: string;
  contextLength: number;
  maxTokens: number;
  vision: boolean;
  functionCall: boolean;
  reasoning: boolean;
}

export class GeminiProvider implements Provider {
  private apiUrl: string;
  private docsUrl: string;
  private client: AxiosInstance;
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/models';
    this.docsUrl = 'https://ai.google.dev/gemini-api/docs/models';
    this.client = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    this.apiKey = apiKey;
  }

  private async fetchApiModels(): Promise<string[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await this.client.get<GeminiApiResponse>(this.apiUrl, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.status !== 200) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      return response.data.data.map(model => model.id);
    } catch (error) {
      console.warn('Failed to fetch Gemini models from API:', error);
      return [];
    }
  }

  private async scrapeModelDetails(): Promise<Map<string, GeminiModelDetails>> {
    const response = await this.client.get(this.docsUrl);
    const htmlContent = response.data;
    const $ = cheerio.load(htmlContent);

    const models = new Map<string, GeminiModelDetails>();

    // Try to parse table format first
    this.parseTableFormat($, models);
    
    // If no models found in table, try parsing other formats
    if (models.size === 0) {
      this.parseListFormat($, models);
    }

    // Add some known models if scraping fails
    if (models.size === 0) {
      this.addFallbackModels(models);
    }

    return models;
  }

  private parseTableFormat($: cheerio.CheerioAPI, models: Map<string, GeminiModelDetails>): void {
    $('table').each((_, table) => {
      const $table = $(table);
      const rows = $table.find('tr');
      
      // Skip header row
      rows.slice(1).each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td, th');
        
        if (cells.length >= 3) {
          const rawModelText = $(cells[0]).text();
          const description = $(cells[1]).text().trim();
          const optimizedFor = $(cells[2]).text().trim();

          // Extract clean model name from the raw text
          const cleanModelName = this.extractCleanModelName(rawModelText);
          if (cleanModelName) {
            const modelDetails = this.createModelDetails(cleanModelName, description, optimizedFor);
            const modelId = `models/${cleanModelName}`;
            models.set(modelId, modelDetails);
          }
        }
      });
    });
  }

  private parseListFormat($: cheerio.CheerioAPI, models: Map<string, GeminiModelDetails>): void {
    $('li').each((_, item) => {
      const $item = $(item);
      const codeElem = $item.find('code');
      
      if (codeElem.length > 0) {
        const rawModelId = codeElem.text().trim();
        const description = $item.text().replace(rawModelId, '').trim();

        if (rawModelId.includes('gemini') || rawModelId.includes('models/')) {
          // Clean the model ID
          const cleanModelId = rawModelId.startsWith('models/') ? rawModelId : `models/${rawModelId}`;
          
          const modelName = cleanModelId.replace('models/', '');
          const modelDetails = this.createModelDetails(modelName, description, '');
          models.set(cleanModelId, modelDetails);
        }
      }
    });
  }

  private addFallbackModels(models: Map<string, GeminiModelDetails>): void {
    // Add known Gemini models as fallback
    const fallbackModels: [string, string, number, number, boolean, boolean, boolean][] = [
      ['models/gemini-1.5-pro-latest', 'Gemini 1.5 Pro', 2097152, 8192, true, true, true],
      ['models/gemini-1.5-flash-latest', 'Gemini 1.5 Flash', 1048576, 8192, true, true, false],
      ['models/gemini-1.0-pro', 'Gemini 1.0 Pro', 32768, 2048, false, true, false],
      ['models/embedding-gecko-001', 'Embedding Gecko', 2048, 0, false, false, false],
    ];

    for (const [id, name, context, maxTokens, vision, func, reasoning] of fallbackModels) {
      models.set(id, {
        name: name,
        contextLength: context,
        maxTokens: maxTokens,
        vision: vision,
        functionCall: func,
        reasoning: reasoning,
      });
    }
  }

  private extractCleanModelName(rawText: string): string | null {
    const text = rawText.trim();
    
    // Split by newlines and extract the model ID part
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('gemini-') || (trimmedLine.includes('gemini') && trimmedLine.includes('-'))) {
        // Clean up the model name - remove extra spaces, newlines
        const cleanName = trimmedLine.split(/\s+/).join('-')
          .replace(/--/g, '-')
          .replace(/^-+|-+$/g, '')
          .toLowerCase();
        
        if (cleanName.includes('gemini')) {
          return cleanName;
        }
      }
    }
    
    // Fallback: try to extract from the first part if it contains gemini
    if (text.toLowerCase().includes('gemini')) {
      const firstPart = lines[0]?.trim() || text.trim();
      if (firstPart.toLowerCase().includes('gemini')) {
        // Convert display name to model ID format
        const cleanName = firstPart
          .toLowerCase()
          .replace(/gemini\s+/g, 'gemini-')
          .replace(/\s+/g, '-')
          .replace(/--/g, '-')
          .replace(/^-+|-+$/g, '');
        return cleanName;
      }
    }
    
    return null;
  }

  private createModelDetails(modelName: string, description: string, optimizedFor: string): GeminiModelDetails {
    // Clean model name - remove any prefixes and ensure consistent format
    const cleanName = modelName.startsWith('models/') ? 
      modelName.replace('models/', '') : modelName;

    // Create display name from clean model name
    const displayName = this.createDisplayName(cleanName);

    // Detect capabilities from name and description
    const text = `${cleanName} ${description} ${optimizedFor}`.toLowerCase();
    
    const vision = text.includes('vision') || text.includes('image') || text.includes('multimodal') || cleanName.includes('1.5');
    const functionCall = text.includes('function') || text.includes('tool') || text.includes('calling') || cleanName.includes('pro');
    const reasoning = text.includes('reasoning') || text.includes('complex') || cleanName.includes('pro');

    // Determine context length and max tokens based on model name
    let contextLength: number;
    let maxTokens: number;

    if (cleanName.includes('1.5-pro')) {
      contextLength = 2097152;
      maxTokens = 8192;
    } else if (cleanName.includes('1.5-flash')) {
      contextLength = 1048576;
      maxTokens = 8192;
    } else if (cleanName.includes('1.0-pro')) {
      contextLength = 32768;
      maxTokens = 2048;
    } else if (cleanName.includes('embedding')) {
      contextLength = 2048;
      maxTokens = 1; // Embeddings don't generate text but validator requires > 0
    } else {
      contextLength = 32768;
      maxTokens = 4096;
    }

    return {
      name: `Google: ${displayName}`,
      contextLength,
      maxTokens,
      vision,
      functionCall,
      reasoning,
    };
  }

  private createDisplayName(modelName: string): string {
    // Convert kebab-case model name to display name
    return modelName
      .split('-')
      .map(part => {
        if (part.length === 1 || /^\d+$/.test(part)) {
          return part.toUpperCase();
        } else {
          return part.charAt(0).toUpperCase() + part.slice(1);
        }
      })
      .join(' ');
  }

  private convertModel(modelId: string, details: GeminiModelDetails): ModelInfo {
    const modelType = modelId.includes('embedding') ? ModelType.Embedding : ModelType.Chat;

    return ModelInfoBuilder.create(
      modelId,
      details.name,
      details.contextLength,
      details.maxTokens,
      details.vision,
      details.functionCall,
      details.reasoning,
      modelType
    );
  }

  async fetchModels(): Promise<ModelInfo[]> {
    // First, try to get model list from API (if API key is provided)
    const apiModels = await this.fetchApiModels();
    
    // Then scrape detailed information from documentation
    const modelDetails = await this.scrapeModelDetails();

    const result: ModelInfo[] = [];

    if (apiModels.length > 0) {
      // Use API models as the authoritative list
      for (const modelId of apiModels) {
        const details = modelDetails.get(modelId);
        if (details) {
          result.push(this.convertModel(modelId, details));
        } else {
          // Create basic model info if details not found
          const basicDetails = this.createModelDetails(modelId, '', '');
          result.push(this.convertModel(modelId, basicDetails));
        }
      }
    } else {
      // If no API key or API failed, use scraped data
      for (const [modelId, details] of modelDetails) {
        result.push(this.convertModel(modelId, details));
      }
    }

    return result;
  }

  providerId(): string {
    return 'gemini';
  }

  providerName(): string {
    return 'Google Gemini';
  }
}