# Claude Code Configuration

## Project Information

**Public Provider Configuration Tool** - A Rust-based tool to automatically fetch and standardize AI model information from various providers.

## Quick Commands

### Development
```bash
# Build the project
cargo build

# Run with all providers
cargo run -- fetch-all

# Run with specific providers  
cargo run -- fetch-providers -p ppinfra,openai,anthropic,openrouter,gemini,vercel,github_ai,tokenflux,groq,deepseek,ollama

# Run tests
cargo test

# Run with custom output directory
cargo run -- fetch-all -o custom_output
```

### Testing
```bash
# Test PPInfra API endpoint
curl --request GET --url https://api.ppinfra.com/openai/v1/models

# Validate generated JSON
jq empty dist/*.json

# Check file sizes
du -h dist/*.json
```

## Project Structure

```
├── src/
│   ├── models/          # Data structures
│   ├── providers/       # Provider implementations  
│   ├── fetcher/         # Data fetching logic
│   ├── output/          # Output handling
│   ├── processor/       # Data processing logic
│   └── config/          # Configuration management
├── dist/                # Generated JSON output files
├── templates/           # Model template definitions
├── config/             # Configuration files
└── docs/                # Documentation
```

## Key Files

- `src/main.rs` - CLI entry point
- `src/providers/ppinfra.rs` - PPInfra API implementation
- `src/providers/openai.rs` - OpenAI API implementation with template matching
- `src/providers/anthropic.rs` - Anthropic API implementation
- `src/providers/openrouter.rs` - OpenRouter API implementation
- `src/providers/gemini.rs` - Google Gemini API implementation with web scraping
- `src/providers/vercel.rs` - Vercel AI Gateway implementation
- `src/providers/github_ai.rs` - GitHub AI Models implementation
- `src/providers/tokenflux.rs` - Tokenflux implementation
- `src/providers/groq.rs` - Groq API implementation
- `src/providers/deepseek.rs` - DeepSeek web scraping implementation
- `src/providers/ollama.rs` - Ollama template-based implementation
- `templates/openai.json` - OpenAI model template definitions
- `templates/anthropic.json` - Anthropic model template definitions
- `templates/ollama.json` - Ollama model template definitions
- `docs/architecture-overview.md` - Complete architecture documentation
- `.github/workflows/fetch-models.yml` - Automated fetching workflow

## Output Format

Single provider JSON:
```json
{
  "provider": "ppinfra",
  "providerName": "PPInfra", 
  "lastUpdated": "2025-01-15T10:30:00Z",
  "models": [
    {
      "id": "model-id",
      "name": "Model Name",
      "contextLength": 32768,
      "maxTokens": 4096,
      "vision": false,
      "functionCall": true,
      "reasoning": true,
      "type": "chat"
    }
  ]
}
```

## Adding New Providers

### Step-by-Step Guide

1. **Create Provider Implementation**
   - Create new file in `src/providers/` (e.g., `src/providers/newprovider.rs`)
   - Implement the `Provider` trait with required methods:
     - `async fn fetch_models(&self) -> Result<Vec<ModelInfo>>`
     - `fn provider_id(&self) -> &str`
     - `fn provider_name(&self) -> &str`
   
2. **Add Module Reference**
   - Add `pub mod newprovider;` to `src/providers/mod.rs`
   
3. **Register in Main**
   - Import the provider in `src/main.rs`: `providers::newprovider::NewProviderProvider`
   - Add provider initialization in `fetch_all_providers()` function
   
4. **Update Documentation**
   - Add JSON link to README.md "Available Model Data" section
   - Update "Currently Supported Providers" section with provider status

### Template for New Provider

```rust
use async_trait::async_trait;
use anyhow::Result;
use serde::Deserialize;
use crate::models::{ModelInfo, ModelType};
use crate::providers::Provider;

#[derive(Debug, Deserialize)]
struct NewProviderModel {
    // Define API response structure
}

#[derive(Debug, Deserialize)]  
struct NewProviderResponse {
    // Define API response wrapper
}

pub struct NewProviderProvider {
    api_url: String,
    client: reqwest::Client,
}

impl NewProviderProvider {
    pub fn new(api_url: String) -> Self {
        Self {
            api_url,
            client: reqwest::Client::new(),
        }
    }

    fn convert_model(&self, model: NewProviderModel) -> ModelInfo {
        // Convert API model to standardized ModelInfo
        // Detect capabilities: vision, function_call, reasoning
        ModelInfo::new(
            model.id,
            model.name,
            context_length,
            max_tokens,
            vision,
            function_call,
            reasoning,
            ModelType::Chat,
            description,
        )
    }
}

#[async_trait]
impl Provider for NewProviderProvider {
    async fn fetch_models(&self) -> Result<Vec<ModelInfo>> {
        let response = self.client
            .get(&self.api_url)
            .send()
            .await?
            .json::<NewProviderResponse>()
            .await?;

        let models = response.data
            .into_iter()
            .map(|model| self.convert_model(model))
            .collect();

        Ok(models)
    }

    fn provider_id(&self) -> &str {
        "newprovider"
    }

    fn provider_name(&self) -> &str {
        "New Provider"
    }
}
```

### After Adding Provider

The system will automatically:
- Generate `{provider_id}.json` file in `dist/` directory
- Include provider data in `all.json` aggregated file
- Update GitHub Actions to fetch from new provider
- Create downloadable JSON links in releases

## GitHub Actions

The workflow automatically:
- Runs on workflow dispatch (manual trigger)
- Runs on tag push (`release-*.*.*`)
- Fetches latest model data
- Uploads artifacts for manual triggers
- Creates releases with downloadable JSON files for tag triggers

## Environment Variables

Optional API keys can be set as GitHub secrets:
- `OPENAI_API_KEY` - Required for OpenAI provider (complete model list)
- `ANTHROPIC_API_KEY` - Required for Anthropic provider (complete model list)
- `GROQ_API_KEY` - Required for Groq provider (API access)
- `GEMINI_API_KEY` - Optional for Gemini provider (enhances model list)
- Add others as needed

### Provider API Key Requirements
- **PPInfra**: ✅ No API key required - public API
- **OpenRouter**: ✅ No API key required - public model listing API
- **Vercel AI Gateway**: ✅ No API key required - public AI Gateway API
- **GitHub AI Models**: ✅ No API key required - public model listing API
- **Tokenflux**: ✅ No API key required - public marketplace API
- **DeepSeek**: ✅ No API key required - web scraping from documentation
- **Ollama**: ✅ No API key required - template-based provider
- **Gemini**: ⚠️ Optional API key - hybrid web scraping + API approach
- **Groq**: ❌ API key required - private API access only
- **OpenAI**: ❌ API key required - private API access only
- **Anthropic**: ❌ API key required - private API access only

## Common Issues

- **Build failures**: Run `cargo clean && cargo build`
- **JSON validation errors**: Check API response format changes  
- **Rate limiting**: Adjust rate limits in provider configurations
- **Network timeouts**: Increase timeout values in HTTP client

## Next Steps

- [x] Add OpenAI provider implementation (65+ models with template matching)
- [x] Add Anthropic provider implementation (8 Claude models with API key support)
- [x] Implement configuration file loading
- [x] Add OpenRouter provider implementation
- [x] Add Google Gemini provider implementation
- [x] Add Vercel AI Gateway provider implementation
- [x] Add GitHub AI Models provider implementation
- [x] Add Tokenflux provider implementation
- [x] Add Groq provider implementation
- [x] Add DeepSeek provider implementation
- [x] Add Ollama provider implementation (template-based)
- [x] Add rate limiting and retry logic
- [x] Add comprehensive error handling
- [x] Implement template validation system
- [x] Add provider health check endpoints
- [ ] Add Azure OpenAI provider implementation
- [ ] Add AWS Bedrock provider implementation
- [ ] Add Cohere provider implementation
- [ ] Add Mistral AI provider implementation
- [ ] Add Stability AI provider implementation
- [ ] Add Replicate provider implementation
- [ ] Add Hugging Face provider implementation
- [ ] Add advanced caching system
- [ ] Add provider status monitoring
- [ ] Add web UI for model browsing