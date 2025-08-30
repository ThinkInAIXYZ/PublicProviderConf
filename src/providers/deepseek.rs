use async_trait::async_trait;
use anyhow::Result;
use scraper::{Html, Selector};
use std::collections::HashMap;
use crate::models::{ModelInfo, ModelType};
use crate::providers::Provider;

#[derive(Debug, Clone)]
struct DeepSeekModelDetails {
    name: String,
    context_length: u32,
    max_tokens: u32,
    description: String,
    vision: bool,
    function_call: bool,
    reasoning: bool,
}

pub struct DeepSeekProvider {
    docs_url: String,
    client: reqwest::Client,
}

impl DeepSeekProvider {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            .build()
            .unwrap();

        Self {
            docs_url: "https://api-docs.deepseek.com/quick_start/pricing".to_string(),
            client,
        }
    }

    async fn scrape_model_details(&self) -> Result<HashMap<String, DeepSeekModelDetails>> {
        let response = self.client.get(&self.docs_url).send().await?;
        let html_content = response.text().await?;
        let document = Html::parse_document(&html_content);

        let mut models = HashMap::new();

        // Try to parse table format from the docs
        self.parse_model_table(&document, &mut models);
        
        // If no models found in table, add fallback models based on known information
        if models.is_empty() {
            self.add_fallback_models(&mut models);
        }

        Ok(models)
    }

    fn parse_model_table(&self, document: &Html, models: &mut HashMap<String, DeepSeekModelDetails>) {
        // Look for table headers containing "MODEL" to find the model details table
        let table_selector = Selector::parse("table").unwrap();
        let row_selector = Selector::parse("tr").unwrap();
        let cell_selector = Selector::parse("td, th").unwrap();

        for table in document.select(&table_selector) {
            let rows: Vec<_> = table.select(&row_selector).collect();
            
            // Find header row containing "MODEL"
            let mut model_table = false;
            for row in &rows {
                let cells: Vec<_> = row.select(&cell_selector).collect();
                if cells.len() > 0 {
                    let header_text = cells[0].text().collect::<String>().to_uppercase();
                    if header_text.contains("MODEL") {
                        model_table = true;
                        break;
                    }
                }
            }

            if !model_table {
                continue;
            }

            // Parse model data from subsequent rows
            let mut parsing_data = false;
            for row in &rows {
                let cells: Vec<_> = row.select(&cell_selector).collect();
                
                if cells.len() >= 2 {
                    let first_cell = cells[0].text().collect::<String>().trim().to_string();
                    
                    // Skip header rows
                    if first_cell.to_uppercase().contains("MODEL") {
                        parsing_data = true;
                        continue;
                    }
                    
                    if parsing_data {
                        // Look for model names in the first column
                        if first_cell.contains("deepseek-chat") || first_cell.contains("deepseek-reasoner") {
                            self.extract_model_from_row(&cells, models);
                        }
                    }
                }
            }
        }
    }

    fn extract_model_from_row(&self, cells: &[scraper::ElementRef], models: &mut HashMap<String, DeepSeekModelDetails>) {
        if cells.len() < 2 {
            return;
        }

        let model_col = cells[0].text().collect::<String>().trim().to_string();
        let details_col = cells[1].text().collect::<String>().trim().to_string();

        // Extract model names from the text
        if model_col.contains("deepseek-chat") {
            let model_details = self.create_deepseek_chat_details(&details_col);
            models.insert("deepseek-chat".to_string(), model_details);
        }
        
        if model_col.contains("deepseek-reasoner") {
            let model_details = self.create_deepseek_reasoner_details(&details_col);
            models.insert("deepseek-reasoner".to_string(), model_details);
        }
    }

    fn create_deepseek_chat_details(&self, details: &str) -> DeepSeekModelDetails {
        DeepSeekModelDetails {
            name: "DeepSeek Chat".to_string(),
            context_length: 128000, // 128K context
            max_tokens: 8192, // Maximum 8K output
            description: format!(
                "DeepSeek-V3.1 (Non-thinking Mode) - High-performance conversational AI model with 128K context window. {}",
                details
            ),
            vision: false, // Based on documentation, no vision support mentioned
            function_call: true, // Supports function calling
            reasoning: false, // Non-thinking mode
        }
    }

    fn create_deepseek_reasoner_details(&self, details: &str) -> DeepSeekModelDetails {
        DeepSeekModelDetails {
            name: "DeepSeek Reasoner".to_string(),
            context_length: 128000, // 128K context
            max_tokens: 65536, // Maximum 64K output
            description: format!(
                "DeepSeek-V3.1 (Thinking Mode) - Advanced reasoning model with extended output capabilities. {}",
                details
            ),
            vision: false, // Based on documentation, no vision support mentioned
            function_call: false, // Does not support function calling (switches to chat mode if tools are provided)
            reasoning: true, // Thinking mode with reasoning capabilities
        }
    }

    fn add_fallback_models(&self, models: &mut HashMap<String, DeepSeekModelDetails>) {
        println!("📄 Using fallback DeepSeek model definitions");
        
        // Add known DeepSeek models based on the official documentation
        models.insert("deepseek-chat".to_string(), DeepSeekModelDetails {
            name: "DeepSeek Chat".to_string(),
            context_length: 128000,
            max_tokens: 8192,
            description: "DeepSeek-V3.1 (Non-thinking Mode) - High-performance conversational AI model with function calling support and 128K context window. Supports JSON output, function calling, chat prefix completion, and FIM completion.".to_string(),
            vision: false,
            function_call: true,
            reasoning: false,
        });

        models.insert("deepseek-reasoner".to_string(), DeepSeekModelDetails {
            name: "DeepSeek Reasoner".to_string(),
            context_length: 128000,
            max_tokens: 65536,
            description: "DeepSeek-V3.1 (Thinking Mode) - Advanced reasoning model with extended output capabilities up to 64K tokens. Supports JSON output and chat prefix completion. Automatically switches to deepseek-chat when function calling is needed.".to_string(),
            vision: false,
            function_call: false,
            reasoning: true,
        });
    }

    fn convert_model(&self, model_id: String, details: &DeepSeekModelDetails) -> ModelInfo {
        // All DeepSeek models are chat/completion models
        let model_type = ModelType::Chat;

        ModelInfo::new(
            model_id,
            format!("DeepSeek: {}", details.name),
            details.context_length,
            details.max_tokens,
            details.vision,
            details.function_call,
            details.reasoning,
            model_type,
            Some(details.description.clone()),
        )
    }
}

#[async_trait]
impl Provider for DeepSeekProvider {
    async fn fetch_models(&self) -> Result<Vec<ModelInfo>> {
        println!("🔄 Fetching DeepSeek models from documentation...");
        
        // Scrape model information from documentation
        let model_details = self.scrape_model_details().await?;

        if model_details.is_empty() {
            return Err(anyhow::anyhow!("No DeepSeek models found"));
        }

        let mut result = Vec::new();
        for (model_id, details) in model_details {
            result.push(self.convert_model(model_id, &details));
        }

        println!("✅ Successfully processed {} DeepSeek models", result.len());
        Ok(result)
    }

    fn provider_id(&self) -> &str {
        "deepseek"
    }

    fn provider_name(&self) -> &str {
        "DeepSeek"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deepseek_models_creation() {
        let provider = DeepSeekProvider::new();
        let mut models = HashMap::new();
        provider.add_fallback_models(&mut models);
        
        assert_eq!(models.len(), 2);
        assert!(models.contains_key("deepseek-chat"));
        assert!(models.contains_key("deepseek-reasoner"));
        
        let chat_model = &models["deepseek-chat"];
        assert_eq!(chat_model.context_length, 128000);
        assert_eq!(chat_model.max_tokens, 8192);
        assert_eq!(chat_model.function_call, true);
        assert_eq!(chat_model.reasoning, false);
        
        let reasoner_model = &models["deepseek-reasoner"];
        assert_eq!(reasoner_model.context_length, 128000);
        assert_eq!(reasoner_model.max_tokens, 65536);
        assert_eq!(reasoner_model.function_call, false);
        assert_eq!(reasoner_model.reasoning, true);
    }
}
