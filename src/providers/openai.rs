use async_trait::async_trait;
use anyhow::Result;
use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;
use crate::models::{ModelInfo, ModelType};
use crate::providers::Provider;

#[derive(Debug, Deserialize)]
struct OpenAIModel {
    id: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    data: Vec<OpenAIModel>,
}

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

pub struct OpenAIProvider {
    api_url: String,
    client: reqwest::Client,
    api_key: Option<String>,
}

impl OpenAIProvider {
    pub fn new(api_key: Option<String>) -> Self {
        Self {
            api_url: "https://api.openai.com/v1/models".to_string(),
            client: reqwest::Client::new(),
            api_key,
        }
    }


    fn create_default_model(&self, model_id: &str) -> ModelInfo {
        // Analyze model ID to determine capabilities
        let is_embedding = model_id.contains("embedding");
        let is_image_gen = model_id.contains("dall-e");
        let is_audio = model_id.contains("whisper") || model_id.contains("tts");
        let is_reasoning = model_id.contains("o1") || model_id.contains("o3") || model_id.contains("o4");
        let has_vision = model_id.contains("4o") || model_id.contains("gpt-4") || model_id.contains("gpt-5") || model_id.contains("vision");
        let has_function_call = !is_embedding && !is_audio && !model_id.contains("instruct");
        
        let model_type = if is_embedding {
            ModelType::Embedding
        } else if is_image_gen {
            ModelType::ImageGeneration
        } else if is_audio {
            ModelType::Audio
        } else if model_id.contains("instruct") {
            ModelType::Completion
        } else {
            ModelType::Chat
        };
        
        // Determine context length and max tokens based on model family
        let (context_length, max_tokens) = if model_id.contains("gpt-5") {
            (272000, 128000)
        } else if model_id.contains("gpt-4.1") {
            (1000000, 32000)
        } else if model_id.contains("gpt-4o") || model_id.contains("gpt-4-turbo") {
            (128000, 8192)
        } else if model_id.contains("o1") || model_id.contains("o3") {
            (128000, 32768)
        } else if model_id.contains("gpt-4-32k") {
            (32768, 4096)
        } else if model_id.contains("gpt-4") {
            (8192, 4096)
        } else if model_id.contains("16k") {
            (16384, 4096)
        } else if model_id.contains("embedding") {
            (8191, 8191)
        } else if model_id.contains("dall-e-3") {
            (4000, 4000)
        } else if model_id.contains("dall-e") {
            (1000, 1000)
        } else if model_id.contains("tts") || model_id.contains("whisper") {
            (4096, 4096)
        } else {
            (4096, 4096)
        };
        
        // Create display name from ID
        let display_name = model_id
            .replace('-', " ")
            .replace('_', " ")
            .split_whitespace()
            .map(|word| {
                let mut chars = word.chars();
                match chars.next() {
                    None => String::new(),
                    Some(first) => first.to_uppercase().collect::<String>() + &chars.collect::<String>(),
                }
            })
            .collect::<Vec<_>>()
            .join(" ");
        
        ModelInfo::new(
            model_id.to_string(),
            display_name,
            context_length,
            max_tokens,
            has_vision,
            has_function_call,
            is_reasoning,
            model_type,
            Some(format!("OpenAI model {} (auto-configured)", model_id)),
        )
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
            .header("Authorization", format!("Bearer {}", self.api_key.as_ref().unwrap()))
            .send()
            .await?
            .json::<OpenAIResponse>()
            .await?;

        let model_ids: Vec<String> = response.data
            .into_iter()
            .map(|model| model.id)
            .collect();

        Ok(model_ids)
    }
}

#[async_trait]
impl Provider for OpenAIProvider {
    async fn fetch_models(&self) -> Result<Vec<ModelInfo>> {
        let mut template_models = HashMap::new();
        let mut match_to_template = HashMap::new();
        
        // Load template models
        let template_path = Path::new("templates/openai.json");
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

        let available_model_ids = self.fetch_available_model_ids().await.unwrap_or_default();
        
        let mut result_models = Vec::new();
        let mut matched_models = HashSet::new();

        if available_model_ids.is_empty() {
            // No API key or API call failed, use all template models
            for template_model in template_models.values() {
                result_models.push(self.convert_template_model(template_model));
            }
        } else {
            // Match API models with templates using match patterns
            for model_id in &available_model_ids {
                if let Some(template_model) = match_to_template.get(model_id) {
                    // Use actual API model ID, but template configuration
                    let mut model_info = self.convert_template_model(template_model);
                    model_info.id = model_id.clone(); // Use actual API ID
                    result_models.push(model_info);
                    matched_models.insert(model_id.clone());
                    println!("✓ Matched API model '{}' with template '{}'.", model_id, template_model.id);
                }
            }
            
            // Add unmatched models with default configuration
            for model_id in &available_model_ids {
                if !matched_models.contains(model_id) {
                    let default_model = self.create_default_model(model_id);
                    result_models.push(default_model);
                    println!("⚠️  API model '{}' not found in templates, using default configuration.", model_id);
                }
            }
        }

        Ok(result_models)
    }

    fn provider_id(&self) -> &str {
        "openai"
    }

    fn provider_name(&self) -> &str {
        "OpenAI"
    }
}