pub mod normalizer;
pub mod aggregator;

use crate::models::ProviderInfo;
use anyhow::Result;

pub struct DataProcessor;

impl DataProcessor {
    pub fn new() -> Self {
        Self
    }
    
    pub async fn process_providers(&self, providers: Vec<ProviderInfo>) -> Result<Vec<ProviderInfo>> {
        // For now, just return the providers as-is
        // Future: add normalization, deduplication, etc.
        Ok(providers)
    }
}