import { DataFetcher } from '../fetcher/data-fetcher';
import { DataProcessor } from '../processor/data-processor';
import { OutputManager } from '../output/output-manager';
import { loadConfig } from '../config/app-config';
import {
  ModelsDevApiResponse,
  applyReasoningPortraits,
  applyModelsDevTypeFallbacks,
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

  for (const providerName of providerNames) {
    const normalizedName = normalizeProviderId(providerName);

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

    const processedProviders = await processor.processProviders(providerInfos, {
      normalize: true,
      deduplicate: true,
      sort: true,
      validate: true,
    });

    console.log(`📊 Processed ${processedProviders.length} providers with data validation`);

    const additionalProviders = processedProviders
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

    const mergedProviders = mergeProviders(baseDataWithTemplates.providers, [
      ...additionalProviders,
      ...templateOnlyProviders,
    ]);

    const aggregatedData: ModelsDevApiResponse = {
      ...baseDataWithTemplates,
      providers: mergedProviders,
      updated_at: new Date().toISOString(),
    };

    const aihubmixFallback = await loadAihubmixFallback(outputDir);
    const aihubmixTypeMap = buildAiHubMixTypeMap(aihubmixFallback ?? undefined);
    applyModelsDevTypeFallbacks(aggregatedData, aihubmixTypeMap);
    applyReasoningPortraits(aggregatedData);

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
