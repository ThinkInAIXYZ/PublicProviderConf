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

export function loadConfig(): AppConfig {
  return getDefaultConfig();
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
  
  providers['tokenflux'] = createProviderConfig(
    'https://tokenflux.ai/v1/models',
    undefined,
    10,
    30
  );

  providers['openrouter'] = createProviderConfig(
    'https://openrouter.ai/api/v1/models',
    undefined,
    10,
    30
  );

  providers['ollama'] = createProviderConfig(
    'manual-templates/ollama.json',
    undefined,
    5,
    30
  );

  providers['siliconflow'] = createProviderConfig(
    'manual-templates/siliconflow.json',
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
  
  return { providers };
}
