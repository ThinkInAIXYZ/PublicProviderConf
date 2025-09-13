#!/usr/bin/env node

import { Command } from 'commander';
import * as providers from './providers';
import { Provider } from './providers/Provider';
import { DataFetcher } from './fetcher/data-fetcher';
import { OutputManager } from './output/output-manager';
import { DataProcessor } from './processor/data-processor';
import { loadConfig, getDefaultConfig } from './config/app-config';
import { createProviderInfo } from './models/provider-info';

const program = new Command();

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
  
  // Load configuration
  const config = loadConfig(configPath);
  console.log(`📋 Loaded configuration with ${Object.keys(config.providers).length} providers`);
  
  const fetcher = new DataFetcher();
  const outputManager = new OutputManager(outputDir);
  const processor = new DataProcessor();
  
  // Add all providers using configuration
  const providerInstances = createProvidersFromConfig(config);
  
  for (const provider of providerInstances) {
    fetcher.addProvider(provider);
  }
  
  try {
    // Fetch models from all providers
    const providerInfos = await fetcher.fetchAll();
    
    console.log(`✅ Successfully fetched ${providerInfos.length} providers`);
    
    // Process and normalize the data
    const processedProviders = await processor.processProviders(providerInfos, {
      normalize: true,
      deduplicate: true,
      sort: true,
      validate: true,
      minModelsPerProvider: 1
    });
    
    console.log(`📊 Processed ${processedProviders.length} providers with data validation`);
    
    // Write output files
    await outputManager.writeAllFiles(processedProviders, true);
    
    console.log(`📁 Output files written to: ${outputDir}`);
    
    // Print summary
    for (const provider of processedProviders) {
      console.log(`   📋 ${provider.providerName}: ${provider.models.length} models`);
    }
    
    const totalModels = processedProviders.reduce((sum, p) => sum + p.models.length, 0);
    console.log(`\n🎉 Total: ${totalModels} models from ${processedProviders.length} providers`);
    
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
  
  // Load configuration
  const config = loadConfig(configPath);
  
  const fetcher = new DataFetcher();
  const outputManager = new OutputManager(outputDir);
  const processor = new DataProcessor();
  
  // Add specific providers using configuration
  for (const providerName of providerNames) {
    const normalizedName = providerName.trim().toLowerCase();
    const providerConfig = config.providers[normalizedName];
    
    if (providerConfig) {
      const provider = createProvider(normalizedName, providerConfig);
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
  
  if (fetcher['providers'].length === 0) {
    console.error('❌ No valid providers found');
    return;
  }
  
  try {
    // Fetch models from selected providers
    const providerInfos = await fetcher.fetchAll();
    
    console.log(`✅ Successfully fetched ${providerInfos.length} providers`);
    
    // Process and normalize the data
    const processedProviders = await processor.processProviders(providerInfos, {
      normalize: true,
      deduplicate: true,
      sort: true,
      validate: true
    });
    
    console.log(`📊 Processed ${processedProviders.length} providers with data validation`);
    
    // Write output files
    await outputManager.writeAllFiles(processedProviders, true);
    
    console.log(`📁 Output files written to: ${outputDir}`);
    
    // Print summary
    for (const provider of processedProviders) {
      console.log(`   📋 ${provider.providerName}: ${provider.models.length} models`);
    }
    
    const totalModels = processedProviders.reduce((sum, p) => sum + p.models.length, 0);
    console.log(`\n🎉 Total: ${totalModels} models from ${processedProviders.length} providers`);
    
  } catch (error) {
    console.error('❌ Failed to fetch providers:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Helper function to create all providers from configuration
function createProvidersFromConfig(config: ReturnType<typeof getDefaultConfig>): Provider[] {
  const providerInstances: Provider[] = [];
  
  for (const [providerId, providerConfig] of Object.entries(config.providers)) {
    const provider = createProvider(providerId, providerConfig);
    if (provider) {
      providerInstances.push(provider);
    }
  }
  
  return providerInstances;
}

// Helper function to create individual provider
function createProvider(providerId: string, config: any): Provider | null {
  try {
    switch (providerId) {
      case 'ppinfra':
        return new providers.PPInfraProvider(config.apiUrl);
      
      case 'openrouter':
        return new providers.OpenRouterProvider(config.apiUrl);
      
      case 'gemini':
        const geminiApiKey = config.getApiKey();
        return new providers.GeminiProvider(geminiApiKey);
      
      case 'vercel':
        return new providers.VercelProvider(config.apiUrl);
      
      case 'github_ai':
        return new providers.GithubAiProvider(config.apiUrl);
      
      case 'tokenflux':
        return new providers.TokenfluxProvider(config.apiUrl);
      
      case 'groq':
        const groqApiKey = config.getApiKey();
        if (groqApiKey) {
          return new providers.GroqProvider(groqApiKey);
        } else {
          console.log('⚠️  Skipping Groq: No API key found (set GROQ_API_KEY environment variable)');
          return null;
        }
      
      case 'deepseek':
        return new providers.DeepSeekProvider();
      
      case 'openai':
        const openaiApiKey = config.getApiKey();
        return new providers.OpenAIProvider(openaiApiKey);
      
      case 'anthropic':
        const anthropicApiKey = config.getApiKey();
        return new providers.AnthropicProvider(anthropicApiKey);
      
      case 'ollama':
        return new providers.OllamaProvider();
      
      case 'siliconflow':
        return new providers.SiliconFlowProvider();
      
      default:
        console.log(`⚠️  Unknown provider: ${providerId}`);
        return null;
    }
  } catch (error) {
    console.error(`❌ Failed to create provider ${providerId}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

program.parse();