import { promises as fs } from 'fs';
import { join } from 'path';
import { DataFetcher } from '../fetcher/data-fetcher';
import { DataProcessor } from '../processor/data-processor';
import { OutputManager } from '../output/output-manager';
import { loadConfig } from '../config/app-config';
import {
  ModelsDevApiResponse,
  ModelsDevProvider,
  createModelsDevProvider,
  getProviderId,
  mergeProviders,
} from '../models/models-dev';
import { createProviderInfo, ProviderInfo } from '../models/provider-info';
import { mergeProviderWithTemplate } from '../templates/models-dev-template-manager';
import { ZenMuxProvider } from '../providers/ZenMuxProvider';
import {
  loadBaseContext,
  createProvidersFromConfig,
  normalizeProviderId,
} from './models-dev-shared';

async function loadAihubmixFallback(outputDir: string): Promise<ModelsDevProvider | null> {
  const candidates = [join(outputDir, 'aihubmix.json'), join('dist', 'aihubmix.json')];

  for (const filePath of candidates) {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as ModelsDevProvider;
      if (parsed && Array.isArray(parsed.models)) {
        return parsed;
      }
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        continue;
      }
      console.warn(`⚠️  Failed to read ${filePath}: ${err.message ?? String(err)}`);
    }
  }

  return null;
}

function removeProviderById(
  providers: ModelsDevApiResponse['providers'],
  targetId: string,
): ModelsDevApiResponse['providers'] {
  const normalizedTarget = normalizeProviderId(targetId);

  if (Array.isArray(providers)) {
    return providers.filter(
      provider => normalizeProviderId(getProviderId(provider)) !== normalizedTarget,
    );
  }

  if (providers && typeof providers === 'object') {
    const record = { ...(providers as Record<string, ModelsDevProvider>) };
    for (const [key, provider] of Object.entries(record)) {
      if (normalizeProviderId(getProviderId(provider)) === normalizedTarget) {
        delete record[key];
      }
    }
    return record;
  }

  return providers;
}

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

    const aihubmixLive = processedProviders.find(
      provider => normalizeProviderId(provider.provider) === 'aihubmix',
    );
    let aihubmixData: ModelsDevProvider | undefined;

    if (aihubmixLive) {
      aihubmixData = createModelsDevProvider(aihubmixLive);
      console.log('🔗 Using live AIHubMix data for ZenMux matching.');
    } else {
      const fallback = await loadAihubmixFallback(outputDir);
      if (fallback) {
        aihubmixData = fallback;
        console.log('📦 Using cached AIHubMix data for ZenMux matching.');
      } else {
        console.warn('⚠️  AIHubMix data unavailable; ZenMux will rely on models.dev only.');
      }
    }

    const zenmuxConfig = config.providers['zenmux'];
    const zenmuxProviders: ProviderInfo[] = [];

    if (zenmuxConfig?.apiUrl) {
      const zenmuxProvider = new ZenMuxProvider(
        zenmuxConfig.apiUrl,
        baseDataWithTemplates,
        aihubmixData,
      );
      const zenmuxModels = await zenmuxProvider.fetchModels();
      if (zenmuxModels.length > 0) {
        const zenmuxInfo = createProviderInfo(
          zenmuxProvider.providerId(),
          zenmuxProvider.providerName(),
          zenmuxModels,
        );
        const [processedZenmux] = await processor.processProviders([zenmuxInfo], {
          normalize: true,
          deduplicate: true,
          sort: true,
          validate: true,
          minModelsPerProvider: 1,
        });
        if (processedZenmux) {
          zenmuxProviders.push(processedZenmux);
          console.log(`🧭 ZenMux provider ready: ${processedZenmux.models.length} models`);
        }
      } else {
        console.log('ℹ️  ZenMux provider returned no models; keeping base/template data.');
      }
    } else {
      console.warn('⚠️  ZenMux config missing; skipping ZenMux provider fetch.');
    }

    const combinedProviders = [...processedProviders, ...zenmuxProviders];

    const additionalProviders = combinedProviders
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
