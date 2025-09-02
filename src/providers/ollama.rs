use async_trait::async_trait;
use anyhow::Result;
use serde::Deserialize;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use crate::models::{ModelInfo, ModelType};
use crate::providers::Provider;

#[derive(Debug, Clone, Deserialize)]
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
    #[serde(rename = "match", default)]
    match_patterns: Vec<String>,
}

pub struct OllamaProvider {}

impl OllamaProvider {
    pub fn new() -> Self {
        Self {}
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
}

#[async_trait]
impl Provider for OllamaProvider {
    async fn fetch_models(&self) -> Result<Vec<ModelInfo>> {
        let mut template_models = HashMap::new();
        let mut match_to_template = HashMap::new();
        
        // Load template models
        let template_path = Path::new("templates/ollama.json");
        if template_path.exists() {
            let template_content = fs::read_to_string(template_path)?;
            let models: Vec<TemplateModel> = serde_json::from_str(&template_content)?;
            for model in models {
                // Store template by primary ID
                template_models.insert(model.id.clone(), model.clone());
                
                // Create match patterns lookup
                for match_pattern in &model.match_patterns {
                    match_to_template.insert(match_pattern.clone(), model.clone());
                }
                
                // Also add primary ID as a match pattern if not already in match list
                if !model.match_patterns.contains(&model.id) {
                    match_to_template.insert(model.id.clone(), model.clone());
                }
            }
        }

        let mut result_models = Vec::new();
        
        // Use all template models for Ollama (no API call needed)
        for template_model in template_models.values() {
            result_models.push(self.convert_template_model(template_model));
        }

        Ok(result_models)
    }

    fn provider_id(&self) -> &str {
        "ollama"
    }

    fn provider_name(&self) -> &str {
        "Ollama"
    }
}