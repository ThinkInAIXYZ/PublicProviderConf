use async_trait::async_trait;
use anyhow::Result;
use serde::Deserialize;
use crate::models::{ModelInfo, ModelType};
use crate::providers::Provider;

#[derive(Debug, Deserialize)]
struct GithubAiModel {
    id: String,
    name: String,
    friendly_name: String,
    model_version: i32,
    publisher: String,
    model_family: String,
    model_registry: String,
    license: String,
    task: String,
    description: String,
    summary: String,
    #[serde(default)]
    tags: Vec<String>,
}

pub struct GithubAiProvider {
    api_url: String,
    client: reqwest::Client,
}

impl GithubAiProvider {
    pub fn new(api_url: String) -> Self {
        Self {
            api_url,
            client: reqwest::Client::new(),
        }
    }

    fn convert_model(&self, model: GithubAiModel) -> ModelInfo {
        // Detect vision capability from model id, name, description and tags
        let vision = model.id.to_lowercase().contains("vision") 
            || model.name.to_lowercase().contains("vision")
            || model.description.to_lowercase().contains("vision")
            || model.description.to_lowercase().contains("image")
            || model.tags.iter().any(|tag| tag.to_lowercase().contains("image") 
                || tag.to_lowercase().contains("vision"));

        // Detect function call capability
        let function_call = model.id.to_lowercase().contains("function")
            || model.name.to_lowercase().contains("function")
            || model.description.to_lowercase().contains("function")
            || model.description.to_lowercase().contains("tool")
            || model.tags.iter().any(|tag| tag.to_lowercase().contains("function") 
                || tag.to_lowercase().contains("tool"));

        // Detect reasoning capability
        let reasoning = model.id.to_lowercase().contains("reasoning")
            || model.name.to_lowercase().contains("reasoning")
            || model.description.to_lowercase().contains("reasoning")
            || model.description.to_lowercase().contains("thinking")
            || model.tags.iter().any(|tag| tag.to_lowercase().contains("reasoning") 
                || tag.to_lowercase().contains("thinking"));

        // Determine model type based on task
        let model_type = match model.task.as_str() {
            "chat-completion" => ModelType::Chat,
            "embeddings" => ModelType::Embedding,
            "completion" => ModelType::Completion,
            _ => ModelType::Chat,
        };

        // Since Github AI doesn't provide context window info, use reasonable defaults
        let (context_length, max_tokens) = if model.name.to_lowercase().contains("embed") {
            (8192, 0) // Embedding models don't generate tokens
        } else if model.name.to_lowercase().contains("large") || model.name.to_lowercase().contains("405b") {
            (200000, 16384) // Large models typically have longer contexts
        } else if model.name.to_lowercase().contains("70b") {
            (128000, 8192)
        } else {
            (32768, 4096) // Default for smaller models
        };

        ModelInfo::new(
            model.id,
            model.friendly_name,
            context_length,
            max_tokens,
            vision,
            function_call,
            reasoning,
            model_type,
            Some(model.description),
        )
    }
}

#[async_trait]
impl Provider for GithubAiProvider {
    async fn fetch_models(&self) -> Result<Vec<ModelInfo>> {
        let response = self.client
            .get(&self.api_url)
            .send()
            .await?
            .json::<Vec<GithubAiModel>>()
            .await?;

        let models = response
            .into_iter()
            .map(|model| self.convert_model(model))
            .collect();

        Ok(models)
    }

    fn provider_id(&self) -> &str {
        "github_ai"
    }

    fn provider_name(&self) -> &str {
        "GitHub AI Models"
    }
}
