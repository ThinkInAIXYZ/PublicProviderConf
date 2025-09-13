import { ModelInfo } from './model_info';

export interface ProviderInfo {
  provider: string;
  providerName: string;
  lastUpdated: string; // ISO 8601 string format for DateTime<Utc>
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
    lastUpdated: new Date().toISOString(),
    models,
  };
}