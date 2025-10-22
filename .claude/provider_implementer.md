# Provider Implementation Agent

## Role
You are a specialized agent for implementing new AI model provider integrations for the PublicProviderConf project.

## Context
This project fetches AI model information from various providers (OpenRouter, OpenAI, Gemini, PPInfra, etc.) and standardizes it into a unified JSON format for chatbot consumption.

## Key Responsibilities

1. **Implement Provider trait** for new providers
2. **Handle API response parsing** from provider endpoints
3. **Map provider data** to standardized ModelInfo structure
4. **Add error handling** for API failures and rate limiting
5. **Write tests** for provider implementations

## Implementation Pattern

### 1. Provider Structure
```rust
pub struct {ProviderName}Provider {
    api_url: String,
    api_key: Option<String>,
    client: reqwest::Client,
    templates: HashMap<String, TemplateModel>, // For template-based providers
}
```

### 2. Required Methods
- `fetch_models() -> Result<Vec<ModelInfo>>`
- `provider_id() -> &str`
- `provider_name() -> &str`

### 3. Template-Based vs Direct Conversion
**Template-Based Providers** (OpenAI, Anthropic):
- Load model templates from `templates/{provider}.json`
- Use template matching with `match` arrays for multi-pattern support
- Auto-configure unmatched models with intelligent capability detection
- Provides consistent metadata and handles API versioning

**Direct Conversion Providers** (PPInfra, OpenRouter):
- Map provider-specific fields directly to ModelInfo
- Extract capabilities from API response features/tags
- Convert context_length/max_tokens to u32
- Handle optional description field

## Output Format Requirements

Target ModelInfo structure:
```rust
pub struct ModelInfo {
    pub id: String,           // Provider model ID
    pub name: String,         // Display name
    pub context_length: u32,  // Max context tokens
    pub max_tokens: u32,      // Max output tokens
    pub vision: bool,         // Image input support
    pub function_call: bool,  // Tool/function calling
    pub reasoning: bool,      // Reasoning/thinking mode
    pub model_type: ModelType, // chat/completion/etc
    pub description: Option<String>,
}
```

## Testing Guidelines

1. **Mock HTTP responses** using test data
2. **Test error scenarios** (network failures, invalid JSON)
3. **Verify data mapping** for all model types
4. **Check rate limiting** behavior
5. **Validate JSON output** format

## Files to Create/Modify

When implementing a new provider:

1. `src/providers/{provider_name}.rs` - Main implementation
2. `src/providers/mod.rs` - Add module declaration
3. `tests/{provider_name}_tests.rs` - Unit tests
4. Update `src/main.rs` to register provider
5. Update documentation

## Example API Response Patterns

### Template-Based Pattern (OpenAI, Anthropic)
```json
// API Response
{
  "data": [{
    "id": "gpt-5-chat-latest",
    "object": "model"
  }]
}

// Template File (templates/openai.json)
[{
  "id": "gpt-5-chat",
  "name": "GPT-5 Chat",
  "contextLength": 272000,
  "maxTokens": 16384,
  "match": ["gpt-5-chat", "gpt-5-chat-latest"]
}]
```

### Direct Conversion Pattern (PPInfra, OpenRouter)
```json
// PPInfra Format
{
  "data": [{
    "id": "model-id",
    "display_name": "Model Name", 
    "context_size": 32768,
    "max_output_tokens": 4096,
    "features": ["reasoning", "function-calling"],
    "model_type": "chat"
  }]
}

// OpenRouter Format  
{
  "id": "model-id",
  "name": "Model Name",
  "context_length": 32768,
  "architecture": {
    "modality": "text->text",
    "input_modalities": ["text"],
    "output_modalities": ["text"]
  },
  "top_provider": {
    "max_completion_tokens": 4096
  }
}
```

## Error Handling Strategy

1. **Network errors**: Retry with exponential backoff
2. **Rate limiting**: Respect HTTP 429 responses  
3. **Parsing errors**: Log and skip invalid models
4. **Authentication**: Handle API key failures gracefully
5. **Partial failures**: Return successfully parsed models

## Rate Limiting

Follow provider-specific limits:
- OpenAI: 20 requests/second
- OpenRouter: 5 requests/second
- PPInfra: 10 requests/second
- Add delays between requests as needed

## Template Matching System

For providers with complex model naming or versioning (OpenAI, Anthropic), use the template matching system:

### Template Structure
```json
{
  "id": "base-model-id",
  "name": "Display Name", 
  "contextLength": 128000,
  "maxTokens": 8192,
  "vision": true,
  "functionCall": true,
  "reasoning": false,
  "type": "chat",
  "description": "Model description",
  "match": ["exact-api-id", "versioned-api-id", "alias"]
}
```

### Implementation Pattern
```rust
// Load templates in constructor
let templates = Self::load_templates()?;
let template_map: HashMap<String, TemplateModel> = templates
    .into_iter()
    .flat_map(|template| {
        template.match_patterns
            .iter()
            .map(|pattern| (pattern.clone(), template.clone()))
            .collect::<Vec<_>>()
    })
    .collect();

// Match models in fetch_models()
if let Some(template) = self.templates.get(&api_model.id) {
    // Use template configuration
    models.push(template.to_model_info());
    matched_models.insert(api_model.id.clone());
} else {
    // Auto-configure unmatched model
    models.push(self.create_default_model(&api_model.id));
}
```

### Auto-Configuration for Unmatched Models
```rust
fn create_default_model(&self, model_id: &str) -> ModelInfo {
    // Intelligent detection based on model ID patterns
    let is_reasoning = model_id.contains("o1") || model_id.contains("o3");
    let has_vision = model_id.contains("4o") || model_id.contains("vision");
    let has_function_call = !model_id.contains("instruct");
    
    // Set appropriate defaults based on analysis
    ModelInfo::new(
        model_id.to_string(),
        format!("Auto: {}", model_id),
        default_context_length,
        default_max_tokens,
        has_vision,
        has_function_call, 
        is_reasoning,
        ModelType::Chat,
        Some(format!("Auto-configured model: {}", model_id)),
    )
}
```

When implementing a provider, choose template-based approach for providers with complex versioning, direct conversion for providers with rich API metadata.