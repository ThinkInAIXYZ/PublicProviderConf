import { DataFetcher } from '../fetcher/data-fetcher';
import { DataProcessor } from '../processor/data-processor';
import { OutputManager } from '../output/output-manager';
import { loadConfig } from '../config/app-config';
import {
  ModelsDevApiResponse,
  createModelsDevProvider,
  mergeProviders,
} from '../models/models-dev';
import { mergeProviderWithTemplate } from '../templates/models-dev-template-manager';
import {
  loadBaseContext,
  createProvidersFromConfig,
  normalizeProviderId,
} from './models-dev-shared';

export async function fetchAllProviders(outputDir: string): Promise<ModelsDevApiResponse> {
  console.log('🚀 Fetching models from all providers...');

  const config = loadConfig();
  console.log(`📋 Loaded configuration with ${Object.keys(config.providers).length} providers`);

  const {
    baseDataWithTemplates,
    templatesById,
    existingProviderIds,
    exclusionSources,
  } = await loadBaseContext();
  console.log(`🌐 models.dev already provides ${existingProviderIds.size} providers`);

  const fetcher = new DataFetcher();
  const processor = new DataProcessor();
  const outputManager = new OutputManager(outputDir);

  const providerInstances = createProvidersFromConfig(
    config,
    existingProviderIds,
    exclusionSources,
  );
  for (const provider of providerInstances) {
    fetcher.addProvider(provider);
  }

  try {
    const providerInfos = fetcher.hasProviders() ? await fetcher.fetchAll() : [];
    if (!fetcher.hasProviders()) {
      console.log('ℹ️  No additional live providers configured; relying on templates only.');
    } else {
      console.log(`✅ Successfully fetched ${providerInfos.length} providers`);
    }

    const processedProviders = await processor.processProviders(providerInfos, {
      normalize: true,
      deduplicate: true,
      sort: true,
      validate: true,
      minModelsPerProvider: 1,
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
      .filter(provider => provider.models.length > 0);

    const templateOnlyProviders = Array.from(templatesById.values()).filter(
      provider => provider.models.length > 0,
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

    await outputManager.writeAllFiles(aggregatedData);

    console.log(`📁 Output files written to: ${outputDir}`);

    for (const provider of additionalProviders) {
      console.log(`   📋 Added ${provider.name}: ${provider.models.length} models`);
    }

    for (const provider of templateOnlyProviders) {
      console.log(`   📋 Added template-only ${provider.name}: ${provider.models.length} models`);
    }

    const totalAdditionalModels = additionalProviders.reduce((sum, p) => sum + p.models.length, 0);
    const totalTemplateModels = templateOnlyProviders.reduce((sum, p) => sum + p.models.length, 0);

    console.log(
      `\n🎉 Added ${totalAdditionalModels + totalTemplateModels} new models from ${
        additionalProviders.length + templateOnlyProviders.length
      } providers`,
    );

    const totalProviders = outputManager.getProviderCount(aggregatedData);
    console.log(`📦 Combined dataset now includes ${totalProviders} providers`);

    return aggregatedData;
  } catch (error) {
    console.error('❌ Failed to fetch providers:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}
