# custom provider

`custom provider` is a generated first-tier fallback catalog for custom provider model capability metadata.
It combines compact, high-signal model cards from official sources into a normal PublicProviderConf provider output:

- `dist/custom-provider.json`
- `dist/all.json` provider entry: `custom-provider`

The catalog contains 37 selected chat, coding, reasoning, and frontier models across nine sources. It is designed to be used before AIHubMix, while AIHubMix remains available as the broader lower-tier fallback source. Inclusion provides capability metadata; it does not guarantee that an official or third-party endpoint serves the model.

## Selected Models

The maintained selection is dated August 31, 2026. Model IDs are exact API identifiers; product names and release dates are not synthesized into additional aliases.

| Official source | Count | Model IDs |
| --- | ---: | --- |
| [OpenAI](https://developers.openai.com/api/docs/models) | 5 | `gpt-5.6`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.5` |
| [Anthropic](https://platform.claude.com/docs/en/about-claude/models/overview) | 4 | `claude-opus-5`, `claude-sonnet-5`, `claude-fable-5`, `claude-haiku-4-5` |
| [Google Gemini](https://ai.google.dev/gemini-api/docs/models) | 5 | `gemini-3.1-pro-preview`, `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite` |
| [Kimi / Moonshot](https://platform.kimi.ai/docs/models) | 5 | `kimi-k3`, `kimi-k2.7-code`, `kimi-k2.7-code-highspeed`, `kimi-k2.6`, `kimi-k2.5` |
| [DeepSeek](https://api-docs.deepseek.com/quick_start/pricing/) | 3 | `deepseek-v4-flash`, `deepseek-v4-pro`, `deepseek-v4-flash-vision-exp` |
| [Zhipu GLM](https://docs.z.ai/guides/overview/pricing) | 3 | `glm-5.3`, `glm-5.3-flash`, `glm-5.2` |
| [MiniMax](https://platform.minimax.io/docs/guides/models-intro) | 3 | `MiniMax-M3`, `MiniMax-M2.7`, `MiniMax-M2.7-highspeed` |
| [StepFun](https://platform.stepfun.ai/docs/en/guides/models/step-3.7-flash) | 3 | `step-3.7-flash`, `step-3.5-flash-2603`, `step-3.5-flash` |
| [Qwen](https://www.alibabacloud.com/help/en/model-studio/models) | 6 | `qwen3.8-max`, `qwen3.7-plus`, `qwen3.8-flash`, `qwen3-coder-plus`, `qwen3-coder-flash`, `qwen3-coder-next` |

Selection favors current models while keeping explicit compatibility coverage: GPT-5.5, Gemini Flash back through 3.5, Gemini 3.1 Pro Preview, and Kimi K2.5. Kimi K2.6 and GLM-5.2 also retain support for disabling thinking. Models outside this table are excluded from this fallback catalog, regardless of whether their upstream API remains available.

Kimi K2.5 is a compatibility entry with `metadata.lifecycle = "legacy"`, `metadata.apiStatus = "sunset-scheduled"`, and `metadata.officialSunsetDate = "2026-08-31"`. Kimi's official model list schedules its full API retirement for that date. Its metadata and historical pricing remain available for third-party providers; it is not marked as an active official API model. Preview and experimental entries retain their lifecycle annotations.

## Capability And Pricing Notes

- Gemini 3.7 Flash accepts `low`, `medium`, and `high` thinking levels, with `medium` as the default. `minimal` is unsupported. Earlier retained Flash models keep their own controls.
- DeepSeek V4 Flash and Pro both expose the effective reasoning levels `low`, `high`, and `max`, defaulting to `high`. The API maps `medium` and `xhigh` to `high`. Temperature affects only non-thinking requests.
- Kimi K3 always thinks and defaults to `max` effort. Its output ceiling is 1,048,576 tokens; 131,072 is the default, and input plus requested output must fit the shared context window. Both K2.7 Code variants also always think. Kimi sampling temperatures are fixed by model and thinking mode.
- GLM-5.3 and GLM-5.3-Flash always think and expose `low`, `high`, and `max` effort. Flash accepts image, video, text, and file input. GLM-5.2 retains optional thinking.
- Step 3.7 Flash supports image/video input and `low`, `medium`, and `high` reasoning effort. Step 3.5 Flash 2603 supports `low` and `high`; the base 3.5 entry does not advertise effort controls. StepFun returns reasoning in the `reasoning` field by default; `reasoning_format=deepseek-style` selects `reasoning_content`. Output shares the context window, and structured output support refers to JSON mode.
- Qwen3.8 Max/Flash and Qwen3.7 Plus support thinking toggles and token budgets. Their thinking input limit is 983,616 tokens, and their maximum reasoning budget is 262,144 tokens. Qwen Coder entries do not advertise thinking controls. Tool support follows Qwen's function-calling guide; hosted model cards list regional restrictions, so endpoint-specific capabilities take precedence over this fallback metadata.

Costs are documentation snapshots in USD per million tokens. DeepSeek uses peak prices; off-peak rates are half those values. Qwen uses Singapore International pricing and explicit cache rates, with the input tier recorded in `metadata.pricingBasis`. Gemini 3.7 Flash and GLM-5.3-Flash include time-limited prices annotated with `metadata.pricingValidUntil`. The generator does not calculate regional tiers, discounts, or future prices.

## Environment Variables

The generator uses official list APIs when keys are available:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `MOONSHOT_API_KEY`
- `DEEPSEEK_API_KEY`

Zhipu GLM, MiniMax, StepFun, and Qwen use official documentation-derived seeds. StepFun and Qwen reuse the existing seed adapter without network discovery or additional API keys.

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

Only selected seed IDs are enriched. An unselected model returned by an API cannot enter the catalog, and a missing API listing does not remove a compatibility seed. `metadata.apiListed` records discovery status separately from lifecycle metadata.

When maintaining the selection, verify exact model IDs and capabilities against the source's official documentation, keep `maxModels` aligned with the selected count, and update the table above. Preserve source URLs and any model-specific limits or lifecycle notes. Unknown release dates, prices, and capabilities should be omitted rather than copied from a neighboring model.

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
  StepFun: N selected
  Qwen: N selected
```
