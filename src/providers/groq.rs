use crate::models::{ModelInfo, ModelType};
use super::Provider;
use async_trait::async_trait;
use anyhow::{Result, Context};
use reqwest::Client;
use serde::{Deserialize, Serialize};

/// Groq API response structure (OpenAI compatible format)
#[derive(Debug, Deserialize, Serialize)]
pub struct GroqApiResponse {
    pub object: String,
    pub data: Vec<GroqModel>,
}

/// Individual model in Groq API response
#[derive(Debug, Deserialize, Serialize)]
pub struct GroqModel {
    pub id: String,
    pub object: String,
    pub created: i64,
    pub owned_by: String,
    pub active: bool,
    pub context_window: i32,
    pub public_apps: Option<serde_json::Value>,
    pub max_completion_tokens: Option<i32>,
}

/// Groq provider implementation
pub struct GroqProvider {
    api_key: Option<String>,
    api_url: String,
    client: Client,
}

impl GroqProvider {
    /// Create a new Groq provider with optional API key
    pub fn new(api_key: Option<String>) -> Self {
        Self {
            api_key,
            api_url: "https://api.groq.com/openai/v1/models".to_string(),
            client: Client::new(),
        }
    }

    /// Create a new Groq provider with custom API URL and optional API key
    pub fn with_url(api_url: String, api_key: Option<String>) -> Self {
        Self {
            api_key,
            api_url,
            client: Client::new(),
        }
    }

    /// Convert Groq model to ModelInfo
    fn convert_to_model_info(&self, groq_model: &GroqModel) -> ModelInfo {
        let model_type = self.determine_model_type(&groq_model.id);
        let display_name = self.create_display_name(&groq_model.id, &groq_model.owned_by);
        
        ModelInfo::new(
            groq_model.id.clone(),
            display_name,
            groq_model.context_window as u32,
            groq_model.max_completion_tokens.unwrap_or(groq_model.context_window) as u32,
            self.has_vision_capability(&groq_model.id),
            self.has_function_call_capability(&groq_model.id),
            self.has_reasoning_capability(&groq_model.id),
            model_type,
        )
    }

    /// Determine model type based on model ID
    fn determine_model_type(&self, model_id: &str) -> ModelType {
        let id_lower = model_id.to_lowercase();
        
        if id_lower.contains("whisper") || id_lower.contains("tts") {
            ModelType::Audio
        } else if id_lower.contains("embedding") {
            ModelType::Embedding
        } else if id_lower.contains("image") || id_lower.contains("dall") || id_lower.contains("stable") {
            ModelType::ImageGeneration
        } else {
            // Most Groq models are chat/completion models
            ModelType::Chat
        }
    }

    /// Check if model has vision capability
    fn has_vision_capability(&self, model_id: &str) -> bool {
        let id_lower = model_id.to_lowercase();
        id_lower.contains("vision") || id_lower.contains("multimodal")
    }

    /// Check if model has function calling capability
    fn has_function_call_capability(&self, model_id: &str) -> bool {
        let id_lower = model_id.to_lowercase();
        // Most modern LLMs support function calling except audio models
        !id_lower.contains("whisper") && !id_lower.contains("tts") && !id_lower.contains("guard")
    }

    /// Check if model has reasoning capability
    fn has_reasoning_capability(&self, model_id: &str) -> bool {
        let id_lower = model_id.to_lowercase();
        // Advanced reasoning models
        id_lower.contains("r1") || id_lower.contains("reasoning") || id_lower.contains("o1")
    }

    /// Create a display name from model ID and owner
    fn create_display_name(&self, model_id: &str, owned_by: &str) -> String {
        // Remove prefixes like "meta-llama/" or "openai/"
        let clean_id = if model_id.contains('/') {
            model_id.split('/').last().unwrap_or(model_id)
        } else {
            model_id
        };

        // Format the name nicely
        let formatted_name = clean_id
            .replace('-', " ")
            .replace('_', " ")
            .split_whitespace()
            .map(|word| {
                if word.len() <= 2 || word.chars().all(|c| c.is_numeric()) {
                    word.to_uppercase()
                } else if word == "llama" {
                    "LLaMA".to_string()
                } else if word == "gpt" {
                    "GPT".to_string()
                } else if word == "oss" {
                    "OSS".to_string()
                } else if word == "tts" {
                    "TTS".to_string()
                } else if word.contains(char::is_numeric) && word.len() <= 4 {
                    // Handle cases like "120b", "8b", "70b"
                    word.to_uppercase()
                } else {
                    let mut chars = word.chars();
                    match chars.next() {
                        None => String::new(),
                        Some(first) => first.to_uppercase().collect::<String>() + &chars.collect::<String>(),
                    }
                }
            })
            .collect::<Vec<_>>()
            .join(" ");

        // Add owner prefix if it's not already in the name
        if !formatted_name.to_lowercase().contains(&owned_by.to_lowercase()) {
            format!("{}: {}", owned_by, formatted_name)
        } else {
            formatted_name
        }
    }
}

#[async_trait]
impl Provider for GroqProvider {
    async fn fetch_models(&self) -> Result<Vec<ModelInfo>> {
        // Check if API key is provided
        let api_key = self.api_key.as_ref()
            .context("Groq API key is required. Please set GROQ_API_KEY environment variable or configure in providers.toml")?;

        println!("🔄 Fetching models from Groq API...");

        // Make API request with authorization header
        let response = self.client
            .get(&self.api_url)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .send()
            .await
            .context("Failed to send request to Groq API")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!(
                "Groq API request failed with status {}: {}",
                status,
                error_text
            ));
        }

        // Parse JSON response
        let api_response: GroqApiResponse = response
            .json()
            .await
            .context("Failed to parse Groq API response as JSON")?;

        println!("📋 Found {} models from Groq API", api_response.data.len());

        // Convert to Vec of ModelInfo
        let mut models = Vec::new();
        
        for groq_model in &api_response.data {
            // Skip inactive models
            if !groq_model.active {
                continue;
            }

            let model_info = self.convert_to_model_info(groq_model);
            models.push(model_info);
        }

        println!("✅ Successfully processed {} active Groq models", models.len());
        Ok(models)
    }

    fn provider_id(&self) -> &str {
        "groq"
    }

    fn provider_name(&self) -> &str {
        "Groq"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_model_type_detection() {
        let provider = GroqProvider::new(Some("test-key".to_string()));
        
        assert_eq!(provider.determine_model_type("whisper-large-v3"), ModelType::Audio);
        assert_eq!(provider.determine_model_type("playai-tts"), ModelType::Audio);
        assert_eq!(provider.determine_model_type("llama-guard-4-12b"), ModelType::Chat);
        assert_eq!(provider.determine_model_type("llama3-8b-8192"), ModelType::Chat);
        assert_eq!(provider.determine_model_type("gpt-oss-120b"), ModelType::Chat);
    }

    #[test]
    fn test_display_name_creation() {
        let provider = GroqProvider::new(Some("test-key".to_string()));
        
        assert_eq!(
            provider.create_display_name("meta-llama/llama-3.1-8b-instant", "Meta"),
            "Meta: LLaMA 3.1 8B Instant"
        );
        assert_eq!(
            provider.create_display_name("openai/gpt-oss-120b", "OpenAI"),
            "OpenAI: GPT OSS 120B"
        );
        assert_eq!(
            provider.create_display_name("gemma2-9b-it", "Google"),
            "Google: Gemma2 9B IT"
        );
    }
}
