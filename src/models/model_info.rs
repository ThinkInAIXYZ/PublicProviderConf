use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ModelType {
    Chat,
    Completion,
    Embedding,
    ImageGeneration,
    Audio,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub context_length: u32,
    pub max_tokens: u32,
    pub vision: bool,
    pub function_call: bool,
    pub reasoning: bool,
    #[serde(rename = "type")]
    pub model_type: ModelType,
}

impl ModelInfo {
    pub fn new(
        id: String,
        name: String,
        context_length: u32,
        max_tokens: u32,
        vision: bool,
        function_call: bool,
        reasoning: bool,
        model_type: ModelType,
    ) -> Self {
        Self {
            id,
            name,
            context_length,
            max_tokens,
            vision,
            function_call,
            reasoning,
            model_type,
        }
    }
}