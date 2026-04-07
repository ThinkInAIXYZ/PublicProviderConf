import { createProviderInfo, ProviderInfo } from '../models/provider-info';
import {
  DEFAULT_VOLCENGINE_ARK_CONTROL_API_URL,
  VOLCENGINE_ARK_CONTROL_DOC_URL,
  resolveVolcengineArkCredentials,
  VolcengineArkDoubaoProvider,
} from '../providers/VolcengineArkDoubaoProvider';

export type DoubaoSource = 'official-volcengine-ark' | 'zenmux-fallback' | 'unavailable';

export interface PreferredDoubaoProviderResult {
  provider: ProviderInfo | null;
  source: DoubaoSource;
}

export async function buildPreferredDoubaoProvider(
  fallbackProvider: ProviderInfo | null,
  apiUrl: string = DEFAULT_VOLCENGINE_ARK_CONTROL_API_URL,
): Promise<PreferredDoubaoProviderResult> {
  const credentials = resolveVolcengineArkCredentials();

  if (credentials) {
    try {
      const provider = new VolcengineArkDoubaoProvider(
        apiUrl,
        credentials,
        fallbackProvider?.models ?? [],
      );
      const models = await provider.fetchModels();

      if (models.length > 0) {
        return {
          provider: createProviderInfo(provider.providerId(), provider.providerName(), models, {
            lastUpdated: new Date(),
            api: apiUrl,
            doc: VOLCENGINE_ARK_CONTROL_DOC_URL,
            description: fallbackProvider
              ? 'Fetched from the Volcengine Ark control-plane APIs and enriched with ZenMux capability metadata when the official API omits those fields.'
              : 'Fetched from the Volcengine Ark control-plane APIs.',
            metadata: {
              sourcePriority: 'official-volcengine-ark',
              officialApiActions: [
                'ListFoundationModels',
                'GetFoundationModelVersion',
                'ListFoundationModelVersions',
              ],
              fallbackEnrichmentProvider: fallbackProvider?.provider,
            },
          }),
          source: 'official-volcengine-ark',
        };
      }

      console.warn('⚠️  Volcengine Ark returned no Doubao models; falling back to ZenMux if available.');
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️  Failed to fetch Doubao from Volcengine Ark: ${reason}`);
      console.warn('⚠️  Falling back to ZenMux-derived Doubao data if available.');
    }
  } else {
    console.log(
      'ℹ️  Volcengine Ark credentials not found; set VOLC_ACCESSKEY/VOLC_SECRETKEY or VOLCENGINE_ACCESS_KEY_ID/VOLCENGINE_SECRET_ACCESS_KEY to prefer the official Doubao source.',
    );
  }

  if (fallbackProvider) {
    return {
      provider: fallbackProvider,
      source: 'zenmux-fallback',
    };
  }

  return {
    provider: null,
    source: 'unavailable',
  };
}
