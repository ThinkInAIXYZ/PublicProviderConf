"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSpecificProviders = fetchSpecificProviders;
const data_fetcher_1 = require("../fetcher/data-fetcher");
const output_manager_1 = require("../output/output-manager");
const app_config_1 = require("../config/app-config");
const providers_1 = require("../providers");
async function fetchSpecificProviders(providerNames, outputDir, configPath) {
    console.log(`Fetching models from providers: ${providerNames.join(', ')}`);
    // Load configuration
    const config = (0, app_config_1.loadConfig)(configPath);
    const fetcher = new data_fetcher_1.DataFetcher();
    for (const providerName of providerNames) {
        const normalizedName = providerName.trim().toLowerCase();
        switch (normalizedName) {
            case 'ppinfra': {
                const ppinfraConfig = config.providers['ppinfra'];
                const ppinfraUrl = ppinfraConfig?.apiUrl || 'https://api.ppinfra.com/openai/v1/models';
                const ppinfra = new providers_1.PPInfraProvider(ppinfraUrl);
                fetcher.addProvider(ppinfra);
                break;
            }
            case 'openrouter': {
                const openrouterConfig = config.providers['openrouter'];
                const openrouterUrl = openrouterConfig?.apiUrl || 'https://openrouter.ai/api/v1/models';
                const openrouter = new providers_1.OpenRouterProvider(openrouterUrl);
                fetcher.addProvider(openrouter);
                break;
            }
            case 'gemini': {
                const geminiConfig = config.providers['gemini'];
                const geminiApiKey = geminiConfig?.getApiKey() || process.env.GEMINI_API_KEY;
                const gemini = new providers_1.GeminiProvider(geminiApiKey);
                fetcher.addProvider(gemini);
                break;
            }
            case 'vercel': {
                const vercelConfig = config.providers['vercel'];
                const vercelUrl = vercelConfig?.apiUrl || 'https://ai-gateway.vercel.sh/v1/models';
                const vercel = new providers_1.VercelProvider(vercelUrl);
                fetcher.addProvider(vercel);
                break;
            }
            case 'github_ai': {
                const githubAiConfig = config.providers['github_ai'];
                const githubAiUrl = githubAiConfig?.apiUrl || 'https://models.inference.ai.azure.com/models';
                const githubAi = new providers_1.GithubAiProvider(githubAiUrl);
                fetcher.addProvider(githubAi);
                break;
            }
            case 'tokenflux': {
                const tokenfluxConfig = config.providers['tokenflux'];
                const tokenfluxUrl = tokenfluxConfig?.apiUrl || 'https://tokenflux.ai/v1/models';
                const tokenflux = new providers_1.TokenfluxProvider(tokenfluxUrl);
                fetcher.addProvider(tokenflux);
                break;
            }
            case 'groq': {
                const groqConfig = config.providers['groq'];
                const groqApiKey = groqConfig?.getApiKey() || process.env.GROQ_API_KEY;
                if (groqApiKey) {
                    const groq = new providers_1.GroqProvider(groqApiKey);
                    fetcher.addProvider(groq);
                }
                else {
                    console.error('❌ Groq requires an API key. Set GROQ_API_KEY environment variable or configure in providers.toml');
                }
                break;
            }
            case 'deepseek': {
                const deepseek = new providers_1.DeepSeekProvider();
                fetcher.addProvider(deepseek);
                break;
            }
            case 'openai': {
                const openaiConfig = config.providers['openai'];
                const openaiApiKey = openaiConfig?.getApiKey() || process.env.OPENAI_API_KEY;
                const openai = new providers_1.OpenAIProvider(openaiApiKey);
                fetcher.addProvider(openai);
                break;
            }
            case 'anthropic': {
                const anthropicConfig = config.providers['anthropic'];
                const anthropicApiKey = anthropicConfig?.getApiKey() || process.env.ANTHROPIC_API_KEY;
                const anthropic = new providers_1.AnthropicProvider(anthropicApiKey);
                fetcher.addProvider(anthropic);
                break;
            }
            case 'ollama': {
                const ollama = new providers_1.OllamaProvider();
                fetcher.addProvider(ollama);
                break;
            }
            case 'siliconflow': {
                const siliconflow = new providers_1.SiliconFlowProvider();
                fetcher.addProvider(siliconflow);
                break;
            }
            default: {
                console.error(`⚠️  Unknown provider: ${providerName}`);
                break;
            }
        }
    }
    const providerData = await fetcher.fetchAll();
    if (providerData.length === 0) {
        console.error('❌ No valid providers found or no data fetched');
        return;
    }
    const outputManager = new output_manager_1.OutputManager(outputDir);
    await outputManager.writeProviderFiles(providerData);
    console.log(`✅ Successfully fetched and wrote ${providerData.length} providers`);
    // Print summary for each provider
    for (const providerInfo of providerData) {
        console.log(`   📋 ${providerInfo.providerName}: ${providerInfo.models.length} models`);
    }
}
//# sourceMappingURL=fetch-providers.js.map