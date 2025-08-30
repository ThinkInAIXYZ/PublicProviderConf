use async_trait::async_trait;
use anyhow::Result;
use serde::Deserialize;
use crate::models::{ModelInfo, ModelType};
use crate::providers::Provider;

#[derive(Debug, Deserialize)]
struct TokenfluxArchitecture {
    modality: String,
    input_modalities: Vec<String>,
    output_modalities: Vec<String>,
    tokenizer: String,
    instruct_type: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TokenfluxPricing {
    prompt: String,
    completion: String,
    #[serde(default)]
    input_cache_read: String,
    #[serde(default)]
    input_cache_write: String,
    request: String,
    image: String,
    web_search: String,
    internal_reasoning: String,
    unit: i32,
    currency: String,
}

#[derive(Debug, Deserialize)]
struct TokenfluxModel {
    id: String,
    canonical_slug: String,
    hugging_face_id: String,
    name: String,
    #[serde(rename = "type")]
    model_type: String,
    created: i64,
    description: String,
    context_length: u32,
    architecture: TokenfluxArchitecture,
    pricing: TokenfluxPricing,
    supported_parameters: Vec<String>,
    model_provider: String,
}

#[derive(Debug, Deserialize)]
struct TokenfluxResponse {
    data: Vec<TokenfluxModel>,
}

pub struct TokenfluxProvider {
    api_url: String,
    client: reqwest::Client,
}

impl TokenfluxProvider {
    pub fn new(api_url: String) -> Self {
        Self {
            api_url,
            client: reqwest::Client::new(),
        }
    }

    fn convert_model(&self, model: TokenfluxModel) -> ModelInfo {
        // Detect vision capability from architecture input modalities
        let vision = model.architecture.input_modalities.iter()
            .any(|m| m.contains("image") || m.contains("vision"))
            || model.id.to_lowercase().contains("vision")
            || model.name.to_lowercase().contains("vision")
            || model.description.to_lowercase().contains("vision")
            || model.description.to_lowercase().contains("image");

        // Detect function call capability from supported parameters
        let function_call = model.supported_parameters.iter()
            .any(|p| p.contains("tool") || p.contains("function"))
            || model.id.to_lowercase().contains("function")
            || model.name.to_lowercase().contains("function")
            || model.description.to_lowercase().contains("function")
            || model.description.to_lowercase().contains("tool");

        // Detect reasoning capability from supported parameters and description
        let reasoning = model.supported_parameters.iter()
            .any(|p| p.contains("reasoning") || p.contains("include_reasoning"))
            || model.id.to_lowercase().contains("reasoning")
            || model.name.to_lowercase().contains("reasoning")
            || model.description.to_lowercase().contains("reasoning")
            || model.description.to_lowercase().contains("thinking");

        // Determine model type
        let model_type = match model.model_type.as_str() {
            "chat" => ModelType::Chat,
            "embedding" => ModelType::Embedding,
            "completion" => ModelType::Completion,
            _ => ModelType::Chat,
        };

        // Estimate max_tokens based on context_length
        let max_tokens = if model.context_length > 100000 {
            16384
        } else if model.context_length > 50000 {
            8192
        } else {
            4096
        };

        ModelInfo::new(
            model.id,
            model.name,
            model.context_length,
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
impl Provider for TokenfluxProvider {
    async fn fetch_models(&self) -> Result<Vec<ModelInfo>> {
        let response = self.client
            .get(&self.api_url)
            .send()
            .await?
            .json::<TokenfluxResponse>()
            .await?;

        let models = response.data
            .into_iter()
            .map(|model| self.convert_model(model))
            .collect();

        Ok(models)
    }

    fn provider_id(&self) -> &str {
        "tokenflux"
    }

    fn provider_name(&self) -> &str {
        "Tokenflux"
    }
}
