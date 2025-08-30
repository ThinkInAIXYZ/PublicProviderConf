# Claude Code Configuration

## Project Information

**Public Provider Configuration Tool** - A Rust-based tool to automatically fetch and standardize AI model information from various providers.

## Quick Commands

### Development
```bash
# Build the project
cargo build

# Run with all providers
cargo run -- fetch-all

# Run with specific providers  
cargo run -- fetch-providers -p ppinfra,openai

# Run tests
cargo test

# Run with custom output directory
cargo run -- fetch-all -o custom_output
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
│   ├── models/          # Data structures
│   ├── providers/       # Provider implementations  
│   ├── fetcher/         # Data fetching logic
│   ├── output/          # Output handling
│   └── config/          # Configuration management
├── dist/                # Generated JSON output files
├── provider_configs/    # Git-tracked JSON files
└── docs/                # Documentation
```

## Key Files

- `src/main.rs` - CLI entry point
- `src/providers/ppinfra.rs` - PPInfra API implementation
- `docs/architecture-overview.md` - Complete architecture documentation
- `.github/workflows/fetch-models.yml` - Automated fetching workflow

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

1. Create new provider file in `src/providers/`
2. Implement the `Provider` trait
3. Add to `src/providers/mod.rs`
4. Register in `src/main.rs`

## GitHub Actions

The workflow automatically:
- Runs daily at 06:00 UTC
- Fetches latest model data
- Commits updates to `provider_configs/`
- Creates releases with downloadable JSON files

## Environment Variables

Optional API keys can be set as GitHub secrets:
- `OPENAI_API_KEY`
- `OPENROUTER_API_KEY`
- Add others as needed

## Common Issues

- **Build failures**: Run `cargo clean && cargo build`
- **JSON validation errors**: Check API response format changes  
- **Rate limiting**: Adjust rate limits in provider configurations
- **Network timeouts**: Increase timeout values in HTTP client

## Next Steps

- [ ] Add OpenRouter provider implementation
- [ ] Add OpenAI provider implementation  
- [ ] Add Google Gemini provider implementation
- [ ] Implement configuration file loading
- [ ] Add rate limiting and retry logic
- [ ] Add comprehensive error handling