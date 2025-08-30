# PublicProviderConf

Automated tool to fetch AI model information from various providers (PPInfra, OpenRouter, OpenAI, Google, etc.) and generate standardized JSON files for easy consumption by chatbots and other applications.

## ✨ Features

- 🤖 **Standardized Format**: Unified JSON output format for easy chatbot parsing
- 🔄 **Auto Detection**: Intelligent detection of model capabilities (vision, function calling, reasoning)
- 🌐 **Multi-Provider Support**: Extensible architecture supporting multiple AI model providers
- ⚡ **Concurrent Fetching**: Efficient concurrent data retrieval from multiple providers
- 🎯 **Aggregated Output**: Generate both individual provider files and complete aggregated files
- 🚀 **GitHub Actions**: Automated scheduled updates for model information

### 📄 Available Model Data

Access the latest AI model information in JSON format:

- **All Providers Combined**: [all.json](https://github.com/zerob13/PublicProviderConf/raw/main/provider_configs/all.json) - Complete aggregated data from all providers
- **PPInfra**: [ppinfra.json](https://github.com/zerob13/PublicProviderConf/raw/main/provider_configs/ppinfra.json) - PPInfra provider models
- **OpenRouter**: [openrouter.json](https://github.com/zerob13/PublicProviderConf/raw/main/provider_configs/openrouter.json) - OpenRouter provider models

## 📦 Installation

### Prerequisites
- Rust 1.70+ 
- Cargo

### Build
```bash
git clone https://github.com/your-repo/PublicProviderConf.git
cd PublicProviderConf
cargo build --release
```

## 🚀 Usage

### Basic Usage

Fetch model information from all providers:
```bash
cargo run -- fetch-all
```

Specify output directory:
```bash
cargo run -- fetch-all -o ./output
```

Fetch from specific providers:
```bash
cargo run -- fetch-providers -p ppinfra,openai
```

### CLI Options

```bash
# Fetch from all providers
cargo run -- fetch-all [OPTIONS]

# Fetch from specific providers
cargo run -- fetch-providers -p <PROVIDERS> [OPTIONS]

Options:
  -o, --output <OUTPUT>    Output directory [default: dist]
  -c, --config <CONFIG>    Config file path [default: config/providers.toml]
  -h, --help              Show help information
```

## 📋 Output Format

### Individual Provider JSON
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
      "description": "DeepSeek-V3.1 latest model with mixed reasoning modes..."
    }
  ]
}
```

### Aggregated JSON (all.json)
```json
{
  "version": "1.0.0",
  "generatedAt": "2025-01-15T10:30:00Z",
  "totalModels": 38,
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
          "description": "DeepSeek-V3.1 latest model..."
        }
      ]
    }
  }
}
```

## 🔧 Configuration

### Provider Configuration (Optional)
Create `config/providers.toml` file:
```toml
[ppinfra]
api_url = "https://api.ppinfra.com/openai/v1/models"
rate_limit = 10
timeout = 30

[openrouter]
api_url = "https://openrouter.ai/api/v1/models"
api_key_env = "OPENROUTER_API_KEY"
rate_limit = 5

[openai]
api_url = "https://api.openai.com/v1/models" 
api_key_env = "OPENAI_API_KEY"
rate_limit = 20
```

### Environment Variables
If providers require API keys, set corresponding environment variables:
```bash
export OPENAI_API_KEY="your-key-here"
export OPENROUTER_API_KEY="your-key-here"
```

## 🤖 GitHub Actions Automation

The project includes GitHub Actions workflow with multiple trigger methods:

### 🕰️ Automated Triggers
- **Code Changes**: Triggers on pushes to main branch (src/**, Cargo.toml, workflow file) - Direct commit to main
- **Release Tags**: Automatically triggered by `release-*.*.*` tags

### 🖱️ Manual Triggers
- **Workflow Dispatch**: Manual trigger with optional provider selection - Creates PR for review
- **Tag Release**: Create and push a `release-x.y.z` tag for versioned releases

### 🔄 Update Mechanism
- **Manual/Workflow Dispatch**: Creates a Pull Request for review and manual merge
- **Code Push Events**: Direct commit to main branch (to avoid infinite loops)
- **Tag Events**: No commits, only creates releases

### 📦 Release Types

#### Versioned Releases
```bash
# Create a versioned release
git tag release-1.0.0
git push origin release-1.0.0

# This will automatically:
# 1. Fetch latest model data
# 2. Generate JSON files
# 3. Create GitHub release with comprehensive assets
# 4. Upload individual provider archives
```

### 📄 Release Content
Each tagged release includes:
- 📊 **Total model count** and **provider statistics**
- 🕐 **Generation timestamp**
- 📦 **Complete package** (`provider-configs-{version}.tar.gz`)
- 🔗 **Individual provider archives**
- 📋 **Direct JSON file access**
- 💻 **Integration examples**

## 📁 Project Structure

```
├── src/
│   ├── models/          # Data structure definitions
│   ├── providers/       # Provider implementations
│   ├── fetcher/         # Data fetching logic
│   ├── output/          # Output processing
│   └── config/          # Configuration management
├── dist/                # Generated JSON files
├── provider_configs/    # Git-tracked JSON files
├── docs/                # Detailed documentation
└── .claude/            # Claude Code configuration
```

## 🔌 Adding New Providers

1. Create a new file in `src/providers/` (e.g., `openai.rs`)
2. Implement the `Provider` trait:
```rust
#[async_trait]
impl Provider for OpenAIProvider {
    async fn fetch_models(&self) -> Result<Vec<ModelInfo>> {
        // Implement API calls and data conversion
    }
    
    fn provider_id(&self) -> &str { "openai" }
    fn provider_name(&self) -> &str { "OpenAI" }
}
```
3. Add the module in `src/providers/mod.rs`
4. Register the provider in `src/main.rs`

For detailed development guide, see [Architecture Documentation](docs/architecture-overview.md).

## 📊 Currently Supported Providers

- ✅ **PPInfra** - 38 models with reasoning, function calling, and vision capability detection
- ✅ **OpenRouter** - 600+ models with comprehensive capability detection and metadata
- 🚧 **OpenAI** - Planned  
- 🚧 **Google Gemini** - Planned

## 🛠️ Development

### Run Tests
```bash
cargo test
```

### Debug Mode
```bash
RUST_LOG=debug cargo run -- fetch-all
```

### Code Formatting
```bash
cargo fmt
cargo clippy
```

## 📄 Documentation

- [Architecture Design](docs/architecture-overview.md) - Complete architecture documentation
- [Claude Code Configuration](CLAUDE.md) - Development environment setup
- [Provider Implementation Guide](.claude/provider_implementer.md) - Guide for developing new providers
- [Data Conversion Standards](.claude/data_converter.md) - Data standardization specifications
- [Format Validation Standards](.claude/format_validator.md) - JSON format validation

## 📈 Usage Examples

### Chatbot Integration Example
```javascript
// Fetch all models
const response = await fetch('https://your-domain.com/provider_configs/all.json');
const data = await response.json();

// Filter models that support function calling from all providers
const toolModels = [];
Object.values(data.providers).forEach(provider => {
  provider.models.forEach(model => {
    if (model.functionCall) {
      toolModels.push({...model, providerId: provider.providerId});
    }
  });
});

// Get models from specific provider
const ppinfraModels = data.providers.ppinfra?.models || [];

// Find models with reasoning capability across all providers
const reasoningModels = [];
Object.values(data.providers).forEach(provider => {
  provider.models.forEach(model => {
    if (model.reasoning) {
      reasoningModels.push({...model, providerId: provider.providerId});
    }
  });
});
```

### Data Analysis
Generated JSON files can be used for:
- 📊 Model capability statistical analysis
- 🔍 Model search and filtering
- 💰 Price comparison analysis
- 📈 Model trend tracking

## 🤝 Contributing

Issues and Pull Requests are welcome!

1. Fork the project
2. Create a feature branch
3. Implement new features or fixes
4. Submit a Pull Request

## 📝 License

[MIT License](LICENSE)

## 🙏 Acknowledgments

Thanks to all AI model providers for offering open API interfaces, making this project possible.