use async_trait::async_trait;
use anyhow::{Result, anyhow};
use serde::Deserialize;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use crate::models::{ModelInfo, ModelType};
use crate::providers::Provider;

#[derive(Debug, Deserialize)]
struct AnthropicModel {
    id: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    data: Vec<AnthropicModel>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TemplateModel {
    id: String,
    name: String,
    context_length: u32,
    max_tokens: u32,
    vision: bool,
    function_call: bool,
    reasoning: bool,
    #[serde(rename = "type")]
    model_type: String,
    description: Option<String>,
}

pub struct AnthropicProvider {
    api_url: String,
    client: reqwest::Client,
    api_key: Option<String>,
}

impl AnthropicProvider {
    pub fn new(api_key: Option<String>) -> Self {
        Self {
            api_url: "https://api.anthropic.com/v1/models".to_string(),
            client: reqwest::Client::new(),
            api_key,
        }
    }

    fn convert_template_model(&self, template: &TemplateModel) -> ModelInfo {
        let model_type = match template.model_type.as_str() {
            "chat" => ModelType::Chat,
            "completion" => ModelType::Completion,
            "embedding" => ModelType::Embedding,
            "imageGeneration" => ModelType::ImageGeneration,
            "audio" => ModelType::Audio,
            _ => ModelType::Chat,
        };

        ModelInfo::new(
            template.id.clone(),
            template.name.clone(),
            template.context_length,
            template.max_tokens,
            template.vision,
            template.function_call,
            template.reasoning,
            model_type,
            template.description.clone(),
        )
    }

    async fn fetch_available_model_ids(&self) -> Result<Vec<String>> {
        if self.api_key.is_none() {
            return Ok(vec![]);
        }
        let response = self.client
            .get(&self.api_url)
            .header("x-api-key", self.api_key.as_ref().unwrap())
            .header("anthropic-version", "2023-06-01")
            .send()
            .await;
            
        let response = response?;
        
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or("no body".to_string());
            return Err(anyhow::anyhow!("API request failed with status {}: {}", status, text));
        }
        
        let api_response: AnthropicResponse = response.json().await?;
        let model_ids = api_response.data
            .into_iter()
            .map(|model| model.id)
            .collect();

        Ok(model_ids)
    }

    fn load_template_models(&self) -> Result<HashMap<String, TemplateModel>> {
        let template_path = Path::new("templates/anthropic.json");
        if !template_path.exists() {
            return Err(anyhow!("Anthropic template file not found at templates/anthropic.json"));
        }

        let template_content = fs::read_to_string(template_path)?;
        let template_models: Vec<TemplateModel> = serde_json::from_str(&template_content)?;

        let mut models_map = HashMap::new();
        for model in template_models {
            models_map.insert(model.id.clone(), model);
        }

        Ok(models_map)
    }
}

#[async_trait]
impl Provider for AnthropicProvider {
    async fn fetch_models(&self) -> Result<Vec<ModelInfo>> {
        let template_models = self.load_template_models()?;
        let available_model_ids = self.fetch_available_model_ids().await.unwrap_or_default();
        
        let mut result_models = Vec::new();

        if available_model_ids.is_empty() {
            // No API key or API call failed, use all template models
            for template_model in template_models.values() {
                result_models.push(self.convert_template_model(template_model));
            }
        } else {
            // Only include template models that are available via API
            for model_id in &available_model_ids {
                if let Some(template_model) = template_models.get(model_id) {
                    result_models.push(self.convert_template_model(template_model));
                }
            }
        }

        Ok(result_models)
    }

    fn provider_id(&self) -> &str {
        "anthropic"
    }

    fn provider_name(&self) -> &str {
        "Anthropic"
    }
}