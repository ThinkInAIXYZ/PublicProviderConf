import axios from 'axios';
import type { CustomProviderSourceSeed, OfficialModelReference } from '../types';
import { SeededModelsAdapter } from './BaseModelsAdapter';

interface AnthropicModelsResponse {
  data?: Array<{
    id?: string;
    display_name?: string;
    created_at?: string;
    type?: string;
  }>;
}

export class AnthropicModelsAdapter extends SeededModelsAdapter {
  constructor(source: CustomProviderSourceSeed) {
    super(source);
  }

  protected async fetchOfficialModels(apiKey: string): Promise<OfficialModelReference[]> {
    const response = await axios.get<AnthropicModelsResponse>(
      this.source.apiUrl ?? 'https://api.anthropic.com/v1/models',
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        params: {
          limit: 1000,
        },
        timeout: 30_000,
      },
    );

    return (response.data.data ?? [])
      .filter(model => typeof model.id === 'string' && model.id.trim().length > 0)
      .map(model => ({
        id: model.id!.trim(),
        name: model.display_name,
        createdAt: model.created_at,
        raw: {
          type: model.type,
        },
      }));
  }
}
