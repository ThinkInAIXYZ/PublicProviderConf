import { DataFetcher } from '../fetcher/data-fetcher';
import { DataProcessor } from '../processor/data-processor';
import { OutputManager } from '../output/output-manager';
import { loadConfig } from '../config/app-config';
import {
  ModelsDevApiResponse,
  ModelsDevProvider,
  applyReasoningPortraits,
  applyModelsDevTypeFallbacks,
  buildAiHubMixReasoningHintMap,
  buildAiHubMixTypeMap,
  createModelsDevProvider,
  mergeProviders,
} from '../models/models-dev';
import { mergeProviderWithTemplate } from '../templates/models-dev-template-manager';
import {
  loadBaseContext,
  findProviderConfig,
  normalizeProviderId,
  createProvider,
  getExclusionReason,
  loadAihubmixFallback,
} from './models-dev-shared';
import { createProviderInfo, ProviderInfo } from '../models/provider-info';
import { ZenMuxProvider } from '../providers/ZenMuxProvider';
import { deriveDoubaoProvider } from './derived-providers';
import { buildPreferredDoubaoProvider } from './doubao-source';

function removeProviderById(
  providers: ModelsDevApiResponse['providers'],
  targetId: string,
): ModelsDevApiResponse['providers'] {
  const normalizedTarget = normalizeProviderId(targetId);

  if (Array.isArray(providers)) {
    return providers.filter(
      provider => normalizeProviderId(provider.id || provider.name) !== normalizedTarget,
    );
  }

  if (providers && typeof providers === 'object') {
    const record = { ...(providers as Record<string, ModelsDevProvider>) };
    for (const [key, provider] of Object.entries(record)) {
      if (normalizeProviderId(provider.id || key || provider.name) === normalizedTarget) {
        delete record[key];
      }
    }
    return record;
  }

  return providers;
}

export async function fetchSpecificProviders(
  providerNames: string[],
  outputDir: string,
): Promise<ModelsDevApiResponse> {
  console.log(`🚀 Fetching models from providers: ${providerNames.join(', ')}`);

  const config = loadConfig();
  const targetProviders = new Set(providerNames.map(name => normalizeProviderId(name)));

  const {
    baseDataWithTemplates,
    templatesById,
    existingProviderIds,
    exclusionSources,
  } = await loadBaseContext();

  const fetcher = new DataFetcher();
  const processor = new DataProcessor();
  const outputManager = new OutputManager(outputDir);
  const processingOptions = {
    normalize: true,
    deduplicate: true,
    sort: true,
    validate: true,
  } as const;

  for (const providerName of providerNames) {
    const normalizedName = normalizeProviderId(providerName);

    if (normalizedName === 'zenmux' || normalizedName === 'doubao') {
      continue;
    }

    if (existingProviderIds.has(normalizedName)) {
      const reason = getExclusionReason(normalizedName, exclusionSources);
      console.log(`ℹ️  Skipping ${providerName}: ${reason}`);
      continue;
    }

    const providerConfigEntry = findProviderConfig(config.providers, normalizedName);

    if (providerConfigEntry) {
      const provider = createProvider(providerConfigEntry.key, providerConfigEntry.config);
      if (provider) {
        fetcher.addProvider(provider);
        console.log(`✅ Added provider: ${providerName}`);
      } else {
        console.log(`⚠️  Could not create provider: ${providerName}`);
      }
    } else {
      console.log(`⚠️  Provider not found in default config: ${providerName}`);
    }
  }

  try {
    const providerInfos = fetcher.hasProviders() ? await fetcher.fetchAll() : [];
    if (fetcher.hasProviders()) {
      console.log(`✅ Successfully fetched ${providerInfos.length} providers`);
    } else {
      console.log('ℹ️  No live providers fetched; relying on templates where available.');
    }

    const processedProviders = await processor.processProviders(providerInfos, processingOptions);

    console.log(`📊 Processed ${processedProviders.length} providers with data validation`);

    const aihubmixLive = processedProviders.find(
      provider => normalizeProviderId(provider.provider) === 'aihubmix',
    );
    let aihubmixData;

    if (aihubmixLive) {
      aihubmixData = createModelsDevProvider(aihubmixLive);
      console.log('🔗 Using live AIHubMix data for capability fallbacks.');
    } else {
      const fallback = await loadAihubmixFallback(outputDir);
      if (fallback) {
        aihubmixData = fallback;
        console.log('📦 Using cached AIHubMix data for capability fallbacks.');
      } else {
        console.warn('⚠️  AIHubMix data unavailable; capability fallbacks will rely on portraits only.');
      }
    }

    const zenmuxSpecificProviders: ProviderInfo[] = [];
    let zenmuxInfo: ProviderInfo | null = null;
    let fallbackDoubao: ProviderInfo | null = null;
    const needsZenmuxData =
      targetProviders.has('zenmux') || targetProviders.has('doubao');

    if (needsZenmuxData) {
      const zenmuxConfig = config.providers['zenmux'];
      if (zenmuxConfig?.apiUrl) {
        const zenmuxProvider = new ZenMuxProvider(
          zenmuxConfig.apiUrl,
          baseDataWithTemplates,
          aihubmixData,
        );
        const zenmuxModels = await zenmuxProvider.fetchModels();
        if (zenmuxModels.length > 0) {
          zenmuxInfo = createProviderInfo(
            zenmuxProvider.providerId(),
            zenmuxProvider.providerName(),
            zenmuxModels,
          );
          fallbackDoubao = deriveDoubaoProvider(zenmuxInfo);
        } else {
          console.log('ℹ️  ZenMux provider returned no models while deriving requested providers.');
        }
      } else {
        console.warn('⚠️  ZenMux config missing; cannot derive ZenMux-based providers.');
      }
    }

    const preferredDoubao = targetProviders.has('doubao')
      ? await buildPreferredDoubaoProvider(fallbackDoubao)
      : { provider: null, source: 'unavailable' as const };

    const preferredProviderInfos = [
      ...(targetProviders.has('zenmux') && zenmuxInfo ? [zenmuxInfo] : []),
      ...(preferredDoubao.provider ? [preferredDoubao.provider] : []),
    ];

    if (preferredProviderInfos.length > 0) {
      const processedPreferredProviders = await processor.processProviders(
        preferredProviderInfos,
        processingOptions,
      );

      for (const provider of processedPreferredProviders) {
        if (targetProviders.has(normalizeProviderId(provider.provider))) {
          zenmuxSpecificProviders.push(provider);
          if (normalizeProviderId(provider.provider) === 'doubao') {
            console.log(`🧭 Added provider: ${provider.provider} (${preferredDoubao.source})`);
          } else {
            console.log(`🧭 Added provider: ${provider.provider}`);
          }
        }
      }
    }

    const additionalProviders = [...processedProviders, ...zenmuxSpecificProviders]
      .map(createModelsDevProvider)
      .map(provider => {
        const normalizedId = normalizeProviderId(provider.id);
        const template = templatesById.get(normalizedId);
        if (template) {
          templatesById.delete(normalizedId);
        }
        return mergeProviderWithTemplate(provider, template);
      })
      .filter(provider => targetProviders.has(normalizeProviderId(provider.id)));

    const templateOnlyProviders = Array.from(templatesById.values()).filter(provider =>
      targetProviders.has(normalizeProviderId(provider.id)) && provider.models.length > 0,
    );

    const hasZenmuxProvider = additionalProviders.some(
      provider => normalizeProviderId(provider.id) === 'zenmux',
    );
    const baseProviders = hasZenmuxProvider
      ? removeProviderById(baseDataWithTemplates.providers, 'zenmux')
      : baseDataWithTemplates.providers;

    const mergedProviders = mergeProviders(baseProviders, [
      ...additionalProviders,
      ...templateOnlyProviders,
    ]);

    const aggregatedData: ModelsDevApiResponse = {
      ...baseDataWithTemplates,
      providers: mergedProviders,
      updated_at: new Date().toISOString(),
    };

    const aihubmixTypeMap = buildAiHubMixTypeMap(aihubmixData);
    const aihubmixReasoningHintMap = buildAiHubMixReasoningHintMap(aihubmixData);
    applyModelsDevTypeFallbacks(aggregatedData, aihubmixTypeMap);
    applyReasoningPortraits(aggregatedData, aihubmixReasoningHintMap);

    await outputManager.writeAllFiles(aggregatedData);

    console.log(`📁 Output files written to: ${outputDir}`);

    for (const provider of additionalProviders) {
      console.log(`   📋 Added ${provider.name}: ${provider.models.length} models`);
    }

    for (const provider of templateOnlyProviders) {
      console.log(`   📋 Added template-only ${provider.name}: ${provider.models.length} models`);
    }

    const totalProviders = outputManager.getProviderCount(aggregatedData);
    console.log(`\n🎉 Combined dataset now includes ${totalProviders} providers`);

    return aggregatedData;
  } catch (error) {
    console.error('❌ Failed to fetch providers:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}
