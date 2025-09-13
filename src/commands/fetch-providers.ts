import { DataFetcher } from '../fetcher/data-fetcher';
import { OutputManager } from '../output/output-manager';
import { loadConfig } from '../config/app-config';
import {
  PPInfraProvider,
  OpenRouterProvider,
  GeminiProvider,
  VercelProvider,
  GithubAiProvider,
  TokenfluxProvider,
  GroqProvider,
  DeepSeekProvider,
  OpenAIProvider,
  AnthropicProvider,
  OllamaProvider,
  SiliconFlowProvider,
} from '../providers';

export async function fetchSpecificProviders(
  providerNames: string[],
  outputDir: string,
  configPath: string
): Promise<void> {
  console.log(`Fetching models from providers: ${providerNames.join(', ')}`);
  
  // Load configuration
  const config = loadConfig(configPath);
  
  const fetcher = new DataFetcher();
  
  for (const providerName of providerNames) {
    const normalizedName = providerName.trim().toLowerCase();
    
    switch (normalizedName) {
      case 'ppinfra': {
        const ppinfraConfig = config.providers['ppinfra'];
        const ppinfraUrl = ppinfraConfig?.apiUrl || 'https://api.ppinfra.com/openai/v1/models';
        const ppinfra = new PPInfraProvider(ppinfraUrl);
        fetcher.addProvider(ppinfra);
        break;
      }
      case 'openrouter': {
        const openrouterConfig = config.providers['openrouter'];
        const openrouterUrl = openrouterConfig?.apiUrl || 'https://openrouter.ai/api/v1/models';
        const openrouter = new OpenRouterProvider(openrouterUrl);
        fetcher.addProvider(openrouter);
        break;
      }
      case 'gemini': {
        const geminiConfig = config.providers['gemini'];
        const geminiApiKey = geminiConfig?.getApiKey() || process.env.GEMINI_API_KEY;
        const gemini = new GeminiProvider(geminiApiKey);
        fetcher.addProvider(gemini);
        break;
      }
      case 'vercel': {
        const vercelConfig = config.providers['vercel'];
        const vercelUrl = vercelConfig?.apiUrl || 'https://ai-gateway.vercel.sh/v1/models';
        const vercel = new VercelProvider(vercelUrl);
        fetcher.addProvider(vercel);
        break;
      }
      case 'github_ai': {
        const githubAiConfig = config.providers['github_ai'];
        const githubAiUrl = githubAiConfig?.apiUrl || 'https://models.inference.ai.azure.com/models';
        const githubAi = new GithubAiProvider(githubAiUrl);
        fetcher.addProvider(githubAi);
        break;
      }
      case 'tokenflux': {
        const tokenfluxConfig = config.providers['tokenflux'];
        const tokenfluxUrl = tokenfluxConfig?.apiUrl || 'https://tokenflux.ai/v1/models';
        const tokenflux = new TokenfluxProvider(tokenfluxUrl);
        fetcher.addProvider(tokenflux);
        break;
      }
      case 'groq': {
        const groqConfig = config.providers['groq'];
        const groqApiKey = groqConfig?.getApiKey() || process.env.GROQ_API_KEY;
        
        if (groqApiKey) {
          const groq = new GroqProvider(groqApiKey);
          fetcher.addProvider(groq);
        } else {
          console.error('❌ Groq requires an API key. Set GROQ_API_KEY environment variable or configure in providers.toml');
        }
        break;
      }
      case 'deepseek': {
        const deepseek = new DeepSeekProvider();
        fetcher.addProvider(deepseek);
        break;
      }
      case 'openai': {
        const openaiConfig = config.providers['openai'];
        const openaiApiKey = openaiConfig?.getApiKey() || process.env.OPENAI_API_KEY;
        const openai = new OpenAIProvider(openaiApiKey);
        fetcher.addProvider(openai);
        break;
      }
      case 'anthropic': {
        const anthropicConfig = config.providers['anthropic'];
        const anthropicApiKey = anthropicConfig?.getApiKey() || process.env.ANTHROPIC_API_KEY;
        const anthropic = new AnthropicProvider(anthropicApiKey);
        fetcher.addProvider(anthropic);
        break;
      }
      case 'ollama': {
        const ollama = new OllamaProvider();
        fetcher.addProvider(ollama);
        break;
      }
      case 'siliconflow': {
        const siliconflow = new SiliconFlowProvider();
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
  
  const outputManager = new OutputManager(outputDir);
  await outputManager.writeProviderFiles(providerData);
  
  console.log(`✅ Successfully fetched and wrote ${providerData.length} providers`);
  
  // Print summary for each provider
  for (const providerInfo of providerData) {
    console.log(`   📋 ${providerInfo.providerName}: ${providerInfo.models.length} models`);
  }
}