#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const providers = __importStar(require("./providers"));
const data_fetcher_1 = require("./fetcher/data-fetcher");
const output_manager_1 = require("./output/output-manager");
const data_processor_1 = require("./processor/data-processor");
const app_config_1 = require("./config/app-config");
const program = new commander_1.Command();
program
    .name('public-provider-conf')
    .description('A tool to fetch and aggregate AI model information from various providers')
    .version('1.0.0');
program
    .command('fetch-all')
    .description('Fetch models from all configured providers')
    .option('-o, --output <directory>', 'Output directory for generated JSON files', 'dist')
    .option('-c, --config <path>', 'Configuration file path', 'config/providers.toml')
    .action(async (options) => {
    await fetchAllProviders(options.output, options.config);
});
program
    .command('fetch-providers')
    .description('Fetch models from specific providers')
    .option('-p, --providers <names>', 'Comma-separated list of provider names')
    .option('-o, --output <directory>', 'Output directory for generated JSON files', 'dist')
    .option('-c, --config <path>', 'Configuration file path', 'config/providers.toml')
    .action(async (options) => {
    if (!options.providers) {
        console.error('❌ Please specify providers with -p option');
        process.exit(1);
    }
    const providerList = options.providers.split(',').map((p) => p.trim());
    await fetchSpecificProviders(providerList, options.output, options.config);
});
async function fetchAllProviders(outputDir, configPath) {
    console.log('🚀 Fetching models from all providers...');
    // Load configuration
    const config = (0, app_config_1.loadConfig)(configPath);
    console.log(`📋 Loaded configuration with ${Object.keys(config.providers).length} providers`);
    const fetcher = new data_fetcher_1.DataFetcher();
    const outputManager = new output_manager_1.OutputManager(outputDir);
    const processor = new data_processor_1.DataProcessor();
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
    }
    catch (error) {
        console.error('❌ Failed to fetch providers:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
}
async function fetchSpecificProviders(providerNames, outputDir, configPath) {
    console.log(`🚀 Fetching models from providers: ${providerNames.join(', ')}`);
    // Load configuration
    const config = (0, app_config_1.loadConfig)(configPath);
    const fetcher = new data_fetcher_1.DataFetcher();
    const outputManager = new output_manager_1.OutputManager(outputDir);
    const processor = new data_processor_1.DataProcessor();
    // Add specific providers using configuration
    for (const providerName of providerNames) {
        const normalizedName = providerName.trim().toLowerCase();
        const providerConfig = config.providers[normalizedName];
        if (providerConfig) {
            const provider = createProvider(normalizedName, providerConfig);
            if (provider) {
                fetcher.addProvider(provider);
                console.log(`✅ Added provider: ${providerName}`);
            }
            else {
                console.log(`⚠️  Could not create provider: ${providerName}`);
            }
        }
        else {
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
    }
    catch (error) {
        console.error('❌ Failed to fetch providers:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
}
// Helper function to create all providers from configuration
function createProvidersFromConfig(config) {
    const providerInstances = [];
    for (const [providerId, providerConfig] of Object.entries(config.providers)) {
        const provider = createProvider(providerId, providerConfig);
        if (provider) {
            providerInstances.push(provider);
        }
    }
    return providerInstances;
}
// Helper function to create individual provider
function createProvider(providerId, config) {
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
                }
                else {
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
    }
    catch (error) {
        console.error(`❌ Failed to create provider ${providerId}:`, error instanceof Error ? error.message : 'Unknown error');
        return null;
    }
}
program.parse();
//# sourceMappingURL=cli.js.map