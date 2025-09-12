# Claude Code Configuration

## Project Information

**Public Provider Configuration Tool** - A TypeScript/Node.js-based tool to automatically fetch and standardize AI model information from various providers.

## Quick Commands

### Development
```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run with all providers
pnpm start fetch-all

# Run with specific providers  
pnpm start fetch-providers -p ppinfra,openai,anthropic,openrouter,gemini,vercel,github_ai,tokenflux,groq,deepseek,ollama

# Run tests
pnpm test

# Type checking
pnpm run typecheck

# Linting
pnpm run lint

# Development mode
pnpm run dev fetch-all

# Run with custom output directory
pnpm start fetch-all -o custom_output
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
│   ├── models/          # TypeScript interfaces and types
│   ├── providers/       # Provider implementations  
│   ├── fetcher/         # Data fetching logic
│   ├── output/          # Output handling
│   ├── processor/       # Data processing logic
│   ├── config/          # Configuration management
│   └── cli.ts           # CLI entry point
├── dist/                # Generated JSON output files & compiled JS
├── templates/           # Model template definitions
├── config/             # Configuration files
├── docs/                # Documentation
└── dist_rust_backup/    # Backup of Rust version output for comparison
```

## Key Files

- `src/cli.ts` - CLI entry point with Commander.js
- `src/providers/ppinfra.ts` - PPInfra API implementation
- `src/providers/openai.ts` - OpenAI API implementation with template matching
- `src/providers/anthropic.ts` - Anthropic API implementation
- `src/providers/openrouter.ts` - OpenRouter API implementation
- `src/providers/gemini.ts` - Google Gemini API implementation with web scraping
- `src/providers/vercel.ts` - Vercel AI Gateway implementation
- `src/providers/github-ai.ts` - GitHub AI Models implementation
- `src/providers/tokenflux.ts` - Tokenflux implementation
- `src/providers/groq.ts` - Groq API implementation
- `src/providers/deepseek.ts` - DeepSeek web scraping implementation
- `src/providers/ollama.ts` - Ollama template-based implementation
- `src/providers/siliconflow.ts` - SiliconFlow template-based implementation
- `templates/openai.json` - OpenAI model template definitions
- `templates/anthropic.json` - Anthropic model template definitions
- `templates/ollama.json` - Ollama model template definitions
- `docs/architecture-overview.md` - Complete architecture documentation
- `.github/workflows/fetch-models.yml` - Automated fetching workflow (Node.js)

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
   - Create new file in `src/providers/` (e.g., `src/providers/newprovider.ts`)
   - Implement the `Provider` interface with required methods:
     - `async fetchModels(): Promise<ModelInfo[]>`
     - `providerId(): string`
     - `providerName(): string`
   
2. **Add Module Export**
   - Add export to `src/providers/index.ts`: `export { NewProviderProvider } from './newprovider';`
   
3. **Register in CLI**
   - Import the provider in `src/cli.ts`: `import { NewProviderProvider } from './providers/newprovider';`
   - Add provider initialization in the appropriate command handler
   
4. **Update Documentation**
   - Add JSON link to README.md "Available Model Data" section
   - Update "Currently Supported Providers" section with provider status

### Template for New Provider

```typescript
import { Provider } from './provider';
import { ModelInfo, ModelType, createModelInfo } from '../models/model-info';
import axios from 'axios';

interface NewProviderModel {
    id: string;
    name: string;
    contextSize: number;
    maxOutputTokens: number;
    features: string[];
    modelType: string;
}

interface NewProviderResponse {
    data: NewProviderModel[];
}

export class NewProviderProvider implements Provider {
    private apiUrl: string;
    private client = axios.create();

    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }

    private convertModel(model: NewProviderModel): ModelInfo {
        const vision = model.features.some(f => f.includes('vision') || f.includes('image'));
        const functionCall = model.features.some(f => f.includes('function') || f.includes('tool'));
        const reasoning = model.features.some(f => f.includes('reasoning') || f.includes('thinking'));
        
        const modelType = model.modelType.toLowerCase() === 'chat' ? ModelType.Chat :
                         model.modelType.toLowerCase() === 'completion' ? ModelType.Completion :
                         model.modelType.toLowerCase() === 'embedding' ? ModelType.Embedding :
                         ModelType.Chat;

        return createModelInfo(
            model.id,
            model.name,
            model.contextSize,
            model.maxOutputTokens,
            vision,
            functionCall,
            reasoning,
            modelType
        );
    }

    async fetchModels(): Promise<ModelInfo[]> {
        try {
            const response = await this.client.get<NewProviderResponse>(this.apiUrl);
            const models = response.data.data
                .map(model => this.convertModel(model));
            
            return models;
        } catch (error) {
            throw new Error(`Failed to fetch models from NewProvider: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    providerId(): string {
        return 'newprovider';
    }

    providerName(): string {
        return 'New Provider';
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

Optional API keys can be set as GitHub secrets or local environment variables:
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
- **SiliconFlow**: ✅ No API key required - template-based provider
- **Gemini**: ⚠️ Optional API key - hybrid web scraping + API approach
- **Groq**: ❌ API key required - private API access only
- **OpenAI**: ❌ API key required - private API access only
- **Anthropic**: ❌ API key required - private API access only

## Common Issues

- **Build failures**: Run `npm run build` or check TypeScript compilation
- **JSON validation errors**: Check API response format changes  
- **Rate limiting**: Adjust rate limits in provider configurations
- **Network timeouts**: Increase timeout values in HTTP client
- **TypeScript errors**: Run `npm run typecheck` to identify type issues

## Next Steps

- [x] Migrate from Rust to TypeScript/Node.js
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
- [x] Add SiliconFlow provider implementation (template-based)
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