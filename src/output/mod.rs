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
    pub providers: HashMap<String, ProviderSummary>,
    pub total_models: usize,
    pub all_models: Vec<AggregatedModel>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderSummary {
    pub provider_name: String,
    pub model_count: usize,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AggregatedModel {
    pub provider_id: String,
    pub provider_name: String,
    pub id: String,
    pub name: String,
    pub context_length: u32,
    pub max_tokens: u32,
    pub vision: bool,
    pub function_call: bool,
    pub reasoning: bool,
    #[serde(rename = "type")]
    pub model_type: crate::models::ModelType,
    pub description: Option<String>,
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
        let filename = format!("{}/aggregated.json", self.output_dir);
        let content = serde_json::to_string_pretty(&aggregated)?;
        tokio::fs::write(filename, content).await?;
        Ok(())
    }

    pub fn create_aggregated_output(&self, providers: &[ProviderInfo]) -> AggregatedOutput {
        let mut provider_summaries = HashMap::new();
        let mut all_models = Vec::new();
        let mut total_models = 0;

        for provider in providers {
            let summary = ProviderSummary {
                provider_name: provider.provider_name.clone(),
                model_count: provider.models.len(),
                last_updated: provider.last_updated,
            };
            provider_summaries.insert(provider.provider.clone(), summary);
            total_models += provider.models.len();

            for model in &provider.models {
                let aggregated_model = AggregatedModel {
                    provider_id: provider.provider.clone(),
                    provider_name: provider.provider_name.clone(),
                    id: model.id.clone(),
                    name: model.name.clone(),
                    context_length: model.context_length,
                    max_tokens: model.max_tokens,
                    vision: model.vision,
                    function_call: model.function_call,
                    reasoning: model.reasoning,
                    model_type: model.model_type.clone(),
                    description: model.description.clone(),
                };
                all_models.push(aggregated_model);
            }
        }

        AggregatedOutput {
            version: "1.0.0".to_string(),
            generated_at: Utc::now(),
            providers: provider_summaries,
            total_models,
            all_models,
        }
    }
}