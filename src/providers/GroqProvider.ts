import axios, { AxiosInstance } from 'axios';
import { Provider } from './Provider';
import { ModelInfo, ModelInfoBuilder, ModelType } from '../types/ModelInfo';

interface GroqModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  active: boolean;
  context_window: number;
  public_apps?: any;
  max_completion_tokens?: number;
}

interface GroqApiResponse {
  object: string;
  data: GroqModel[];
}

export class GroqProvider implements Provider {
  private apiKey?: string;
  private apiUrl: string;
  private client: AxiosInstance;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://api.groq.com/openai/v1/models';
    this.client = axios.create();
  }

  static withUrl(apiUrl: string, apiKey?: string): GroqProvider {
    const provider = new GroqProvider(apiKey);
    provider.apiUrl = apiUrl;
    return provider;
  }

  private convertToModelInfo(groqModel: GroqModel): ModelInfo {
    const modelType = this.determineModelType(groqModel.id);
    const displayName = this.createDisplayName(groqModel.id, groqModel.owned_by);
    
    return ModelInfoBuilder.create(
      groqModel.id,
      displayName,
      groqModel.context_window,
      groqModel.max_completion_tokens || groqModel.context_window,
      this.hasVisionCapability(groqModel.id),
      this.hasFunctionCallCapability(groqModel.id),
      this.hasReasoningCapability(groqModel.id),
      modelType
    );
  }

  private determineModelType(modelId: string): ModelType {
    const idLower = modelId.toLowerCase();
    
    if (idLower.includes('whisper') || idLower.includes('tts')) {
      return ModelType.Audio;
    } else if (idLower.includes('embedding')) {
      return ModelType.Embedding;
    } else if (idLower.includes('image') || idLower.includes('dall') || idLower.includes('stable')) {
      return ModelType.ImageGeneration;
    } else {
      // Most Groq models are chat/completion models
      return ModelType.Chat;
    }
  }

  private hasVisionCapability(modelId: string): boolean {
    const idLower = modelId.toLowerCase();
    return idLower.includes('vision') || idLower.includes('multimodal');
  }

  private hasFunctionCallCapability(modelId: string): boolean {
    const idLower = modelId.toLowerCase();
    // Most modern LLMs support function calling except audio models
    return !idLower.includes('whisper') && !idLower.includes('tts') && !idLower.includes('guard');
  }

  private hasReasoningCapability(modelId: string): boolean {
    const idLower = modelId.toLowerCase();
    // Advanced reasoning models
    return idLower.includes('r1') || idLower.includes('reasoning') || idLower.includes('o1');
  }

  private createDisplayName(modelId: string, ownedBy: string): string {
    // Remove prefixes like "meta-llama/" or "openai/"
    const cleanId = modelId.includes('/') ? 
      modelId.split('/').pop() || modelId : modelId;

    // Format the name nicely
    const formattedName = cleanId
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(/\s+/)
      .map(word => {
        if (word.length <= 2 || /^\d+$/.test(word)) {
          return word.toUpperCase();
        } else if (word === 'llama') {
          return 'LLaMA';
        } else if (word === 'gpt') {
          return 'GPT';
        } else if (word === 'oss') {
          return 'OSS';
        } else if (word === 'tts') {
          return 'TTS';
        } else if (/\d/.test(word) && word.length <= 4) {
          // Handle cases like "120b", "8b", "70b"
          return word.toUpperCase();
        } else {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
      })
      .join(' ');

    // Add owner prefix if it's not already in the name
    if (!formattedName.toLowerCase().includes(ownedBy.toLowerCase())) {
      return `${ownedBy}: ${formattedName}`;
    } else {
      return formattedName;
    }
  }

  async fetchModels(): Promise<ModelInfo[]> {
    // Check if API key is provided
    if (!this.apiKey) {
      throw new Error('Groq API key is required. Please set GROQ_API_KEY environment variable or configure in providers.toml');
    }

    console.log('🔄 Fetching models from Groq API...');

    try {
      // Make API request with authorization header
      const response = await this.client.get<GroqApiResponse>(this.apiUrl, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Groq API request failed with status ${response.status}: ${response.statusText}`);
      }

      console.log(`📋 Found ${response.data.data.length} models from Groq API`);

      // Convert to Vec of ModelInfo
      const models: ModelInfo[] = [];
      
      for (const groqModel of response.data.data) {
        // Skip inactive models
        if (!groqModel.active) {
          continue;
        }

        const modelInfo = this.convertToModelInfo(groqModel);
        models.push(modelInfo);
      }

      console.log(`✅ Successfully processed ${models.length} active Groq models`);
      return models;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorText = error.response?.data || error.message;
        throw new Error(`Groq API request failed with status ${status}: ${errorText}`);
      }
      throw new Error(`Failed to send request to Groq API: ${error}`);
    }
  }

  providerId(): string {
    return 'groq';
  }

  providerName(): string {
    return 'Groq';
  }
}