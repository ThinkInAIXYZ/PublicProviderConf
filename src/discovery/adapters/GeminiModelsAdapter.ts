import axios from 'axios';
import type { CustomProviderSourceSeed, OfficialModelReference } from '../types';
import { SeededModelsAdapter } from './BaseModelsAdapter';

interface GeminiModelsResponse {
  models?: Array<{
    name?: string;
    displayName?: string;
    inputTokenLimit?: number;
    outputTokenLimit?: number;
    supportedGenerationMethods?: string[];
    version?: string;
  }>;
}

export class GeminiModelsAdapter extends SeededModelsAdapter {
  constructor(source: CustomProviderSourceSeed) {
    super(source);
  }

  protected async fetchOfficialModels(apiKey: string): Promise<OfficialModelReference[]> {
    const response = await axios.get<GeminiModelsResponse>(
      this.source.apiUrl ?? 'https://generativelanguage.googleapis.com/v1beta/models',
      {
        params: {
          key: apiKey,
        },
        timeout: 30_000,
      },
    );

    const references: OfficialModelReference[] = [];

    for (const model of response.data.models ?? []) {
      const id = model.name?.replace(/^models\//, '').trim();
      if (!id) {
        continue;
      }

      references.push({
        id,
        name: model.displayName,
        contextLength: model.inputTokenLimit,
        maxTokens: model.outputTokenLimit,
        supportedGenerationMethods: model.supportedGenerationMethods,
        raw: {
          version: model.version,
        },
      });
    }

    return references;
  }
}
