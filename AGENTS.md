# Repository Guidelines

## Project Structure & Module Organization
- `src/`: TypeScript source. Key areas: `providers/` (provider integrations), `fetcher/`, `processor/`, `output/`, `config/`, `models/`, `commands/`, `types/`.
- `tests/`: Vitest specs (`*.spec.ts`).
- `build/` and `dist/`: build outputs (library + CLI).
- `config/`: configuration; copy `providers.toml.example` → `providers.toml` for local use.
- `templates/`: provider JSON templates used by normalizers/writers.

## Architecture & Data Flow
- CLI (`src/cli.ts`) loads config → instantiates `providers/*` → `fetcher/` pulls data → `processor/` normalizes/dedupes/validates → `output/` writes `{provider}.json` and aggregates.
- Library build is configured via `vite.config.ts`; CLI bundle via `vite.cli.config.ts`.

## Build, Test, and Development Commands
- `pnpm install`: install dependencies.
- `pnpm dev`: run CLI in TS via ts-node (defaults to `fetch-all`).
- `pnpm build`: build library and CLI to `build/` using Vite.
- `pnpm start`: run built CLI (`node build/cli.js fetch-all`).
- `pnpm test` / `pnpm test:watch`: run Vitest once / in watch mode.
- `pnpm coverage`: run tests with coverage.
- `pnpm clean`: remove build artifacts.

Examples:
- Run specific providers: `node build/cli.js fetch-providers -p openai,groq -o dist -c config/providers.toml`
- Local binary after build: `./build/cli.js fetch-all`

## Coding Style & Naming Conventions
- Language: TypeScript targeting Node 18; prefer ES module syntax in `src/`.
- Linting: ESLint (`.eslintrc.json`). Fix issues before PRs.
- Indentation: 2 spaces; no trailing whitespace; end files with newline.
- Naming: PascalCase for classes/types, camelCase for vars/functions, kebab-case for folders/files (existing mixed names may remain until refactors).
- Exports: prefer named exports; keep module boundaries small and focused.

## Testing Guidelines
- Framework: Vitest. Place tests in `tests/` with `*.spec.ts` names mirroring source modules.
- Aim to cover core paths for providers, normalizers, and I/O; include edge cases for empty/invalid data.
- Use temp dirs for FS tests (see `JsonWriter` example). Run `pnpm test` locally and ensure coverage does not regress.

## Add a Provider (Quick Steps)
- Implement `Provider` in `src/providers/yourprovider.ts` with `fetchModels()`, `providerId()`, `providerName()`.
- Export in `src/providers/index.ts`, register in `src/cli.ts#createProvider`.
- Add templates (if needed) under `templates/`, update docs/README sections, and add unit tests in `tests/`.

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `ci:`). Optional scopes: `feat(providers): ...`, `ci(actions): ...`.
- PRs must include: clear description, linked issues, test updates/new tests, and notes on config/template changes. Add screenshots/log snippets for CLI output when relevant.

## Environment & Configuration
- Copy `config/providers.toml.example` → `config/providers.toml`; prefer env vars for secrets.
- API keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY` (required for those providers); `GEMINI_API_KEY` optional; others typically public.
- Never commit secrets; `.gitignore` excludes local config.

## CI Notes
- GitHub Actions fetch workflow runs on manual dispatch and release tags, builds, fetches models, and uploads JSON artifacts.
- Keep CI green: run `pnpm build && pnpm test` locally before pushing.

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
- Templates: add/update under `templates/*.json` when normalizing names or capabilities.
- Normalization: `processor/` trims, dedupes, sorts; keep IDs stable across runs.
- Validation: `output/json-validator.ts` enforces schema before write; prefer failing fast.
- Tests: use Vitest; for HTTP, mock clients (e.g., `vi.mock('axios')`) to avoid network.
