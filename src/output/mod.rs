pub mod json_writer;
pub mod validator;

use anyhow::Result;
use crate::models::ProviderInfo;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AggregatedOutput {
    pub version: String,
    pub generated_at: DateTime<Utc>,
    pub total_models: usize,
    pub providers: HashMap<String, AggregatedProvider>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AggregatedProvider {
    pub provider_id: String,
    pub provider_name: String,
    pub models: Vec<crate::models::ModelInfo>,
}

pub struct OutputManager {
    output_dir: String,
}

impl OutputManager {
    pub fn new(output_dir: String) -> Self {
        Self { output_dir }
    }

    pub async fn write_provider_files(&self, providers: &[ProviderInfo]) -> Result<()> {
        tokio::fs::create_dir_all(&self.output_dir).await?;
        
        for provider in providers {
            let filename = format!("{}/{}.json", self.output_dir, provider.provider);
            let content = serde_json::to_string_pretty(provider)?;
            tokio::fs::write(filename, content).await?;
        }
        
        Ok(())
    }

    pub async fn write_aggregated_file(&self, providers: &[ProviderInfo]) -> Result<()> {
        let aggregated = self.create_aggregated_output(providers);
        let filename = format!("{}/all.json", self.output_dir);
        let content = serde_json::to_string_pretty(&aggregated)?;
        tokio::fs::write(filename, content).await?;
        Ok(())
    }

    pub fn create_aggregated_output(&self, providers: &[ProviderInfo]) -> AggregatedOutput {
        let mut aggregated_providers = HashMap::new();
        let mut total_models = 0;

        for provider in providers {
            let aggregated_provider = AggregatedProvider {
                provider_id: provider.provider.clone(),
                provider_name: provider.provider_name.clone(),
                models: provider.models.clone(),
            };
            total_models += provider.models.len();
            aggregated_providers.insert(provider.provider.clone(), aggregated_provider);
        }

        AggregatedOutput {
            version: "1.0.0".to_string(),
            generated_at: Utc::now(),
            total_models,
            providers: aggregated_providers,
        }
    }
}