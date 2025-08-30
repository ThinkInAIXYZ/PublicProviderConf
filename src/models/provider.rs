use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use crate::models::ModelInfo;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderInfo {
    pub provider: String,
    pub provider_name: String,
    pub last_updated: DateTime<Utc>,
    pub models: Vec<ModelInfo>,
}

impl ProviderInfo {
    pub fn new(provider: String, provider_name: String, models: Vec<ModelInfo>) -> Self {
        Self {
            provider,
            provider_name,
            last_updated: Utc::now(),
            models,
        }
    }
}