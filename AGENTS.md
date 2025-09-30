# Repository Guidelines

## Project Structure & Module Organization
- `src/`: TypeScript source. Key areas: `providers/` (provider integrations), `fetcher/`, `processor/`, `output/`, `config/`, `models/`, `commands/`.
- `build/` and `dist/`: build outputs (library + CLI).
- `config/`: default provider configuration definitions.
- `manual-templates/`: provider JSON templates used by normalizers/writers.

## Architecture & Data Flow
- CLI (`src/cli.ts`) loads config → instantiates `providers/*` → `fetcher/` pulls data → `processor/` normalizes/dedupes/validates → `output/` writes `{provider}.json` and aggregates.
- Library build is configured via `vite.config.ts`; CLI bundle via `vite.cli.config.ts`.

## Build and Development Commands
- `pnpm install`: install dependencies.
- `pnpm dev`: run CLI in TS via ts-node (defaults to `fetch-all`).
- `pnpm build`: build library and CLI to `build/` using Vite.
- `pnpm start`: run built CLI (`node build/cli.js fetch-all`).
- `pnpm clean`: remove build artifacts.

Examples:
- Run specific providers: `node build/cli.js fetch-providers -p ppinfra,groq -o dist`
- Local binary after build: `./build/cli.js fetch-all`

## Coding Style & Naming Conventions
- Language: TypeScript targeting Node 18; prefer ES module syntax in `src/`.
- Linting: ESLint (`.eslintrc.json`). Fix issues before PRs.
- Indentation: 2 spaces; no trailing whitespace; end files with newline.
- Naming: PascalCase for classes/types, camelCase for vars/functions, kebab-case for folders/files (existing mixed names may remain until refactors).
- Exports: prefer named exports; keep module boundaries small and focused.

## Add a Provider (Quick Steps)
- Implement `Provider` in `src/providers/yourprovider.ts` with `fetchModels()`, `providerId()`, `providerName()`.
- Export in `src/providers/index.ts`, register in `src/cli.ts#createProvider`.
- Add templates (if needed) under `manual-templates/`, update docs/README sections, and manually verify via CLI commands.

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `ci:`). Optional scopes: `feat(providers): ...`, `ci(actions): ...`.
- PRs must include: clear description, linked issues, test updates/new tests, and notes on config/template changes. Add screenshots/log snippets for CLI output when relevant.

## Agent Task Tracking
- When you pick up a new feature or refactor, create a scratch file under `docs/` named `feat_<short-task-name>.md`.
- Use that file to break down subtasks, capture progress notes, and log any open questions while you work.
- Remove the tracking file once the task is complete or handed off so `docs/` stays tidy.

## Environment & Configuration
- Provider defaults ship with the repo (`src/config/app-config.ts`).
- API keys: only `GROQ_API_KEY` is needed for live fetching; models.dev covers OpenAI/Anthropic/OpenRouter/Gemini/etc. without extra credentials.
- Never commit secrets.

## CI Notes
- GitHub Actions fetch workflow runs on manual dispatch and release tags, builds, fetches models, and uploads JSON artifacts.
- Keep CI green: run `pnpm build` locally before pushing.

## Output JSON Example
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

## Templates & Validation
- Templates: add/update under `manual-templates/*.json` when normalizing names or capabilities.
- Normalization: `processor/` trims, dedupes, sorts; keep IDs stable across runs.
- Validation: `output/json-validator.ts` enforces schema before write; prefer failing fast.
