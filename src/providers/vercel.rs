use async_trait::async_trait;
use anyhow::Result;
use serde::Deserialize;
use crate::models::{ModelInfo, ModelType};
use crate::providers::Provider;

#[derive(Debug, Deserialize)]
struct VercelPricing {
    input: String,
    output: String,
    #[serde(default)]
    input_cache_read: Option<String>,
    #[serde(default)]
    input_cache_write: Option<String>,
}

#[derive(Debug, Deserialize)]
struct VercelModel {
    id: String,
    #[serde(rename = "object")]
    object: String,
    created: i64,
    owned_by: String,
    name: String,
    description: String,
    context_window: u32,
    max_tokens: u32,
    #[serde(rename = "type")]
    model_type: String,
    pricing: VercelPricing,
    #[serde(default)]
    tags: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct VercelResponse {
    object: String,
    data: Vec<VercelModel>,
}

pub struct VercelProvider {
    api_url: String,
    client: reqwest::Client,
}

impl VercelProvider {
    pub fn new(api_url: String) -> Self {
        Self {
            api_url,
            client: reqwest::Client::new(),
        }
    }

    fn convert_model(&self, model: VercelModel) -> ModelInfo {
        // Detect vision capability from model id and description
        let vision = model.id.to_lowercase().contains("vision") 
            || model.name.to_lowercase().contains("vision")
            || model.description.to_lowercase().contains("vision")
            || model.description.to_lowercase().contains("image")
            || model.tags.iter().any(|tag| tag.contains("image") || tag.contains("vision"));

        // Detect function call capability
        let function_call = model.id.to_lowercase().contains("function")
            || model.name.to_lowercase().contains("function")
            || model.description.to_lowercase().contains("function")
            || model.description.to_lowercase().contains("tool")
            || model.tags.iter().any(|tag| tag.contains("function") || tag.contains("tool"));

        // Detect reasoning capability
        let reasoning = model.id.to_lowercase().contains("reasoning")
            || model.name.to_lowercase().contains("reasoning")
            || model.description.to_lowercase().contains("reasoning")
            || model.description.to_lowercase().contains("thinking")
            || model.tags.iter().any(|tag| tag.contains("reasoning") || tag.contains("thinking"));

        // Determine model type
        let model_type = match model.model_type.as_str() {
            "language" => ModelType::Chat,
            "embedding" => ModelType::Embedding,
            "completion" => ModelType::Completion,
            _ => ModelType::Chat,
        };

        ModelInfo::new(
            model.id,
            model.name,
            model.context_window,
            model.max_tokens,
            vision,
            function_call,
            reasoning,
            model_type,
            Some(model.description),
        )
    }
}

#[async_trait]
impl Provider for VercelProvider {
    async fn fetch_models(&self) -> Result<Vec<ModelInfo>> {
        let response = self.client
            .get(&self.api_url)
            .send()
            .await?
            .json::<VercelResponse>()
            .await?;

        let models = response.data
            .into_iter()
            .map(|model| self.convert_model(model))
            .collect();

        Ok(models)
    }

    fn provider_id(&self) -> &str {
        "vercel"
    }

    fn provider_name(&self) -> &str {
        "Vercel AI Gateway"
    }
}
