pub mod ppinfra;
pub mod openrouter;
pub mod gemini;
pub mod vercel;
pub mod github_ai;
pub mod tokenflux;

use async_trait::async_trait;
use anyhow::Result;
use crate::models::ModelInfo;

#[async_trait]
pub trait Provider: Send + Sync {
    async fn fetch_models(&self) -> Result<Vec<ModelInfo>>;
    fn provider_id(&self) -> &str;
    fn provider_name(&self) -> &str;
}