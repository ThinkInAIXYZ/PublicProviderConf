use async_trait::async_trait;
use anyhow::Result;
use serde::Deserialize;
use crate::models::{ModelInfo, ModelType};
use crate::providers::Provider;

#[derive(Debug, Deserialize)]
struct TokenfluxArchitecture {
    #[serde(default)]
    input_modalities: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct TokenfluxModel {
    id: String,
    name: String,
    #[serde(rename = "type")]
    model_type: String,
    description: String,
    context_length: u32,
    #[serde(default)]
    architecture: Option<TokenfluxArchitecture>,
    #[serde(default)]
    supported_parameters: Option<Vec<String>>,
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
        let id_lower = model.id.to_lowercase();
        let name_lower = model.name.to_lowercase();
        let desc_lower = model.description.to_lowercase();

        // Detect vision capability from architecture input modalities and text analysis
        let vision = model.architecture
            .as_ref()
            .and_then(|arch| arch.input_modalities.as_ref())
            .map(|modalities| modalities.iter().any(|m| m.contains("image") || m.contains("vision")))
            .unwrap_or(false)
            || id_lower.contains("vision")
            || name_lower.contains("vision")
            || desc_lower.contains("vision")
            || desc_lower.contains("image");

        // Detect function call capability from supported parameters and text analysis
        let function_call = model.supported_parameters
            .as_ref()
            .map(|params| params.iter().any(|p| p.contains("tool") || p.contains("function")))
            .unwrap_or(false)
            || id_lower.contains("function")
            || name_lower.contains("function")
            || desc_lower.contains("function")
            || desc_lower.contains("tool");

        // Detect reasoning capability from supported parameters and description
        let reasoning = model.supported_parameters
            .as_ref()
            .map(|params| params.iter().any(|p| p.contains("reasoning") || p.contains("include_reasoning")))
            .unwrap_or(false)
            || id_lower.contains("reasoning")
            || name_lower.contains("reasoning")
            || desc_lower.contains("reasoning")
            || desc_lower.contains("thinking")
            || id_lower.contains("r1"); // DeepSeek R1 models

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
            .await?;

        // Get response text for debugging
        let response_text = response.text().await?;
        
        // Try to parse JSON with better error handling
        let response_data: TokenfluxResponse = serde_json::from_str(&response_text)
            .map_err(|e| {
                println!("❌ JSON parsing error: {}", e);
                println!("🔍 Response text (first 500 chars): {}", &response_text[..std::cmp::min(500, response_text.len())]);
                anyhow::anyhow!("Failed to parse Tokenflux response: {}", e)
            })?;

        let models = response_data.data
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
