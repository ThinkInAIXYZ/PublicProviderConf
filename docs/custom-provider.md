# custom provider

`custom provider` is a generated first-tier fallback catalog for custom provider model capability metadata.
It combines compact, high-signal model cards from official sources into a normal PublicProviderConf provider output:

- `dist/custom-provider.json`
- `dist/all.json` provider entry: `custom-provider`

The catalog is intentionally focused on current chat, coding, reasoning, and frontier models. It is designed to be used before AIHubMix, while AIHubMix remains available as the broader lower-tier fallback source.

## Official Sources

- OpenAI
- Anthropic
- Google Gemini
- Kimi / Moonshot
- DeepSeek
- Zhipu GLM
- MiniMax

## Environment Variables

The generator uses official list APIs when keys are available:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `MOONSHOT_API_KEY`
- `DEEPSEEK_API_KEY`

Zhipu GLM and MiniMax currently use official documentation-derived seeds because the maintained catalog needs capability fields that are not exposed through a stable public model-list API in this repository.

Missing API keys only skip that source's live API refresh. The provider still uses the maintained official documentation-derived seed entries for that source.

## Refresh Commands

Generate only the custom provider:

```bash
node build/cli.js fetch-providers -p custom-provider -o dist
```

Generate the full catalog:

```bash
node build/cli.js fetch-all -o dist
```

For development:

```bash
pnpm build
node build/cli.js fetch-providers -p custom-provider -o dist
```

## Seeds And Overrides

The seed catalog lives in:

```text
manual-templates/custom-provider-overrides.json
```

This file is excluded from manual template provider loading and is consumed by the custom provider generator directly. It stores official documentation-derived capability metadata, including context windows, output limits, tool/function support, reasoning support, modalities, lifecycle notes, and source URLs.

Official model list APIs are used as an availability/enrichment signal. When those APIs return only basic model IDs, the generator preserves the seed capability metadata and annotates model metadata with API listing status.

## Logging

Generation prints a concise source summary:

```text
Custom provider generation:
  OpenAI: N selected
  Anthropic: N selected
  Gemini: N selected
  Kimi: N selected
  DeepSeek: N selected
  Zhipu: N selected
  MiniMax: N selected
```
