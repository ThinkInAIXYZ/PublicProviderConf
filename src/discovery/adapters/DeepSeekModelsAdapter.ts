import axios from 'axios';
import type { CustomProviderSourceSeed, OfficialModelReference } from '../types';
import { SeededModelsAdapter } from './BaseModelsAdapter';

interface DeepSeekModelsResponse {
  data?: Array<{
    id?: string;
    object?: string;
    owned_by?: string;
  }>;
}

export class DeepSeekModelsAdapter extends SeededModelsAdapter {
  constructor(source: CustomProviderSourceSeed) {
    super(source);
  }

  protected async fetchOfficialModels(apiKey: string): Promise<OfficialModelReference[]> {
    const response = await axios.get<DeepSeekModelsResponse>(
      this.source.apiUrl ?? 'https://api.deepseek.com/models',
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
        raw: {
          object: model.object,
          owned_by: model.owned_by,
        },
      }));
  }
}
