use async_trait::async_trait;
use anyhow::Result;
use serde::Deserialize;
use crate::models::{ModelInfo, ModelType};
use crate::providers::Provider;

#[derive(Debug, Deserialize)]
struct PPInfraModel {
    id: String,
    #[serde(rename = "display_name")]
    display_name: String,
    context_size: u32,
    max_output_tokens: u32,
    #[serde(default)]
    features: Vec<String>,
    #[serde(rename = "model_type")]
    model_type: String,
}

#[derive(Debug, Deserialize)]
struct PPInfraResponse {
    data: Vec<PPInfraModel>,
}

pub struct PPInfraProvider {
    api_url: String,
    client: reqwest::Client,
}

impl PPInfraProvider {
    pub fn new(api_url: String) -> Self {
        Self {
            api_url,
            client: reqwest::Client::new(),
        }
    }

    fn convert_model(&self, model: PPInfraModel) -> ModelInfo {
        let vision = model.features.iter().any(|f| f.contains("vision") || f.contains("image"));
        let function_call = model.features.iter().any(|f| f.contains("function") || f.contains("tool"));
        let reasoning = model.features.iter().any(|f| f.contains("reasoning") || f.contains("thinking"));
        
        let model_type = match model.model_type.as_str() {
            "chat" => ModelType::Chat,
            "completion" => ModelType::Completion,
            "embedding" => ModelType::Embedding,
            _ => ModelType::Chat,
        };

        ModelInfo::new(
            model.id,
            model.display_name,
            model.context_size,
            model.max_output_tokens,
            vision,
            function_call,
            reasoning,
            model_type,
 )
    }
}

#[async_trait]
impl Provider for PPInfraProvider {
    async fn fetch_models(&self) -> Result<Vec<ModelInfo>> {
        let response = self.client
            .get(&self.api_url)
            .send()
            .await?
            .json::<PPInfraResponse>()
            .await?;

        let models = response.data
            .into_iter()
            .map(|model| self.convert_model(model))
            .collect();

        Ok(models)
    }

    fn provider_id(&self) -> &str {
        "ppinfra"
    }

    fn provider_name(&self) -> &str {
        "PPInfra"
    }
}