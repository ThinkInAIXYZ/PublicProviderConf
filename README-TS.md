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

### Development (using ts-node)
```bash
pnpm run dev
# or run specific commands directly
ts-node src/cli.ts fetch-providers -p ppinfra,tokenflux
```

### Production (using Vite build)
```bash
pnpm build
pnpm start
node build/cli.js fetch-providers -p ppinfra,tokenflux
```

### Global Installation
```bash
pnpm install -g .
public-provider-conf fetch-all
public-provider-conf fetch-providers -p ppinfra,tokenflux
```

## Commands

### Fetch All Providers
```bash
public-provider-conf fetch-all [options]
```

Options:
- `-o, --output <output>`: Output directory for generated JSON files (default: "dist")

### Fetch Specific Providers
```bash
public-provider-conf fetch-providers [options]
```

Options:
- `-p, --providers <providers>`: Comma-separated list of provider names (required)
- `-o, --output <output>`: Output directory for generated JSON files (default: "dist")

## Supported Providers

Live-fetch providers:
- `ppinfra` - PPInfra API
- `tokenflux` - Tokenflux API
- `groq` - Groq API (requires API key)
- `ollama` - Ollama (template-based snapshot)
- `siliconflow` - SiliconFlow (template-based snapshot)

Providers such as `openai`, `anthropic`, `openrouter`, `gemini`, `vercel`, `github_ai`, and `deepseek` are now sourced directly from models.dev and no longer have bespoke fetchers in this CLI.

## Configuration

Provider defaults live in `src/config/app-config.ts`. Update that file if you need to change endpoints or rate limits.

## Environment Variables

Set API keys as environment variables:
- `GROQ_API_KEY` - For Groq provider

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
