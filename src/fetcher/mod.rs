pub mod http_client;

use anyhow::Result;
use crate::models::ProviderInfo;
use crate::providers::Provider;
use std::sync::Arc;

pub struct DataFetcher {
    providers: Vec<Arc<dyn Provider>>,
}

impl DataFetcher {
    pub fn new() -> Self {
        Self {
            providers: Vec::new(),
        }
    }

    pub fn add_provider(&mut self, provider: Arc<dyn Provider>) {
        self.providers.push(provider);
    }

    pub async fn fetch_all(&self) -> Result<Vec<ProviderInfo>> {
        let mut results = Vec::new();
        
        for provider in &self.providers {
            match provider.fetch_models().await {
                Ok(models) => {
                    println!("Fetched {} models from {}", models.len(), provider.provider_id());
                    let provider_info = ProviderInfo::new(
                        provider.provider_id().to_string(),
                        provider.provider_name().to_string(),
                        models,
                    );
                    results.push(provider_info);
                }
                Err(e) => {
                    eprintln!("Failed to fetch models from {}: {}", provider.provider_id(), e);
                }
            }
        }
        
        Ok(results)
    }
}