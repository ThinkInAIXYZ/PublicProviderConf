use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub api_url: String,
    pub api_key_env: Option<String>,
    pub api_key: Option<String>,  // Direct API key configuration
    pub rate_limit: Option<u32>,
    pub timeout: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub providers: HashMap<String, ProviderConfig>,
}

impl AppConfig {
    pub fn load_from_file(path: &str) -> anyhow::Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let config: AppConfig = toml::from_str(&content)?;
        Ok(config)
    }
    
    pub fn default() -> Self {
        let mut providers = HashMap::new();
        providers.insert("ppinfra".to_string(), ProviderConfig {
            api_url: "https://api.ppinfra.com/openai/v1/models".to_string(),
            api_key_env: None,
            api_key: None,
            rate_limit: Some(10),
            timeout: Some(30),
        });
        
        providers.insert("openrouter".to_string(), ProviderConfig {
            api_url: "https://openrouter.ai/api/v1/models".to_string(),
            api_key_env: None,  // No API key required for model listing
            api_key: None,
            rate_limit: Some(5),
            timeout: Some(30),
        });
        
        providers.insert("gemini".to_string(), ProviderConfig {
            api_url: "https://generativelanguage.googleapis.com/v1beta/openai/models".to_string(),
            api_key_env: Some("GEMINI_API_KEY".to_string()),
            api_key: None,
            rate_limit: Some(10),
            timeout: Some(60),  // Web scraping might take longer
        });
        
        providers.insert("vercel".to_string(), ProviderConfig {
            api_url: "https://ai-gateway.vercel.sh/v1/models".to_string(),
            api_key_env: None,  // No API key required
            api_key: None,
            rate_limit: Some(10),
            timeout: Some(30),
        });
        
        providers.insert("github_ai".to_string(), ProviderConfig {
            api_url: "https://models.inference.ai.azure.com/models".to_string(),
            api_key_env: None,  // No API key required
            api_key: None,
            rate_limit: Some(5),
            timeout: Some(30),
        });
        
        providers.insert("tokenflux".to_string(), ProviderConfig {
            api_url: "https://tokenflux.ai/v1/models".to_string(),
            api_key_env: None,  // No API key required
            api_key: None,
            rate_limit: Some(10),
            timeout: Some(30),
        });
        
        providers.insert("groq".to_string(), ProviderConfig {
            api_url: "https://api.groq.com/openai/v1/models".to_string(),
            api_key_env: Some("GROQ_API_KEY".to_string()),
            api_key: None,
            rate_limit: Some(10),
            timeout: Some(30),
        });
        
        providers.insert("deepseek".to_string(), ProviderConfig {
            api_url: "https://api-docs.deepseek.com/quick_start/pricing".to_string(),
            api_key_env: None,  // No API key required, uses web scraping
            api_key: None,
            rate_limit: Some(5),
            timeout: Some(60),  // Web scraping might take longer
        });
        
        Self { providers }
    }
}

impl ProviderConfig {
    /// Get API key from config (direct) or environment variable
    pub fn get_api_key(&self) -> Option<String> {
        // Priority: direct config > environment variable
        if let Some(ref key) = self.api_key {
            Some(key.clone())
        } else if let Some(ref env_var) = self.api_key_env {
            std::env::var(env_var).ok()
        } else {
            None
        }
    }
}