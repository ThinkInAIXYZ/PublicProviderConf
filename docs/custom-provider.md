# custom provider

`custom provider` is a generated first-tier fallback catalog for custom provider model capability metadata.
It combines compact, high-signal model cards from official sources into a normal PublicProviderConf provider output:

- `dist/custom-provider.json`
- `dist/all.json` provider entry: `custom-provider`

The catalog contains 42 selected chat, coding, reasoning, and frontier models across nine sources. It is designed to be used before AIHubMix, while AIHubMix remains available as the broader lower-tier fallback source. Inclusion provides capability metadata; it does not guarantee that an official or third-party endpoint serves the model.

## Selected Models

The maintained selection is dated September 14, 2026. Model IDs are exact API identifiers; product names and release dates are not synthesized into additional aliases.

| Official source | Count | Model IDs |
| --- | ---: | --- |
| [OpenAI](https://developers.openai.com/api/docs/models) | 6 | `gpt-6-astra`, `gpt-5.6`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.5` |
| [Anthropic](https://platform.claude.com/docs/en/about-claude/models/overview) | 5 | `claude-fable-5-1`, `claude-opus-5`, `claude-sonnet-5`, `claude-fable-5`, `claude-haiku-4-5` |
| [Google Gemini](https://ai.google.dev/gemini-api/docs/models) | 6 | `gemini-3.8-flash`, `gemini-3.1-pro-preview`, `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite` |
| [Kimi / Moonshot](https://platform.kimi.ai/docs/models) | 5 | `kimi-k3`, `kimi-k2.7-code`, `kimi-k2.7-code-highspeed`, `kimi-k2.6`, `kimi-k2.5` |
| [DeepSeek](https://api-docs.deepseek.com/quick_start/pricing/) | 4 | `deepseek-flash`, `deepseek-v4-flash`, `deepseek-v4-pro`, `deepseek-v4-flash-vision-exp` |
| [Zhipu GLM](https://docs.z.ai/guides/overview/pricing) | 3 | `glm-5.3`, `glm-5.3-flash`, `glm-5.2` |
| [MiniMax](https://platform.minimax.io/docs/guides/models-intro) | 3 | `MiniMax-M3`, `MiniMax-M2.7`, `MiniMax-M2.7-highspeed` |
| [StepFun](https://platform.stepfun.ai/docs/en/guides/models/step-3.7-flash) | 3 | `step-3.7-flash`, `step-3.5-flash-2603`, `step-3.5-flash` |
| [Qwen](https://www.alibabacloud.com/help/en/model-studio/models) | 7 | `qwen3.8-max`, `qwen3.7-plus`, `qwen3.8-flash`, `qwen3.7-flash`, `qwen3-coder-plus`, `qwen3-coder-flash`, `qwen3-coder-next` |

Selection favors current models while keeping explicit compatibility coverage: GPT-5.5, GPT-5.6, Gemini Flash back through 3.5, Gemini 3.1 Pro Preview, Claude Fable 5, and Kimi K2.5. Kimi K2.6 and GLM-5.2 also retain support for disabling thinking. Models outside this table are excluded from this fallback catalog, regardless of whether their upstream API remains available.

Kimi K2.5 is a compatibility entry with `metadata.lifecycle = "legacy"`, `metadata.apiStatus = "retired"`, and `metadata.officialSunsetDate = "2026-08-31"`. Kimi retired the model on that date, and calls to the retired names now return a 404 error; the metadata and historical pricing remain available for third-party providers. Claude Fable 5 is retained with `metadata.lifecycle = "legacy"` and `metadata.apiStatus = "active-legacy"` because Anthropic lists it as Active (legacy). The three Qwen3 Coder entries carry `lifecycle = "legacy"` because Alibaba no longer recommends them. Preview and experimental entries retain their lifecycle annotations.

## Capability And Pricing Notes

- GPT-6 Astra is the current OpenAI flagship: 1.05M context, 128K output, `low` through `max` effort with no `none` level, and tool calling through the Responses API. The `gpt-5.6` alias routes to `gpt-5.6-sol`, and both carry promotional prices.
- Claude Fable 5.1 always uses adaptive thinking, defaults to `high` effort, does not support forced tool use, and bills cache reads at a quarter of the Fable 5 rate. Claude Opus 5 can disable thinking only at effort `high` or lower.
- Gemini 3.7 Flash and Gemini 3.8 Flash accept `low`, `medium`, and `high` thinking levels, with `medium` as the default. `minimal` is unsupported. Earlier retained Flash models keep their own controls.
- DeepSeek V4.1 Flash (`deepseek-flash`) is the current API model: 1M context, 384K output, and native vision. Thinking is on by default at `high` effort, with `low`, `high`, and `max` as the effective levels. The retired names `deepseek-v4-flash` and `deepseek-v4-flash-vision-exp` temporarily route to it and bill at Flash rates.
- DeepSeek V4 Flash and Pro both expose the effective reasoning levels `low`, `high`, and `max`, defaulting to `high`. The API maps `medium` and `xhigh` to `high`. Temperature affects only non-thinking requests.
- Kimi K3 always thinks and defaults to `max` effort. Its output ceiling is 1,048,576 tokens; 131,072 is the default, and input plus requested output must fit the shared context window. Both K2.7 Code variants also always think. Kimi sampling temperatures are fixed by model and thinking mode.
- GLM-5.3 and GLM-5.3-Flash always think and expose `low`, `high`, and `max` effort. Flash accepts image, video, text, and file input, and its promotional rate ended on September 10, 2026. GLM-5.2 retains optional thinking and accepts the wider `none` through `max` range: `none` and `minimal` stop thinking, `low` and `medium` map to `high`, and `xhigh` maps to `max`.
- Step 3.7 Flash supports image/video input and `low`, `medium`, and `high` reasoning effort. Step 3.5 Flash 2603 supports `low` and `high`; the base 3.5 entry does not advertise effort controls. StepFun returns reasoning in the `reasoning` field by default; `reasoning_format=deepseek-style` selects `reasoning_content`. Output shares the context window, and structured output support refers to JSON mode.
- Qwen3.8 Max/Flash and Qwen3.7 Plus support thinking toggles and token budgets, and the Qwen3.8 series also accepts `reasoning.effort` (`none`, `low`, `medium`, `xhigh`, default `xhigh`); effort and `thinking_budget` cannot be combined. Their thinking input limit is 983,616 tokens, and their maximum reasoning budget is 262,144 tokens. Qwen3.7 Flash and Qwen3.7 Plus keep only the toggle and budget controls because the official effort list does not name the Qwen3.7 series. The Qwen3 Coder entries are legacy, do not expose thinking controls, and are documented without function calling on the International endpoints. Tool support follows Qwen's function-calling guide; hosted model cards list regional restrictions, so endpoint-specific capabilities take precedence over this fallback metadata.

Costs are documentation snapshots in USD per million tokens. DeepSeek uses peak prices; off-peak rates are half those values. Qwen uses Singapore International pricing and explicit cache rates, with the input tier recorded in `metadata.pricingBasis`. Gemini 3.6 Flash, 3.7 Flash, and 3.8 Flash carry introductory Global prices annotated with `metadata.pricingValidUntil`, and GPT-5.6 Sol plus the `gpt-5.6` alias carry promotional prices annotated the same way. GLM-5.3-Flash returned to its standard rate when its promotional period ended on September 10, 2026. MiniMax M3 prices are permanent 50%-off standard-tier rates, with multi-tier and priority pricing recorded in `metadata.notes`. The generator does not calculate regional tiers, discounts, or future prices.

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
