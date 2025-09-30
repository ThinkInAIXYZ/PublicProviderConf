import { ModelInfo } from './model_info';

export interface ProviderInfo {
  provider: string;
  providerName: string;
  lastUpdated: string; // ISO 8601 string format for DateTime<Utc>
  models: ModelInfo[];
  api?: string;
  doc?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export function createProviderInfo(
  provider: string,
  providerName: string,
  models: ModelInfo[],
  overrides: Partial<Omit<ProviderInfo, 'provider' | 'providerName' | 'models'>> = {},
): ProviderInfo {
  const { lastUpdated = new Date().toISOString(), ...rest } = overrides;

  return {
    provider,
    providerName,
    models,
    lastUpdated,
    ...rest,
  };
}
