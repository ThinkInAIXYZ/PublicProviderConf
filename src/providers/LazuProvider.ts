import axios, { AxiosInstance } from 'axios';
import { Provider } from './Provider';
import { createModelInfo, ModelInfo, ModelModalities, ModelType } from '../models/model-info';

export interface LazuModelCapabilities {
  supports_function_calling?: boolean | null;
  supports_vision?: boolean | null;
  supports_reasoning?: boolean | null;
  supports_response_schema?: boolean | null;
  supports_audio_input?: boolean | null;
  supports_audio_output?: boolean | null;
}

export interface LazuModel {
  model_name?: string | null;
  context_length?: number | null;
  max_output_tokens?: number | null;
  capabilities?: LazuModelCapabilities | null;
  supported_endpoint_types?: string[] | null;
}

interface LazuPricingResponse {
  data?: LazuModel[] | null;
}

const NON_CHAT_ENDPOINT_TYPES = new Set([
  'image-generation',
  'video-generation',
  'embeddings',
  'decisions',
  'audio',
]);

function toTokenCount(value?: number | null): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

/**
 * Maps one entry of Lazu's public pricing catalog to a chat model.
 * Non-chat, embedding, image, and decisions models return null.
 */
export function mapLazuModel(model: LazuModel): ModelInfo | null {
  const id = (model.model_name ?? '').trim();
  if (!id) {
    return null;
  }

  const endpointTypes = (model.supported_endpoint_types ?? []).map(t => t.trim().toLowerCase());
  if (!endpointTypes.includes('openai')) {
    return null;
  }
  if (endpointTypes.some(t => NON_CHAT_ENDPOINT_TYPES.has(t))) {
    return null;
  }

  let contextLength = toTokenCount(model.context_length);
  let maxTokens = toTokenCount(model.max_output_tokens);
  if (contextLength === 0 && maxTokens > 0) {
    contextLength = maxTokens;
  } else if (maxTokens === 0 && contextLength > 0) {
    maxTokens = contextLength;
  }
  if (contextLength === 0) {
    return null;
  }
  if (maxTokens > contextLength) {
    maxTokens = contextLength;
  }

  const caps = model.capabilities ?? {};
  const vision = caps.supports_vision === true;
  const functionCall = caps.supports_function_calling === true;
  const reasoning = caps.supports_reasoning === true;
  const structuredOutput = caps.supports_response_schema === true;

  const input = ['text'];
  if (vision) {
    input.push('image');
  }
  if (caps.supports_audio_input === true) {
    input.push('audio');
  }

  const output = ['text'];
  if (caps.supports_audio_output === true) {
    output.push('audio');
  }

  const modalities: ModelModalities = { input, output };

  return createModelInfo(
    id,
    id,
    contextLength,
    maxTokens,
    vision,
    functionCall,
    reasoning,
    ModelType.Chat,
    {
      modalities,
      ...(structuredOutput ? { structuredOutput: true } : {}),
    },
  );
}

export class LazuProvider implements Provider {
  private apiUrl: string;
  private client: AxiosInstance;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
    this.client = axios.create();
  }

  async fetchModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.client.get<LazuPricingResponse>(this.apiUrl);
      const models = Array.isArray(response.data?.data) ? response.data.data : [];
      return models
        .map(mapLazuModel)
        .filter((model): model is ModelInfo => model !== null);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn('⚠️  Failed to fetch Lazu models, returning empty list', reason);
      return [];
    }
  }

  providerId(): string {
    return 'lazu';
  }

  providerName(): string {
    return 'Lazu';
  }
}
