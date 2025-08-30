use anyhow::Result;
use crate::models::ProviderInfo;

pub struct JsonValidator;

impl JsonValidator {
    pub fn validate_provider_info(provider: &ProviderInfo) -> Result<()> {
        if provider.provider.is_empty() {
            anyhow::bail!("Provider ID cannot be empty");
        }
        
        if provider.provider_name.is_empty() {
            anyhow::bail!("Provider name cannot be empty");
        }
        
        if provider.models.is_empty() {
            anyhow::bail!("Provider must have at least one model");
        }
        
        for model in &provider.models {
            Self::validate_model_info(model)?;
        }
        
        Ok(())
    }

    fn validate_model_info(model: &crate::models::ModelInfo) -> Result<()> {
        if model.id.is_empty() {
            anyhow::bail!("Model ID cannot be empty");
        }
        
        if model.name.is_empty() {
            anyhow::bail!("Model name cannot be empty");
        }
        
        if model.context_length == 0 {
            anyhow::bail!("Context length must be greater than 0");
        }
        
        if model.max_tokens == 0 {
            anyhow::bail!("Max tokens must be greater than 0");
        }
        
        if model.max_tokens > model.context_length {
            anyhow::bail!("Max tokens cannot exceed context length");
        }
        
        Ok(())
    }
}