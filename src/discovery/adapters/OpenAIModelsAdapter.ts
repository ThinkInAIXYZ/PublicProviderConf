import axios from 'axios';
import type { CustomProviderSourceSeed, OfficialModelReference } from '../types';
import { SeededModelsAdapter } from './BaseModelsAdapter';

interface OpenAIModelsResponse {
  data?: Array<{
    id?: string;
    created?: number;
    owned_by?: string;
  }>;
}

export class OpenAIModelsAdapter extends SeededModelsAdapter {
  constructor(source: CustomProviderSourceSeed) {
    super(source);
  }

  protected async fetchOfficialModels(apiKey: string): Promise<OfficialModelReference[]> {
    const response = await axios.get<OpenAIModelsResponse>(
      this.source.apiUrl ?? 'https://api.openai.com/v1/models',
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 30_000,
      },
    );

    return (response.data.data ?? [])
      .filter(model => typeof model.id === 'string' && model.id.trim().length > 0)
      .map(model => ({
        id: model.id!.trim(),
        createdAt: typeof model.created === 'number'
          ? new Date(model.created * 1000).toISOString()
          : undefined,
        raw: {
          owned_by: model.owned_by,
        },
      }));
  }
}
