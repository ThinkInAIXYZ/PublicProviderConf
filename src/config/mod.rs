use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub api_url: String,
    pub api_key_env: Option<String>,
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
            rate_limit: Some(10),
            timeout: Some(30),
        });
        
        Self { providers }
    }
}