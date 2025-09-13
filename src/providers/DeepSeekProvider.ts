import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { Provider } from './Provider';
import { ModelInfo, ModelInfoBuilder, ModelType } from '../types/ModelInfo';

interface DeepSeekModelDetails {
  name: string;
  contextLength: number;
  maxTokens: number;
  vision: boolean;
  functionCall: boolean;
  reasoning: boolean;
}

export class DeepSeekProvider implements Provider {
  private docsUrl: string;
  private client: AxiosInstance;

  constructor() {
    this.docsUrl = 'https://api-docs.deepseek.com/quick_start/pricing';
    this.client = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
  }

  private async scrapeModelDetails(): Promise<Map<string, DeepSeekModelDetails>> {
    const response = await this.client.get(this.docsUrl);
    const htmlContent = response.data;
    const $ = cheerio.load(htmlContent);

    const models = new Map<string, DeepSeekModelDetails>();

    // Try to parse table format from the docs
    this.parseModelTable($, models);
    
    // If no models found in table, add fallback models based on known information
    if (models.size === 0) {
      this.addFallbackModels(models);
    }

    return models;
  }

  private parseModelTable($: cheerio.CheerioAPI, models: Map<string, DeepSeekModelDetails>): void {
    $('table').each((_, table) => {
      const $table = $(table);
      const rows = $table.find('tr');
      
      // Find header row containing "MODEL"
      let modelTable = false;
      rows.each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td, th');
        if (cells.length > 0) {
          const headerText = $(cells[0]).text().toUpperCase();
          if (headerText.includes('MODEL')) {
            modelTable = true;
            return false; // break
          }
        }
      });

      if (!modelTable) {
        return; // continue
      }

      // Parse model data from subsequent rows
      let parsingData = false;
      rows.each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td, th');
        
        if (cells.length >= 2) {
          const firstCell = $(cells[0]).text().trim();
          
          // Skip header rows
          if (firstCell.toUpperCase().includes('MODEL')) {
            parsingData = true;
            return; // continue
          }
          
          if (parsingData) {
            // Look for model names in the first column
            if (firstCell.includes('deepseek-chat') || firstCell.includes('deepseek-reasoner')) {
              this.extractModelFromRow($, cells, models);
            }
          }
        }
      });
    });
  }

  private extractModelFromRow($: cheerio.CheerioAPI, cells: cheerio.Cheerio<any>, models: Map<string, DeepSeekModelDetails>): void {
    if (cells.length < 2) {
      return;
    }

    const modelCol = $(cells[0]).text().trim();
    const detailsCol = $(cells[1]).text().trim();

    // Extract model names from the text
    if (modelCol.includes('deepseek-chat')) {
      const modelDetails = this.createDeepseekChatDetails(detailsCol);
      models.set('deepseek-chat', modelDetails);
    }
    
    if (modelCol.includes('deepseek-reasoner')) {
      const modelDetails = this.createDeepseekReasonerDetails(detailsCol);
      models.set('deepseek-reasoner', modelDetails);
    }
  }

  private createDeepseekChatDetails(_details: string): DeepSeekModelDetails {
    return {
      name: 'DeepSeek Chat',
      contextLength: 128000, // 128K context
      maxTokens: 8192, // Maximum 8K output
      vision: false, // Based on documentation, no vision support mentioned
      functionCall: true, // Supports function calling
      reasoning: false, // Non-thinking mode
    };
  }

  private createDeepseekReasonerDetails(_details: string): DeepSeekModelDetails {
    return {
      name: 'DeepSeek Reasoner',
      contextLength: 128000, // 128K context
      maxTokens: 65536, // Maximum 64K output
      vision: false, // Based on documentation, no vision support mentioned
      functionCall: false, // Does not support function calling (switches to chat mode if tools are provided)
      reasoning: true, // Thinking mode with reasoning capabilities
    };
  }

  private addFallbackModels(models: Map<string, DeepSeekModelDetails>): void {
    console.log('📄 Using fallback DeepSeek model definitions');
    
    // Add known DeepSeek models based on the official documentation
    models.set('deepseek-chat', {
      name: 'DeepSeek Chat',
      contextLength: 128000,
      maxTokens: 8192,
      vision: false,
      functionCall: true,
      reasoning: false,
    });

    models.set('deepseek-reasoner', {
      name: 'DeepSeek Reasoner',
      contextLength: 128000,
      maxTokens: 65536,
      vision: false,
      functionCall: false,
      reasoning: true,
    });
  }

  private convertModel(modelId: string, details: DeepSeekModelDetails): ModelInfo {
    // All DeepSeek models are chat/completion models
    const modelType = ModelType.Chat;

    return ModelInfoBuilder.create(
      modelId,
      `DeepSeek: ${details.name}`,
      details.contextLength,
      details.maxTokens,
      details.vision,
      details.functionCall,
      details.reasoning,
      modelType
    );
  }

  async fetchModels(): Promise<ModelInfo[]> {
    console.log('🔄 Fetching DeepSeek models from documentation...');
    
    // Scrape model information from documentation
    const modelDetails = await this.scrapeModelDetails();

    if (modelDetails.size === 0) {
      throw new Error('No DeepSeek models found');
    }

    const result: ModelInfo[] = [];
    for (const [modelId, details] of modelDetails) {
      result.push(this.convertModel(modelId, details));
    }

    console.log(`✅ Successfully processed ${result.length} DeepSeek models`);
    return result;
  }

  providerId(): string {
    return 'deepseek';
  }

  providerName(): string {
    return 'DeepSeek';
  }
}