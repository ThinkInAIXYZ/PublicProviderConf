import axios, { AxiosInstance } from 'axios';
import { Provider } from './Provider';
import { createModelInfo, ModelInfo, ModelModalities, ModelType } from '../models/model-info';

export interface CheaperInferenceModel {
  id?: string;
  context_length?: number | null;
  max_output_tokens?: number | null;
  model_type?: string | null;
  supported_endpoints?: string[] | null;
  supports_vision?: boolean | null;
  supports_reasoning?: boolean | null;
  features?: string[] | null;
}

interface CheaperInferenceResponse {
  models?: CheaperInferenceModel[] | null;
}

const CHAT_COMPLETIONS_ENDPOINT = '/v1/chat/completions';

const INPUT_MODALITY_FEATURES: Array<[string, string]> = [
  ['image-input', 'image'],
  ['audio-input', 'audio'],
  ['video-input', 'video'],
];

function toTokenCount(value?: number | null): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

/**
 * Maps one entry of the public model list to a chat model.
 * Media, embedding and Responses-only models return null.
 */
export function mapCheaperInferenceModel(model: CheaperInferenceModel): ModelInfo | null {
  const id = (model.id ?? '').trim();
  if (!id || model.model_type !== 'text') {
    return null;
  }
  if (!(model.supported_endpoints ?? []).includes(CHAT_COMPLETIONS_ENDPOINT)) {
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

  const features = new Set((model.features ?? []).map(feature => feature.trim().toLowerCase()));
  const vision = model.supports_vision === true;
  const functionCall = features.has('tool-use');
  const reasoning = model.supports_reasoning === true;

  const input = ['text'];
  for (const [feature, modality] of INPUT_MODALITY_FEATURES) {
    if (features.has(feature) || (modality === 'image' && vision)) {
      input.push(modality);
    }
  }
  const modalities: ModelModalities = { input, output: ['text'] };

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
      ...(features.has('structured-output') ? { structuredOutput: true } : {}),
    },
  );
}

export class CheaperInferenceProvider implements Provider {
  private apiUrl: string;
  private client: AxiosInstance;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
    this.client = axios.create();
  }

  async fetchModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.client.get<CheaperInferenceResponse>(this.apiUrl);
      const models = Array.isArray(response.data?.models) ? response.data.models : [];
      return models
        .map(mapCheaperInferenceModel)
        .filter((model): model is ModelInfo => model !== null);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn('⚠️  Failed to fetch Cheaper Inference models, returning empty list', reason);
      return [];
    }
  }

  providerId(): string {
    return 'cheaper-inference';
  }

  providerName(): string {
    return 'Cheaper Inference';
  }
}
