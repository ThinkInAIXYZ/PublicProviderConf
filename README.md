# PublicProviderConf

Automated tool to merge the upstream models.dev catalog with a handful of custom providers (PPInfra, Tokenflux, Groq, etc.) and generate standardized JSON files for easy consumption by chatbots and other applications.

## ✨ Features

- 🤖 **Standardized Format**: Unified JSON output format for easy chatbot parsing
- 🔄 **Auto Detection**: Intelligent detection of model capabilities (vision, function calling, reasoning)
- 🌐 **Multi-Provider Support**: Extensible architecture supporting multiple AI model providers
- ⚡ **Concurrent Fetching**: Efficient concurrent data retrieval from multiple providers
- 🎯 **Aggregated Output**: Generate both individual provider files and complete aggregated files
- 🚀 **GitHub Actions**: Automated scheduled updates for model information

### 📄 Available Model Data

Access the latest AI model information in JSON format:

- **All Providers Combined**: [all.json](dist/all.json) - Complete aggregated data from all providers
- **OpenAI**: [openai.json](dist/openai.json) - OpenAI models with comprehensive template matching (65+ models including GPT-5, o1/o3/o4 series)
- **Anthropic**: [anthropic.json](dist/anthropic.json) - Anthropic Claude models (8 models including Opus 4.1)
- **PPInfra**: [ppinfra.json](dist/ppinfra.json) - PPInfra provider models
- **OpenRouter**: [openrouter.json](dist/openrouter.json) - models.dev sourced OpenRouter catalog  
- **Google Gemini**: [gemini.json](dist/gemini.json) - models.dev sourced Google Gemini API catalog
- **Vercel AI Gateway**: [vercel.json](dist/vercel.json) - models.dev sourced Vercel AI Gateway catalog
- **GitHub AI Models**: [github_ai.json](dist/github_ai.json) - models.dev sourced GitHub Models marketplace
- **Tokenflux**: [tokenflux.json](dist/tokenflux.json) - Tokenflux marketplace models
- **Groq**: [groq.json](dist/groq.json) - Groq hosted models (API key required)
- **DeepSeek**: [deepseek.json](dist/deepseek.json) - models.dev sourced DeepSeek catalog

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Install Dependencies
```bash
git clone https://github.com/your-repo/PublicProviderConf.git
cd PublicProviderConf
pnpm install
```

### Build (Vite)
```bash
pnpm build
```
This runs two Vite builds: library bundles to `build/index.(mjs|cjs)` and the CLI to `build/cli.js`.

## 🚀 Usage

### Basic Usage

Fetch model information from all providers:
```bash
pnpm start
```

Specify output directory:
```bash
pnpm start -o ./output
```

Fetch from specific providers (only needed for providers not already covered by models.dev, e.g. ppinfra/tokenflux):
```bash
node build/cli.js fetch-providers -p ppinfra,tokenflux
```

### Development Mode
```bash
pnpm run dev
# or run specific commands directly
ts-node src/cli.ts fetch-providers -p ppinfra
```

### CLI Options

```bash
# Fetch from all providers
pnpm start fetch-all [OPTIONS]

# Fetch from specific providers
pnpm start fetch-providers -p <PROVIDERS> [OPTIONS]

Options:
  -o, --output <OUTPUT>    Output directory [default: dist]
  -h, --help              Show help information
```

### models.dev Source Configuration

The CLI downloads the upstream catalog from [models.dev](https://models.dev/api.json) before merging in the extra providers that
this project maintains. You can point to an alternate source (or an offline snapshot) via the `MODELS_DEV_API_URL`
environment variable. When the primary source fails, the CLI will fall back to `MODELS_DEV_SNAPSHOT_PATH` if set, and finally to
`manual-templates/models-dev-snapshot.json` when that file exists.

Manual provider definitions and overrides now live in the `manual-templates/` directory. Each template is stored in the models.dev schema so it can be merged directly with the upstream dataset without additional conversions.

## 📋 Output Format

### Individual Provider JSON
```json
{
  "id": "ppinfra",
  "name": "PPInfra",
  "display_name": "PPInfra",
  "updated_at": "2025-01-15T10:30:00Z",
  "models": [
    {
      "id": "deepseek/deepseek-v3.1",
      "name": "Deepseek V3.1",
      "display_name": "Deepseek V3.1",
      "type": "chat",
      "context_length": 163840,
      "max_output_tokens": 163840,
      "capabilities": {
        "vision": false,
        "function_calling": true,
        "reasoning": true
      },
      "metadata": {
        "source": "public-provider-conf"
      }
    }
  ]
}
```

### Aggregated JSON (all.json)
```json
{
  "version": "offline-snapshot",
  "updated_at": "2025-01-15T10:30:00Z",
  "providers": {
    "ppinfra": {
      "id": "ppinfra",
      "name": "PPInfra",
      "display_name": "PPInfra",
      "updated_at": "2025-01-15T10:30:00Z",
      "models": [
        {
          "id": "deepseek/deepseek-v3.1",
          "name": "Deepseek V3.1",
          "display_name": "Deepseek V3.1",
          "type": "chat",
          "context_length": 163840,
          "max_output_tokens": 163840,
          "capabilities": {
            "vision": false,
            "function_calling": true,
            "reasoning": true
          },
          "metadata": {
            "source": "public-provider-conf"
          }
        }
      ]
    }
  }
}
```

## 🔧 Configuration

Provider endpoints, timeouts, and rate limits are bundled with the CLI (see `src/config/app-config.ts`). You only need to supply credentials for providers that still perform live API calls:

```bash
# Required for Groq requests to succeed
export GROQ_API_KEY="your-key-here"
```

You can tweak any of the built-in defaults by editing `src/config/app-config.ts` directly (for example, to point at staging endpoints or change rate limits).

#### Provider Notes

- **PPInfra**, **Tokenflux**, **Ollama**, and **SiliconFlow** are fetched directly by this CLI without credentials.
- **Groq** requires `GROQ_API_KEY` if you enable live fetching.
- **OpenAI**, **Anthropic**, **OpenRouter**, **Gemini**, **Vercel**, **GitHub Models**, and **DeepSeek** now come from the upstream models.dev dataset—no live fetchers are maintained for them anymore.

### models.dev-sourced Providers

For providers delivered by models.dev (OpenAI, Anthropic, OpenRouter, Gemini, Vercel, GitHub Models, DeepSeek, etc.), this repo now acts as a pass-through. We merge the upstream dataset with any local templates/overrides and emit the normalized JSON without making additional HTTP calls. To customize their metadata, update the corresponding `manual-templates/*.json` files.

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
├── docs/                # Detailed documentation
└── .claude/            # Claude Code configuration
```

## 🔌 Adding New Providers

The system supports two provider implementation patterns:

### Template-Based Providers (Recommended for providers with minimal API metadata)

1. **Create template file** in `manual-templates/{provider}.json`:
```json
[{
  "id": "model-id",
  "name": "Model Name",
  "contextLength": 128000,
  "maxTokens": 8192,
  "vision": true,
  "functionCall": true,
  "reasoning": false,
  "type": "chat",
  "description": "Model description",
  "match": ["model-id", "versioned-model-id", "alias"]
}]
```

2. **Implement provider** in `src/providers/{provider}.rs`:
```rust
#[async_trait]
impl Provider for NewProvider {
    async fn fetch_models(&self) -> Result<Vec<ModelInfo>> {
        // Load templates and match with API response
        let templates = Self::load_templates()?;
        let api_models = self.fetch_api_models().await?;
        
        // Match API models with templates
        for api_model in api_models {
            if let Some(template) = templates.get(&api_model.id) {
                models.push(template.to_model_info());
            } else {
                models.push(self.create_auto_model(&api_model.id));
            }
        }
    }
}
```

### Direct Conversion Providers (For APIs with rich metadata)

```rust
#[async_trait] 
impl Provider for NewProvider {
    async fn fetch_models(&self) -> Result<Vec<ModelInfo>> {
        // Direct API to ModelInfo conversion
        let response = self.client.get(&self.api_url).send().await?;
        let models = response.models.into_iter()
            .map(|m| self.convert_model(m))
            .collect();
        Ok(models)
    }
}
```

For detailed implementation guide, see [Provider Implementation Guide](.claude/provider_implementer.md) and [Architecture Documentation](docs/architecture-overview.md).

## 📊 Currently Supported Providers

- ✅ **PPInfra** – Live API fetcher with capability detection
- ✅ **Tokenflux** – Marketplace fetcher with detailed specifications
- ✅ **Groq** – Optional live API fetcher (requires `GROQ_API_KEY`)
- ☑️ **models.dev catalog** – Provides OpenAI, Anthropic, OpenRouter, Gemini, Vercel, GitHub Models, DeepSeek, and many others; this project simply merges templates/overrides on top of the upstream dataset

## 🛠️ Development

### Core Commands
```bash
pnpm install      # Install dependencies
pnpm build        # Build library + CLI bundles
pnpm start        # Run built CLI (fetch-all)
pnpm run dev      # Run CLI via ts-node (fetch-all)
```

### Debug Mode
```bash
DEBUG=true pnpm run dev fetch-all
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
const response = await fetch('https://raw.githubusercontent.com/ThinkInAIXYZ/PublicProviderConf/refs/heads/dev/dist/all.json');
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
