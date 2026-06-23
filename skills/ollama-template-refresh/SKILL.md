---
name: ollama-template-refresh
description: Refresh or review the Ollama provider template from official ollama.com library pages. Use when deciding whether manual-templates/ollama.json is stale, updating Ollama model entries, or guiding an external maintenance agent that must inspect web pages instead of relying on a stable API.
---

# Ollama Template Refresh

## Scope

Maintain `manual-templates/ollama.json` from the official Ollama model library pages.

Do not add GitHub workflow automation for this task. Do not add a production scraper unless the user explicitly asks for one. The Ollama pages are the source of truth, but their HTML can change; treat browser/page inspection as a review workflow, not a stable API contract.

## Source Surfaces

- Index page: `https://ollama.com/library`
- Family detail page: `https://ollama.com/library/<family-id>`
- Local source template: `manual-templates/ollama.json`
- Generated provider output: `dist/ollama.json`

The generated `dist/ollama.json` may include `ollama-cloud` data merged from `models.dev`. Do not use `dist/ollama.json` alone to judge whether the local Ollama template is current.

## Refresh Workflow

1. Establish the local baseline.
   - Read `manual-templates/ollama.json`.
   - Read `dist/ollama.json` only as generated output context.
   - Record template model count, generated timestamp, family IDs, and model IDs.
   - Compare template families against dist families and keep `dist`-only IDs separate.

2. Read the official index page.
   - Open `https://ollama.com/library` in a browser or page reader.
   - Collect model family links matching `/library/<family-id>`.
   - Ignore navigation, footer, documentation, pricing, download, and sign-in links.
   - De-duplicate family IDs and compare them with template family IDs.
   - If a model appears only in search snippets or third-party pages, do not add it.

3. Inspect each missing or suspicious family page.
   - Open `https://ollama.com/library/<family-id>`.
   - Verify the family title, summary, badges, primary tag chips, and the `Models` table.
   - Use the detail page's `Models` rows for exact tag IDs when visible.
   - If the page requires "View all" or pagination, open it and verify the extra rows before adding them.
   - If the page layout hides data and you cannot verify the tags, write `I don't know` in the task notes instead of inventing entries.

4. Decide which IDs to add.
   - Always consider the base family ID when the page documents `ollama run <family-id>` or lists a default/latest row.
   - Prefer clean size or capability tags such as `:7b`, `:32b`, `:235b`, `:latest`, or page-listed primary tags.
   - Do not explode every quantization artifact such as `q4_K_M`, `q5_0`, or `fp16` unless the existing template already tracks quantized variants for that family or the user explicitly wants exhaustive artifact coverage.
   - Preserve existing IDs unless the official page clearly removes or renames them. Treat removals as higher risk than additions.

5. Map page data to template fields.
   - `id`: exact Ollama model ID, for example `qwen:7b`.
   - `name` and `display_name`: replace `:` with a space, for example `qwen 7b`; use the family ID unchanged for base entries.
   - `type`: `embedding` when the page has an `embedding` badge; otherwise `chat`.
   - `tool_call`: `true` only when the page has a `tools` badge or equivalent official statement.
   - `vision`: `true` only when the page has a `vision` badge or the model row input includes images.
   - `reasoning.supported`: `true` only when the page has a `thinking` or reasoning badge/statement. Keep `default` false unless the page explicitly says reasoning is default.
   - `limit.context`: use the exact context shown in the model row when available. Convert `2K`, `4K`, `32K`, and `128K` consistently with existing template conventions.
   - `limit.output`: when Ollama does not list an output limit, use the existing template convention of half the context length.
   - `modalities.input`: `["text", "image"]` for vision models; otherwise `["text"]`.
   - `modalities.output`: usually `["text"]`; do not invent non-text output unless Ollama states it.

6. Edit the template carefully.
   - Keep JSON formatting consistent with the existing file.
   - Keep model entries sorted by `id`.
   - Update `metadata.generated_at` to the current UTC timestamp only when template contents change.
   - Do not add `last_updated`, pricing, license, popularity, or size fields unless the template already uses them.

7. Regenerate and validate.
   - Build the project before running the bundled CLI.
   - Regenerate only the target provider when practical:

     ```bash
     pnpm build
     node build/cli.js fetch-providers -p ollama -o dist
     ```

   - Check that `manual-templates/ollama.json` and `dist/ollama.json` parse as JSON.
   - Confirm expected new IDs appear in both the template and generated output, except IDs intentionally supplied only by `ollama-cloud`.
   - Review `git diff -- manual-templates/ollama.json dist/ollama.json` for unrelated changes.

## Reporting

Report:

- official source pages inspected;
- model families added, removed, or left unchanged;
- uncertain items, with `I don't know` as the first sentence for any unsupported claim;
- validation commands run and whether they passed.
