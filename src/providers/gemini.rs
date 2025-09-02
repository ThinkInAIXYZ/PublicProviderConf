use async_trait::async_trait;
use anyhow::Result;
use serde::Deserialize;
use scraper::{Html, Selector};
use std::collections::HashMap;
use crate::models::{ModelInfo, ModelType};
use crate::providers::Provider;

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct GeminiApiModel {
    id: String,
    object: String,
    owned_by: String,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct GeminiApiResponse {
    object: String,
    data: Vec<GeminiApiModel>,
}

#[derive(Debug, Clone)]
struct GeminiModelDetails {
    name: String,
    context_length: u32,
    max_tokens: u32,
    vision: bool,
    function_call: bool,
    reasoning: bool,
}

pub struct GeminiProvider {
    api_url: String,
    docs_url: String,
    client: reqwest::Client,
    api_key: Option<String>,
}

impl GeminiProvider {
    pub fn new(api_key: Option<String>) -> Self {
        let client = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            .build()
            .unwrap();

        Self {
            api_url: "https://generativelanguage.googleapis.com/v1beta/openai/models".to_string(),
            docs_url: "https://ai.google.dev/gemini-api/docs/models".to_string(),
            client,
            api_key,
        }
    }

    async fn fetch_api_models(&self) -> Result<Vec<String>> {
        if self.api_key.is_none() {
            return Ok(Vec::new());
        }

        let mut request = self.client.get(&self.api_url);
        
        if let Some(ref key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", key));
        }

        let response = request.send().await?;
        
        if !response.status().is_success() {
            return Err(anyhow::anyhow!("API request failed with status: {}", response.status()));
        }

        let api_response: GeminiApiResponse = response.json().await?;
        
        Ok(api_response.data.into_iter().map(|model| model.id).collect())
    }

    async fn scrape_model_details(&self) -> Result<HashMap<String, GeminiModelDetails>> {
        let response = self.client.get(&self.docs_url).send().await?;
        let html_content = response.text().await?;
        let document = Html::parse_document(&html_content);

        let mut models = HashMap::new();

        // Try to parse table format first
        self.parse_table_format(&document, &mut models);
        
        // If no models found in table, try parsing other formats
        if models.is_empty() {
            self.parse_list_format(&document, &mut models);
        }

        // Add some known models if scraping fails
        if models.is_empty() {
            self.add_fallback_models(&mut models);
        }

        Ok(models)
    }

    fn parse_table_format(&self, document: &Html, models: &mut HashMap<String, GeminiModelDetails>) {
        let table_selector = Selector::parse("table").unwrap();
        let row_selector = Selector::parse("tr").unwrap();
        let cell_selector = Selector::parse("td, th").unwrap();

        for table in document.select(&table_selector) {
            let rows: Vec<_> = table.select(&row_selector).collect();
            
            // Skip header row
            for row in rows.iter().skip(1) {
                let cells: Vec<_> = row.select(&cell_selector).collect();
                
                if cells.len() >= 3 {
                    let raw_model_text = cells[0].text().collect::<String>();
                    let description = cells[1].text().collect::<String>().trim().to_string();
                    let optimized_for = cells[2].text().collect::<String>().trim().to_string();

                    // Extract clean model name from the raw text
                    if let Some(clean_model_name) = self.extract_clean_model_name(&raw_model_text) {
                        let model_details = self.create_model_details(&clean_model_name, &description, &optimized_for);
                        let model_id = format!("models/{}", clean_model_name);
                        models.insert(model_id, model_details);
                    }
                }
            }
        }
    }

    fn parse_list_format(&self, document: &Html, models: &mut HashMap<String, GeminiModelDetails>) {
        let li_selector = Selector::parse("li").unwrap();
        let code_selector = Selector::parse("code").unwrap();

        for item in document.select(&li_selector) {
            if let Some(code_elem) = item.select(&code_selector).next() {
                let raw_model_id = code_elem.text().collect::<String>().trim().to_string();
                let description = item.text().collect::<String>().replace(&raw_model_id, "").trim().to_string();

                if raw_model_id.contains("gemini") || raw_model_id.contains("models/") {
                    // Clean the model ID
                    let clean_model_id = if raw_model_id.starts_with("models/") {
                        raw_model_id
                    } else {
                        format!("models/{}", raw_model_id)
                    };
                    
                    let model_name = clean_model_id.strip_prefix("models/").unwrap_or(&clean_model_id);
                    let model_details = self.create_model_details(model_name, &description, "");
                    models.insert(clean_model_id, model_details);
                }
            }
        }
    }

    fn add_fallback_models(&self, models: &mut HashMap<String, GeminiModelDetails>) {
        // Add known Gemini models as fallback
        let fallback_models = vec![
            ("models/gemini-1.5-pro-latest", "Gemini 1.5 Pro", 2097152, 8192, true, true, true),
            ("models/gemini-1.5-flash-latest", "Gemini 1.5 Flash", 1048576, 8192, true, true, false),
            ("models/gemini-1.0-pro", "Gemini 1.0 Pro", 32768, 2048, false, true, false),
            ("models/embedding-gecko-001", "Embedding Gecko", 2048, 0, false, false, false),
        ];

        for (id, name, context, max_tokens, vision, func, reasoning) in fallback_models {
            models.insert(id.to_string(), GeminiModelDetails {
                name: name.to_string(),
                context_length: context,
                max_tokens,
                vision,
                function_call: func,
                reasoning,
            });
        }
    }

    fn extract_clean_model_name(&self, raw_text: &str) -> Option<String> {
        let text = raw_text.trim();
        
        // Split by newlines and extract the model ID part
        for line in text.lines() {
            let line = line.trim();
            if line.starts_with("gemini-") || line.contains("gemini") && line.contains("-") {
                // Clean up the model name - remove extra spaces, newlines
                let clean_name = line.split_whitespace().collect::<Vec<_>>().join("-")
                    .replace("--", "-")
                    .trim_matches('-')
                    .to_lowercase();
                
                if clean_name.contains("gemini") {
                    return Some(clean_name);
                }
            }
        }
        
        // Fallback: try to extract from the first part if it contains gemini
        if text.to_lowercase().contains("gemini") {
            let first_part = text.lines().next().unwrap_or(text).trim();
            if first_part.to_lowercase().contains("gemini") {
                // Convert display name to model ID format
                let clean_name = first_part
                    .to_lowercase()
                    .replace("gemini ", "gemini-")
                    .replace(" ", "-")
                    .replace("--", "-")
                    .trim_matches('-')
                    .to_string();
                return Some(clean_name);
            }
        }
        
        None
    }

    fn create_model_details(&self, model_name: &str, description: &str, optimized_for: &str) -> GeminiModelDetails {
        // Clean model name - remove any prefixes and ensure consistent format
        let clean_name = if model_name.starts_with("models/") {
            model_name.strip_prefix("models/").unwrap_or(model_name)
        } else {
            model_name
        };

        // Create display name from clean model name
        let display_name = self.create_display_name(clean_name);

        // Detect capabilities from name and description
        let text = format!("{} {} {}", clean_name, description, optimized_for).to_lowercase();
        
        let vision = text.contains("vision") || text.contains("image") || text.contains("multimodal") || clean_name.contains("1.5");
        let function_call = text.contains("function") || text.contains("tool") || text.contains("calling") || clean_name.contains("pro");
        let reasoning = text.contains("reasoning") || text.contains("complex") || clean_name.contains("pro");

        // Determine context length and max tokens based on model name
        let (context_length, max_tokens) = if clean_name.contains("1.5-pro") {
            (2097152, 8192)
        } else if clean_name.contains("1.5-flash") {
            (1048576, 8192)
        } else if clean_name.contains("1.0-pro") {
            (32768, 2048)
        } else if clean_name.contains("embedding") {
            (2048, 0)
        } else {
            (32768, 4096)
        };

        GeminiModelDetails {
            name: format!("Google: {}", display_name),
            context_length,
            max_tokens,
            vision,
            function_call,
            reasoning,
        }
 }

    fn create_display_name(&self, model_name: &str) -> String {
        // Convert kebab-case model name to display name
        model_name
            .split('-')
            .map(|part| {
                if part.len() == 1 || part.chars().all(|c| c.is_numeric()) {
                    part.to_uppercase()
                } else {
                    let mut chars = part.chars();
                    match chars.next() {
                        None => String::new(),
                        Some(first) => first.to_uppercase().collect::<String>() + &chars.collect::<String>(),
                    }
                }
            })
            .collect::<Vec<_>>()
            .join(" ")
    }

    fn convert_model(&self, model_id: String, details: &GeminiModelDetails) -> ModelInfo {
        let model_type = if model_id.contains("embedding") {
            ModelType::Embedding
        } else {
            ModelType::Chat
        };

        ModelInfo::new(
            model_id,
            details.name.clone(),
            details.context_length,
            details.max_tokens,
            details.vision,
            details.function_call,
            details.reasoning,
            model_type,
        )
    }
}

#[async_trait]
impl Provider for GeminiProvider {
    async fn fetch_models(&self) -> Result<Vec<ModelInfo>> {
        // First, try to get model list from API (if API key is provided)
        let api_models = self.fetch_api_models().await.unwrap_or_else(|_| Vec::new());
        
        // Then scrape detailed information from documentation
        let model_details = self.scrape_model_details().await?;

        let mut result = Vec::new();

        if !api_models.is_empty() {
            // Use API models as the authoritative list
            for model_id in api_models {
                if let Some(details) = model_details.get(&model_id) {
                    result.push(self.convert_model(model_id, details));
                } else {
                    // Create basic model info if details not found
                    let basic_details = self.create_model_details(&model_id, "", "");
                    result.push(self.convert_model(model_id, &basic_details));
                }
            }
        } else {
            // If no API key or API failed, use scraped data
            for (model_id, details) in model_details {
                result.push(self.convert_model(model_id, &details));
            }
        }

        Ok(result)
    }

    fn provider_id(&self) -> &str {
        "gemini"
    }

    fn provider_name(&self) -> &str {
        "Google Gemini"
    }
}