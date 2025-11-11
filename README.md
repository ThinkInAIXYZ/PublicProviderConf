# PublicProviderConf

PublicProviderConf is a TypeScript CLI and library that aggregates the canonical [models.dev catalog](https://models.dev/api.json) together with several custom provider integrations (PPInfra, TokenFlux, Groq, Qiniu-hosted snapshots, and others). The tool normalizes capabilities, fills in missing metadata, and emits standardized JSON payloads that downstream apps can consume without bespoke adapters.

## Highlights
- Unified JSON schema for every provider with consistent capability flags
- Concurrent fetcher pipeline that merges live APIs with maintained templates
- Configurable CLI built with Commander + Vite for both dev (ts-node) and production builds
- Automated GitHub Actions workflow that can publish fresh `dist/` artifacts and sync them to CDN storage

## Data Sources & Coverage
The aggregated dataset starts with the upstream `https://models.dev/api.json`. During each run we overlay:
- Provider overrides from `manual-templates/`
- Live fetchers for operators that are not (yet) covered by models.dev, such as `ppinfra`, `tokenflux`, and `groq`
- Lightweight snapshots for ecosystems like `ollama` and `siliconflow`

After post-processing, the CLI writes the final catalog to `dist/`. Key outputs include:
- `dist/all.json` – aggregated providers, model counts, and capability rollups
- `dist/{provider}.json` – normalized payload for each individual provider

Consumers can point CDN tooling at the `dist/` directory (see GitHub Actions workflow) to publish the latest data for public access.

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm 8+

### Install & Build
```bash
git clone https://github.com/ThinkInAIXYZ/PublicProviderConf.git
cd PublicProviderConf
pnpm install
pnpm build
```
`pnpm build` runs both Vite targets: the library bundle under `build/` and the bundled CLI at `build/cli.js`.

## CLI Usage

### Development Flow
```bash
pnpm run dev                 # ts-node, defaults to fetch-all
ts-node src/cli.ts fetch-all # explicit command
ts-node src/cli.ts fetch-providers -p ppinfra,tokenflux
```

### Production / Bundled CLI
```bash
pnpm build
pnpm start                              # equivalent to node build/cli.js fetch-all
node build/cli.js fetch-providers -p ppinfra,tokenflux -o ./dist
```

### Global Installation (optional)
```bash
pnpm install -g .
public-provider-conf fetch-all
public-provider-conf fetch-providers -p ppinfra,tokenflux
```

### Command Reference
```bash
public-provider-conf fetch-all [options]
public-provider-conf fetch-providers -p <providers> [options]

Options:
  -p, --providers <providers>  Comma-separated provider IDs
  -o, --output <dir>           Output directory (default: dist)
  -h, --help                   Show command help
```

## Supported Providers
- models.dev catalog (OpenAI, Anthropic, OpenRouter, Google Gemini, Vercel, GitHub Models, DeepSeek, etc.)
- PPInfra (live API)
- TokenFlux (marketplace API)
- Groq (requires `GROQ_API_KEY`)
- AIHubMix (live API)
- Ollama (snapshot templates)
- SiliconFlow (snapshot templates)

Adding a new provider usually involves implementing `Provider` under `src/providers/`, adding configuration to `src/config/app-config.ts`, and optionally contributing templates to `manual-templates/`.
AIHubMix is fetched live from `https://aihubmix.com/api/v1/models` so you have a ready-made fallback dataset for models that aren't yet covered by the primary `models.dev` catalog. Keeping the provider enabled ensures `dist/aihubmix.json` stays current without manual snapshots.

## Project Structure
```
src/
├─ cli.ts                 # CLI entry point (Commander)
├─ commands/              # fetch-all, fetch-providers commands
├─ config/                # default configuration and loaders
├─ fetcher/               # HTTP + file-based fetch orchestrators
├─ models/                # Type definitions and helpers
├─ output/                # Writers, validators, distribution helpers
└─ providers/             # Individual provider integrations
```

## Configuration & Environment
- Default endpoints and flags live in `src/config/app-config.ts`
- Override the models.dev endpoint with `MODELS_DEV_API_URL`
- Provide an offline fallback snapshot via `MODELS_DEV_SNAPSHOT_PATH`
- Set API secrets (e.g. `GROQ_API_KEY`) in your environment or CI secrets

## Development Tips
```bash
pnpm install      # install deps
pnpm run dev      # ts-node dev loop
pnpm build        # Vite builds (library + CLI)
pnpm start        # run bundled CLI
```
Use `DEBUG=true` when you need verbose fetcher logs.

## CI & Distribution
The `.github/workflows/fetch-models.yml` workflow builds the project, runs the fetch pipeline, validates JSON output, and can sync the `dist/` directory to a Qiniu CDN bucket for distribution. Ensure the Qiniu credentials are available as repository secrets when enabling the CDN path.

## Contributing
1. Fork the repository
2. Create a feature branch
3. Run `pnpm build` before raising a PR
4. Submit your PR with relevant test notes and updated templates if applicable

Issues and ideas are always welcome.

## License

Apache-2.0 license 
