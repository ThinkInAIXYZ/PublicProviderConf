import { ModelInfo } from './model-info';

export interface ProviderInfo {
  provider: string;
  providerName: string;
  lastUpdated: Date;
  models: ModelInfo[];
}

export function createProviderInfo(
  provider: string,
  providerName: string,
  models: ModelInfo[],
): ProviderInfo {
  return {
    provider,
    providerName,
    lastUpdated: new Date(),
    models,
  };
}