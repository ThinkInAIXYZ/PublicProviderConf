#!/usr/bin/env node

import { Command } from 'commander';
import * as providers from './providers';
import { Provider } from './providers/Provider';
import { DataFetcher } from './fetcher/data-fetcher';
import { ModelsDevClient } from './fetcher/models-dev-client';
import { DataProcessor } from './processor/data-processor';
import { loadConfig, getDefaultConfig } from './config/app-config';
import {
  ModelsDevApiResponse,
  ModelsDevProvider,
  createModelsDevProvider,
  mergeProviders,
  normalizeProvidersList,
  getProviderId as getModelsDevProviderId,
  providersToRecord,
} from './models/models-dev';
import { ModelsDevOutputManager } from './output/models-dev-output-manager';
import {
  ModelsDevTemplateManager,
  mergeProviderWithTemplate,
} from './templates/models-dev-template-manager';

const program = new Command();

const PROVIDER_ALIASES: Record<string, string> = {
  'github-ai': 'github-models',
};

program
  .name('public-provider-conf')
  .description('A tool to fetch and aggregate AI model information from various providers')
  .version('1.0.0');

program
  .command('fetch-all')
  .description('Fetch models from all configured providers')
  .option('-o, --output <directory>', 'Output directory for generated JSON files', 'dist')
  .option('-c, --config <path>', 'Configuration file path', 'config/providers.toml')
  .action(async (options: { output: string; config: string }) => {
    await fetchAllProviders(options.output, options.config);
  });

program
  .command('fetch-providers')
  .description('Fetch models from specific providers')
  .option('-p, --providers <names>', 'Comma-separated list of provider names')
  .option('-o, --output <directory>', 'Output directory for generated JSON files', 'dist')
  .option('-c, --config <path>', 'Configuration file path', 'config/providers.toml')
  .action(async (options: { providers?: string; output: string; config: string }) => {
    if (!options.providers) {
      console.error('❌ Please specify providers with -p option');
      process.exit(1);
    }
    const providerList = options.providers.split(',').map((p: string) => p.trim());
    await fetchSpecificProviders(providerList, options.output, options.config);
  });

async function fetchAllProviders(outputDir: string, configPath: string): Promise<void> {
  console.log('🚀 Fetching models from all providers...');

  const config = loadConfig(configPath);
  console.log(`📋 Loaded configuration with ${Object.keys(config.providers).length} providers`);

  const { baseDataWithTemplates, templatesById, existingProviderIds } = await loadBaseContext();
  console.log(`🌐 models.dev already provides ${existingProviderIds.size} providers`);

  const fetcher = new DataFetcher();
  const processor = new DataProcessor();
  const outputManager = new ModelsDevOutputManager(outputDir);

  const providerInstances = createProvidersFromConfig(config, existingProviderIds);
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
      provider => provider.models.length > 0
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
      } providers`
    );

    const totalProviders = outputManager.getProviderCount(aggregatedData);
    console.log(`📦 Combined dataset now includes ${totalProviders} providers`);
  } catch (error) {
    console.error('❌ Failed to fetch providers:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

async function fetchSpecificProviders(
  providerNames: string[],
  outputDir: string,
  configPath: string
): Promise<void> {
  console.log(`🚀 Fetching models from providers: ${providerNames.join(', ')}`);

  const config = loadConfig(configPath);
  const targetProviders = new Set(providerNames.map(name => normalizeProviderId(name)));

  const { baseDataWithTemplates, templatesById, existingProviderIds } = await loadBaseContext();

  const fetcher = new DataFetcher();
  const processor = new DataProcessor();
  const outputManager = new ModelsDevOutputManager(outputDir);

  for (const providerName of providerNames) {
    const normalizedName = normalizeProviderId(providerName);
    const providerConfigEntry = findProviderConfig(config.providers, normalizedName);

    if (existingProviderIds.has(normalizedName)) {
      console.log(`ℹ️  Skipping ${providerName}: already available via models.dev or templates`);
      continue;
    }

    if (providerConfigEntry) {
      const provider = createProvider(providerConfigEntry.key, providerConfigEntry.config);
      if (provider) {
        fetcher.addProvider(provider);
        console.log(`✅ Added provider: ${providerName}`);
      } else {
        console.log(`⚠️  Could not create provider: ${providerName}`);
      }
    } else {
      console.log(`⚠️  Provider not found in config: ${providerName}`);
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
      targetProviders.has(normalizeProviderId(provider.id)) && provider.models.length > 0
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

    const totalProviders = outputManager.getProviderCount(aggregatedData);
    console.log(`\n🎉 Combined dataset now includes ${totalProviders} providers`);
  } catch (error) {
    console.error('❌ Failed to fetch providers:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

function createProvidersFromConfig(
  config: ReturnType<typeof getDefaultConfig>,
  excludedProviders: Set<string> = new Set()
): Provider[] {
  const providerInstances: Provider[] = [];

  for (const [providerId, providerConfig] of Object.entries(config.providers)) {
    if (excludedProviders.has(normalizeProviderId(providerId))) {
      console.log(`ℹ️  Skipping ${providerId}: already available via models.dev or templates`);
      continue;
    }

    const provider = createProvider(providerId, providerConfig);
    if (provider) {
      providerInstances.push(provider);
    }
  }

  return providerInstances;
}

function createProvider(providerId: string, config: any): Provider | null {
  try {
    switch (providerId) {
      case 'ppinfra':
        return new providers.PPInfraProvider(config.apiUrl);

      case 'openrouter':
        return new providers.OpenRouterProvider(config.apiUrl);

      case 'gemini':
        return new providers.GeminiProvider(config.getApiKey());

      case 'vercel':
        return new providers.VercelProvider(config.apiUrl);

      case 'github_ai':
        return new providers.GithubAiProvider(config.apiUrl);

      case 'tokenflux':
        return new providers.TokenfluxProvider(config.apiUrl);

      case 'groq': {
        const groqApiKey = config.getApiKey();
        if (groqApiKey) {
          return new providers.GroqProvider(groqApiKey);
        }
        console.log('⚠️  Skipping Groq: No API key found (set GROQ_API_KEY environment variable)');
        return null;
      }

      case 'deepseek':
        return new providers.DeepSeekProvider();

      case 'openai':
        return new providers.OpenAIProvider(config.getApiKey());

      case 'anthropic':
        return new providers.AnthropicProvider(config.getApiKey());

      default:
        console.log(`⚠️  Unknown provider: ${providerId}`);
        return null;
    }
  } catch (error) {
    console.error(`❌ Failed to create provider ${providerId}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

function normalizeProviderId(providerId: string): string {
  const normalized = providerId.trim().toLowerCase().replace(/_/g, '-');
  return PROVIDER_ALIASES[normalized] ?? normalized;
}

function findProviderConfig(
  providersConfig: ReturnType<typeof getDefaultConfig>['providers'],
  normalizedId: string
): { key: string; config: any } | null {
  for (const [key, config] of Object.entries(providersConfig)) {
    if (normalizeProviderId(key) === normalizedId) {
      return { key, config };
    }
  }

  return null;
}

interface BaseContext {
  baseDataWithTemplates: ModelsDevApiResponse;
  templatesById: Map<string, ModelsDevProvider>;
  existingProviderIds: Set<string>;
}

async function loadBaseContext(): Promise<BaseContext> {
  const modelsDevClient = new ModelsDevClient();
  const baseData = await modelsDevClient.fetchProviders();

  const templateManager = new ModelsDevTemplateManager();
  const loadedTemplates = await templateManager.loadAllTemplates();

  const templatesById = new Map<string, ModelsDevProvider>();
  const templateIds: string[] = [];

  for (const template of loadedTemplates.values()) {
    const normalizedId = normalizeProviderId(template.id);
    templatesById.set(normalizedId, template);
    templateIds.push(normalizedId);
  }

  const baseProvidersRecord = providersToRecord(baseData.providers);
  for (const [key, provider] of Object.entries(baseProvidersRecord)) {
    const normalizedId = normalizeProviderId(getModelsDevProviderId(provider));
    const template = templatesById.get(normalizedId);
    if (template) {
      baseProvidersRecord[key] = mergeProviderWithTemplate(provider, template);
      templatesById.delete(normalizedId);
    }
  }

  const baseProvidersWithTemplates = templateManager.rebuildProviders(
    baseData.providers,
    baseProvidersRecord
  );

  const baseDataWithTemplates: ModelsDevApiResponse = {
    ...baseData,
    providers: baseProvidersWithTemplates,
  };

  const existingProviderIds = new Set(
    normalizeProvidersList(baseDataWithTemplates.providers).map(provider =>
      normalizeProviderId(getModelsDevProviderId(provider))
    )
  );

  for (const id of templateIds) {
    existingProviderIds.add(id);
  }

  return {
    baseDataWithTemplates,
    templatesById,
    existingProviderIds,
  };
}

program.parse();
