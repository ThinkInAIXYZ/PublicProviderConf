"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAllProviders = fetchAllProviders;
const data_fetcher_1 = require("../fetcher/data-fetcher");
const output_manager_1 = require("../output/output-manager");
const app_config_1 = require("../config/app-config");
const providers_1 = require("../providers");
async function fetchAllProviders(outputDir, configPath) {
    console.log('Fetching models from all providers...');
    // Load configuration
    const config = (0, app_config_1.loadConfig)(configPath);
    const fetcher = new data_fetcher_1.DataFetcher();
    // Add PPInfra provider (no API key required)
    const ppinfraConfig = config.providers['ppinfra'];
    const ppinfraUrl = ppinfraConfig?.apiUrl || 'https://api.ppinfra.com/openai/v1/models';
    const ppinfra = new providers_1.PPInfraProvider(ppinfraUrl);
    fetcher.addProvider(ppinfra);
    // Add OpenRouter provider (no API key required)
    const openrouterConfig = config.providers['openrouter'];
    const openrouterUrl = openrouterConfig?.apiUrl || 'https://openrouter.ai/api/v1/models';
    const openrouter = new providers_1.OpenRouterProvider(openrouterUrl);
    fetcher.addProvider(openrouter);
    // Add Gemini provider (optional API key for complete model list)
    const geminiConfig = config.providers['gemini'];
    const geminiApiKey = geminiConfig?.getApiKey() || process.env.GEMINI_API_KEY;
    const gemini = new providers_1.GeminiProvider(geminiApiKey);
    fetcher.addProvider(gemini);
    // Add Vercel provider (no API key required)
    const vercelConfig = config.providers['vercel'];
    const vercelUrl = vercelConfig?.apiUrl || 'https://ai-gateway.vercel.sh/v1/models';
    const vercel = new providers_1.VercelProvider(vercelUrl);
    fetcher.addProvider(vercel);
    // Add GitHub AI provider (no API key required)
    const githubAiConfig = config.providers['github_ai'];
    const githubAiUrl = githubAiConfig?.apiUrl || 'https://models.inference.ai.azure.com/models';
    const githubAi = new providers_1.GithubAiProvider(githubAiUrl);
    fetcher.addProvider(githubAi);
    // Add Tokenflux provider (no API key required)
    const tokenfluxConfig = config.providers['tokenflux'];
    const tokenfluxUrl = tokenfluxConfig?.apiUrl || 'https://tokenflux.ai/v1/models';
    const tokenflux = new providers_1.TokenfluxProvider(tokenfluxUrl);
    fetcher.addProvider(tokenflux);
    // Add Groq provider (requires API key)
    const groqConfig = config.providers['groq'];
    const groqApiKey = groqConfig?.getApiKey() || process.env.GROQ_API_KEY;
    if (groqApiKey) {
        const groq = new providers_1.GroqProvider(groqApiKey);
        fetcher.addProvider(groq);
    }
    else {
        console.log('⚠️  Skipping Groq: No API key found (set GROQ_API_KEY or configure in providers.toml)');
    }
    // Add DeepSeek provider (no API key required, uses web scraping)
    const deepseek = new providers_1.DeepSeekProvider();
    fetcher.addProvider(deepseek);
    // Add OpenAI provider (optional API key for complete model list)
    const openaiConfig = config.providers['openai'];
    const openaiApiKey = openaiConfig?.getApiKey() || process.env.OPENAI_API_KEY;
    const openai = new providers_1.OpenAIProvider(openaiApiKey);
    fetcher.addProvider(openai);
    // Add Anthropic provider (optional API key for complete model list)
    const anthropicConfig = config.providers['anthropic'];
    const anthropicApiKey = anthropicConfig?.getApiKey() || process.env.ANTHROPIC_API_KEY;
    const anthropic = new providers_1.AnthropicProvider(anthropicApiKey);
    fetcher.addProvider(anthropic);
    // Add Ollama provider (template-based, no API key required)
    const ollama = new providers_1.OllamaProvider();
    fetcher.addProvider(ollama);
    // Add SiliconFlow provider (template-based, no API key required)
    const siliconflow = new providers_1.SiliconFlowProvider();
    fetcher.addProvider(siliconflow);
    const providerData = await fetcher.fetchAll();
    const outputManager = new output_manager_1.OutputManager(outputDir);
    await outputManager.writeProviderFiles(providerData);
    await outputManager.writeAggregatedFile(providerData);
    console.log(`✅ Successfully fetched and wrote ${providerData.length} providers`);
}
//# sourceMappingURL=fetch-all.js.map