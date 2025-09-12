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

export async function fetchAllProviders(outputDir: string, configPath: string): Promise<void> {
  console.log('Fetching models from all providers...');
  
  // Load configuration
  const config = loadConfig(configPath);
  
  const fetcher = new DataFetcher();
  
  // Add PPInfra provider (no API key required)
  const ppinfraConfig = config.providers['ppinfra'];
  const ppinfraUrl = ppinfraConfig?.apiUrl || 'https://api.ppinfra.com/openai/v1/models';
  const ppinfra = new PPInfraProvider(ppinfraUrl);
  fetcher.addProvider(ppinfra);
  
  // Add OpenRouter provider (no API key required)
  const openrouterConfig = config.providers['openrouter'];
  const openrouterUrl = openrouterConfig?.apiUrl || 'https://openrouter.ai/api/v1/models';
  const openrouter = new OpenRouterProvider(openrouterUrl);
  fetcher.addProvider(openrouter);
  
  // Add Gemini provider (optional API key for complete model list)
  const geminiConfig = config.providers['gemini'];
  const geminiApiKey = geminiConfig?.getApiKey() || process.env.GEMINI_API_KEY;
  const gemini = new GeminiProvider(geminiApiKey);
  fetcher.addProvider(gemini);
  
  // Add Vercel provider (no API key required)
  const vercelConfig = config.providers['vercel'];
  const vercelUrl = vercelConfig?.apiUrl || 'https://ai-gateway.vercel.sh/v1/models';
  const vercel = new VercelProvider(vercelUrl);
  fetcher.addProvider(vercel);
  
  // Add GitHub AI provider (no API key required)
  const githubAiConfig = config.providers['github_ai'];
  const githubAiUrl = githubAiConfig?.apiUrl || 'https://models.inference.ai.azure.com/models';
  const githubAi = new GithubAiProvider(githubAiUrl);
  fetcher.addProvider(githubAi);
  
  // Add Tokenflux provider (no API key required)
  const tokenfluxConfig = config.providers['tokenflux'];
  const tokenfluxUrl = tokenfluxConfig?.apiUrl || 'https://tokenflux.ai/v1/models';
  const tokenflux = new TokenfluxProvider(tokenfluxUrl);
  fetcher.addProvider(tokenflux);
  
  // Add Groq provider (requires API key)
  const groqConfig = config.providers['groq'];
  const groqApiKey = groqConfig?.getApiKey() || process.env.GROQ_API_KEY;
  
  if (groqApiKey) {
    const groq = new GroqProvider(groqApiKey);
    fetcher.addProvider(groq);
  } else {
    console.log('⚠️  Skipping Groq: No API key found (set GROQ_API_KEY or configure in providers.toml)');
  }
  
  // Add DeepSeek provider (no API key required, uses web scraping)
  const deepseek = new DeepSeekProvider();
  fetcher.addProvider(deepseek);

  // Add OpenAI provider (optional API key for complete model list)
  const openaiConfig = config.providers['openai'];
  const openaiApiKey = openaiConfig?.getApiKey() || process.env.OPENAI_API_KEY;
  const openai = new OpenAIProvider(openaiApiKey);
  fetcher.addProvider(openai);

  // Add Anthropic provider (optional API key for complete model list)
  const anthropicConfig = config.providers['anthropic'];
  const anthropicApiKey = anthropicConfig?.getApiKey() || process.env.ANTHROPIC_API_KEY;
  const anthropic = new AnthropicProvider(anthropicApiKey);
  fetcher.addProvider(anthropic);
  
  // Add Ollama provider (template-based, no API key required)
  const ollama = new OllamaProvider();
  fetcher.addProvider(ollama);
  
  // Add SiliconFlow provider (template-based, no API key required)
  const siliconflow = new SiliconFlowProvider();
  fetcher.addProvider(siliconflow);
  
  const providerData = await fetcher.fetchAll();
  
  const outputManager = new OutputManager(outputDir);
  await outputManager.writeProviderFiles(providerData);
  await outputManager.writeAggregatedFile(providerData);
  
  console.log(`✅ Successfully fetched and wrote ${providerData.length} providers`);
}