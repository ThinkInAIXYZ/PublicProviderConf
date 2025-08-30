use crate::models::ModelInfo;

pub struct DataNormalizer;

impl DataNormalizer {
    pub fn normalize_model_name(name: &str) -> String {
        name.trim().to_string()
    }
    
    pub fn normalize_model_info(mut model: ModelInfo) -> ModelInfo {
        model.name = Self::normalize_model_name(&model.name);
        
        if let Some(ref description) = model.description {
            let trimmed = description.trim();
            model.description = if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            };
        }
        
        model
    }
}