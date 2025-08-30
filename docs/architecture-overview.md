# PublicProviderConf Architecture Overview

## Project Goals

Automatically fetch AI model interface information from various providers (OpenRouter, OpenAI, Gemini, PPInfra, etc.), combine with locally maintained model configurations, and generate standardized JSON files for easy consumption by chatbots and other applications.

## Core Architecture

### 1. Data Flow
```
Provider APIs → Rust Fetcher Modules → Unified JSON Format → Provider JSON Files → Aggregated JSON
```

### 2. Output Format Design

#### Individual Provider JSON Format
```json
{
  "provider": "ppinfra",
  "providerName": "PPInfra",
  "lastUpdated": "2025-01-15T10:30:00Z",
  "models": [
    {
      "id": "deepseek/deepseek-v3.1",
      "name": "Deepseek V3.1", 
      "contextLength": 163840,
      "maxTokens": 163840,
      "vision": false,
      "functionCall": true,
      "reasoning": true,
      "type": "chat",
      "description": "Brief description"
    }
  ]
}
```

#### Aggregated JSON Format (all.json)
```json
{
  "version": "1.0.0",
  "generatedAt": "2025-01-15T10:30:00Z",
  "totalModels": 150,
  "providers": {
    "ppinfra": {
      "providerId": "ppinfra",
      "providerName": "PPInfra",
      "models": [
        {
          "id": "deepseek/deepseek-v3.1",
          "name": "Deepseek V3.1",
          "contextLength": 163840,
          "maxTokens": 163840,
          "vision": false,
          "functionCall": true,
          "reasoning": true,
          "type": "chat",
          "description": "Brief description"
        }
      ]
    }
  }
}
```

## Rust Project Structure

```
src/
├── main.rs                 // CLI entry point, configuration parsing
├── lib.rs                  // Library entry point
├── models/
│   ├── mod.rs             // Model definitions
│   ├── provider.rs        // Provider struct
│   ├── model_info.rs      // ModelInfo struct
│   └── config.rs          // Configuration struct
├── providers/
│   ├── mod.rs             // Provider interface definition
│   ├── ppinfra.rs         // PPInfra implementation
│   ├── openrouter.rs      // OpenRouter implementation
│   ├── openai.rs          // OpenAI implementation
│   └── gemini.rs          // Gemini implementation
├── fetcher/
│   ├── mod.rs             // Data fetcher
│   ├── http_client.rs     // HTTP client
│   └── rate_limiter.rs    // Rate limiting
├── processor/
│   ├── mod.rs             // Data processor
│   ├── normalizer.rs      // Data normalization
│   └── aggregator.rs      // Data aggregation
├── output/
│   ├── mod.rs             // Output handling
│   ├── json_writer.rs     // JSON file writing
│   └── validator.rs       // Output validation
└── config/
    ├── mod.rs             // Configuration management
    └── providers.toml     // Provider configuration file
```

## Core Component Design

### 1. Provider Trait
```rust
#[async_trait]
pub trait Provider {
    async fn fetch_models(&self) -> Result<Vec<ModelInfo>, Error>;
    fn provider_id(&self) -> &str;
    fn provider_name(&self) -> &str;
}
```

### 2. ModelInfo Struct
```rust
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub context_length: u32,
    pub max_tokens: u32,
    pub vision: bool,
    pub function_call: bool,
    pub reasoning: bool,
    pub model_type: ModelType,
    pub description: Option<String>,
}
```

### 3. CLI Interface
```bash
# Fetch models from all providers
cargo run -- --all

# Fetch from specific providers
cargo run -- --providers ppinfra,openai

# Specify output directory
cargo run -- --output ./dist

# Generate aggregated file
cargo run -- --aggregate
```

## GitHub Actions Workflow

### Workflow Triggers
- Scheduled task: Daily at UTC 06:00
- Manual trigger: workflow_dispatch
- Push to main branch

### Workflow Steps
1. Checkout code
2. Setup Rust environment
3. Compile project
4. Run data fetching
5. Validate generated JSON
6. Commit updates to dist/
7. Create Release and package JSON files

### Output Directory Structure
```
dist/
├── ppinfra.json
├── openrouter.json
├── openai.json
├── gemini.json
└── all.json
```

## Configuration Management

### providers.toml Configuration File
```toml
[ppinfra]
api_url = "https://api.ppinfra.com/openai/v1/models"
rate_limit = 10  # requests per second
timeout = 30     # seconds

[openrouter]
api_url = "https://openrouter.ai/api/v1/models"
api_key_env = "OPENROUTER_API_KEY"
rate_limit = 5

[openai]
api_url = "https://api.openai.com/v1/models"
api_key_env = "OPENAI_API_KEY"
rate_limit = 20
```

## Error Handling Strategy

1. **Network errors**: Retry mechanism, maximum 3 attempts
2. **API limits**: Respect rate limits, exponential backoff
3. **Data parsing errors**: Log errors but continue processing other models
4. **Partial failures**: Generate JSON with available data, mark failed providers

## Extensibility Considerations

1. **New Provider addition**: Simply implement Provider trait
2. **Field extension**: Add new fields to ModelInfo, maintain backward compatibility
3. **Output formats**: Support multiple output formats through feature flags
4. **Caching strategy**: Can add Redis cache to reduce API calls

## Performance Optimization

1. **Concurrent processing**: Use tokio for concurrent data fetching from multiple providers
2. **Incremental updates**: Compare timestamps, only update changed data
3. **Compressed output**: Generate gzip compressed versions of JSON files