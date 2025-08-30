use anyhow::Result;
use serde::Serialize;
use std::path::Path;

pub struct JsonWriter;

impl JsonWriter {
    pub async fn write_to_file<T: Serialize>(data: &T, file_path: &Path) -> Result<()> {
        let json_content = serde_json::to_string_pretty(data)?;
        tokio::fs::write(file_path, json_content).await?;
        Ok(())
    }
}