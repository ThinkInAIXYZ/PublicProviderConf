use async_trait::async_trait;
use anyhow::Result;
use serde::Deserialize;
use crate::models::{ModelInfo, ModelType};
use crate::providers::Provider;

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct OpenRouterArchitecture {
    modality: Option<String>,
    #[serde(rename = "input_modalities")]
    input_modalities: Option<Vec<String>>,
    #[serde(rename = "output_modalities")]
    output_modalities: Option<Vec<String>>,
    tokenizer: Option<String>,
    #[serde(rename = "instruct_type")]
    instruct_type: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct OpenRouterTopProvider {
    #[serde(rename = "is_moderated")]
    is_moderated: Option<bool>,
    #[serde(rename = "context_length")]
    context_length: Option<u32>,
    #[serde(rename = "max_completion_tokens")]
    max_completion_tokens: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct OpenRouterModel {
    id: String,
    #[serde(rename = "canonical_slug")]
    canonical_slug: Option<String>,
    #[serde(rename = "hugging_face_id")]
    hugging_face_id: Option<String>,
    name: String,
    created: Option<i64>,
    architecture: Option<OpenRouterArchitecture>,
    #[serde(rename = "top_provider")]
    top_provider: Option<OpenRouterTopProvider>,
    #[serde(rename = "context_length")]
    context_length: u32,
    #[serde(rename = "per_request_limits")]
    per_request_limits: Option<serde_json::Value>,
    #[serde(rename = "supported_parameters")]
    supported_parameters: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct OpenRouterResponse {
    data: Vec<OpenRouterModel>,
}

pub struct OpenRouterProvider {
    api_url: String,
    client: reqwest::Client,
}

impl OpenRouterProvider {
    pub fn new(api_url: String) -> Self {
        Self {
            api_url,
            client: reqwest::Client::new(),
        }
    }

    fn convert_model(&self, model: OpenRouterModel) -> ModelInfo {
        let vision = model.architecture
            .as_ref()
            .and_then(|arch| arch.input_modalities.as_ref())
            .map(|modalities| modalities.iter().any(|m| m.contains("image")))
            .unwrap_or(false);

        let function_call = model.supported_parameters
            .as_ref()
            .map(|params| params.iter().any(|p| p.contains("tool") || p.contains("function")))
            .unwrap_or(false);

        let reasoning = model.supported_parameters
            .as_ref()
            .map(|params| params.iter().any(|p| p.contains("reasoning") || p.contains("include_reasoning")))
            .unwrap_or(false);

        let max_tokens = model.top_provider
            .as_ref()
            .and_then(|tp| tp.max_completion_tokens)
            .unwrap_or(4096);

        let context_length = model.top_provider
            .as_ref()
            .and_then(|tp| tp.context_length)
            .unwrap_or(model.context_length);

        ModelInfo::new(
            model.id,
            model.name,
            context_length,
            max_tokens,
            vision,
            function_call,
            reasoning,
            ModelType::Chat,
        )
    }
}

#[async_trait]
impl Provider for OpenRouterProvider {
    async fn fetch_models(&self) -> Result<Vec<ModelInfo>> {
        let response_text = self.client
            .get(&self.api_url)
            .send()
            .await?
            .text()
            .await?;

        let response: OpenRouterResponse = serde_json::from_str(&response_text)
            .map_err(|e| anyhow::anyhow!("Failed to parse OpenRouter response: {}\nFirst 1000 chars: {}", e, &response_text[..std::cmp::min(1000, response_text.len())]))?;

        let models = response.data
            .into_iter()
            .map(|model| self.convert_model(model))
            .collect();

        Ok(models)
    }

    fn provider_id(&self) -> &str {
        "openrouter"
    }

    fn provider_name(&self) -> &str {
        "OpenRouter"
    }
}