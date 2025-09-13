# Public Provider Configuration Tool - TypeScript CLI

This is the TypeScript version of the Public Provider Configuration Tool CLI, migrated from Rust to use commander.js.

## Installation

1. Install dependencies:
```bash
pnpm install
```

2. Build the project (Vite):
```bash
pnpm build
```

## Usage

### Development (using vite-node)
```bash
pnpm run dev
# watch & reload on changes
pnpm run dev:watch
# or run specific commands directly via vite-node
vite-node src/cli.ts fetch-providers -p ppinfra,openai,anthropic
```

### Production (using Vite build)
```bash
pnpm build
pnpm start
node build/cli.js fetch-providers -p ppinfra,openai,anthropic
```

### Global Installation
```bash
pnpm install -g .
public-provider-conf fetch-all
public-provider-conf fetch-providers -p ppinfra,openai,anthropic
```

## Commands

### Fetch All Providers
```bash
public-provider-conf fetch-all [options]
```

Options:
- `-o, --output <output>`: Output directory for generated JSON files (default: "dist")
- `-c, --config <config>`: Configuration file path (default: "config/providers.toml")

### Fetch Specific Providers
```bash
public-provider-conf fetch-providers [options]
```

Options:
- `-p, --providers <providers>`: Comma-separated list of provider names (required)
- `-o, --output <output>`: Output directory for generated JSON files (default: "dist")
- `-c, --config <config>`: Configuration file path (default: "config/providers.toml")

## Supported Providers

The CLI supports the same providers as the Rust version:
- `ppinfra` - PPInfra API
- `openrouter` - OpenRouter API
- `gemini` - Google Gemini (web scraping + API)
- `vercel` - Vercel AI Gateway
- `github_ai` - GitHub AI Models
- `tokenflux` - Tokenflux
- `groq` - Groq API (requires API key)
- `deepseek` - DeepSeek (web scraping)
- `openai` - OpenAI (requires API key)
- `anthropic` - Anthropic (requires API key)
- `ollama` - Ollama (template-based)
- `siliconflow` - SiliconFlow (template-based)

## Configuration

Create a `config/providers.toml` file based on `config/providers.toml.example` to customize provider settings and API keys.

## Environment Variables

Set API keys as environment variables:
- `OPENAI_API_KEY` - For OpenAI provider
- `ANTHROPIC_API_KEY` - For Anthropic provider
- `GROQ_API_KEY` - For Groq provider
- `GEMINI_API_KEY` - For Gemini provider (optional)

## Project Structure

```
src/
├── cli.ts              # Main CLI entry point
├── commands/           # Command implementations
│   ├── index.ts
│   ├── fetch-all.ts
│   └── fetch-providers.ts
├── models/             # Data structures
│   ├── index.ts
│   ├── model-info.ts
│   └── provider-info.ts
├── providers/          # Provider implementations
│   ├── index.ts
│   ├── provider.ts     # Provider interface
│   └── *.ts           # Individual provider implementations
├── fetcher/            # Data fetching logic
│   ├── index.ts
│   └── data-fetcher.ts
├── output/             # Output handling
│   ├── index.ts
│   ├── types.ts
│   └── output-manager.ts
└── config/             # Configuration management
    ├── index.ts
    └── app-config.ts
```

## Development

### Building
```bash
pnpm build
```

### Development Mode
```bash
npm run dev -- fetch-all
```

### Testing
```bash
# Test CLI parsing
node build/cli.js --help
node build/cli.js fetch-all --help
node build/cli.js fetch-providers --help
```

## Notes

- This is a direct migration from Rust to TypeScript, maintaining the same command structure and functionality
- Provider implementations are currently stubs that need to be implemented
- The configuration loading and CLI parsing are fully functional
- Error handling follows the same patterns as the Rust version
