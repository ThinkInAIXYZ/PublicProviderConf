import { readFileSync, existsSync } from 'fs';
import toml from 'toml';

export interface ProviderConfig {
  apiUrl: string;
  apiKeyEnv?: string;
  apiKey?: string;
  rateLimit?: number;
  timeout?: number;
  
  getApiKey(): string | undefined;
}

export interface AppConfig {
  providers: Record<string, ProviderConfig>;
}

export function loadConfig(configPath: string): AppConfig {
  try {
    // Try to read and parse TOML config file
    const content = readFileSync(configPath, 'utf8');
    const parsed = toml.parse(content);
    
    const providers: Record<string, ProviderConfig> = {};
    
    if (parsed.providers && typeof parsed.providers === 'object') {
      for (const [key, value] of Object.entries(parsed.providers)) {
        if (value && typeof value === 'object') {
          const config = value as Record<string, any>;
          const providerConfig: ProviderConfig = {
            apiUrl: config.api_url || '',
            apiKeyEnv: config.api_key_env,
            apiKey: config.api_key,
            rateLimit: config.rate_limit,
            timeout: config.timeout,
            getApiKey: function() {
              // Priority: direct config > environment variable
              if (this.apiKey) {
                return this.apiKey;
              }
              
              if (this.apiKeyEnv) {
                return process.env[this.apiKeyEnv];
              }
              
              return undefined;
            }
          };
          providers[key] = providerConfig;
        }
      }
    }
    
    console.log(`📄 Loaded configuration from: ${configPath}`);
    return { providers };
  } catch (error) {
    if (configPath.includes('providers.toml') && existsSync('config/providers.toml.example')) {
      console.log(`⚠️  Config file not found at ${configPath}`);
      console.log('💡 To create your config file:');
      console.log('   cp config/providers.toml.example config/providers.toml');
      console.log('   # Then edit config/providers.toml with your settings');
      console.log('🔒 Note: config/providers.toml is ignored by git for security');
      console.log('📋 Using default configuration for now');
    } else {
      console.log(`⚠️  Config file not found at ${configPath}, using default configuration`);
      console.log('💡 You can create a config file to customize provider settings and API keys');
    }
    
    return getDefaultConfig();
  }
}

function createProviderConfig(
  apiUrl: string,
  apiKeyEnv?: string,
  rateLimit?: number,
  timeout?: number
): ProviderConfig {
  return {
    apiUrl,
    apiKeyEnv,
    rateLimit,
    timeout,
    getApiKey: function() {
      // Priority: direct config > environment variable
      if (this.apiKey) {
        return this.apiKey;
      }
      
      if (this.apiKeyEnv) {
        return process.env[this.apiKeyEnv];
      }
      
      return undefined;
    }
  };
}

export function getDefaultConfig(): AppConfig {
  const providers: Record<string, ProviderConfig> = {};
  
  providers['ppinfra'] = createProviderConfig(
    'https://api.ppinfra.com/openai/v1/models',
    undefined,
    10,
    30
  );
  
  providers['openrouter'] = createProviderConfig(
    'https://openrouter.ai/api/v1/models',
    undefined,
    5,
    30
  );
  
  providers['gemini'] = createProviderConfig(
    'https://generativelanguage.googleapis.com/v1beta/openai/models',
    'GEMINI_API_KEY',
    10,
    60
  );
  
  providers['vercel'] = createProviderConfig(
    'https://ai-gateway.vercel.sh/v1/models',
    undefined,
    10,
    30
  );
  
  providers['github_ai'] = createProviderConfig(
    'https://models.inference.ai.azure.com/models',
    undefined,
    5,
    30
  );
  
  providers['tokenflux'] = createProviderConfig(
    'https://tokenflux.ai/v1/models',
    undefined,
    10,
    30
  );

  providers['ollama'] = createProviderConfig(
    'templates/ollama.json',
    undefined,
    5,
    30
  );

  providers['siliconflow'] = createProviderConfig(
    'templates/siliconflow.json',
    undefined,
    5,
    30
  );

  providers['groq'] = createProviderConfig(
    'https://api.groq.com/openai/v1/models',
    'GROQ_API_KEY',
    10,
    30
  );
  
  providers['deepseek'] = createProviderConfig(
    'https://api-docs.deepseek.com/quick_start/pricing',
    undefined,
    5,
    60
  );
  
  return { providers };
}

