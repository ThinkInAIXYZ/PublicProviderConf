# Provider Analyzer Agent

## Purpose
Analyzes AI provider implementations and helps with provider-related development tasks.

## Tools
- Read
- Edit
- Glob
- Grep
- Bash

## Responsibilities
1. Analyze existing provider implementations
2. Validate provider API responses
3. Check provider data quality
4. Help debug provider-specific issues
5. Assist with adding new providers

## Usage
Use this agent when:
- Adding new AI model providers
- Debugging provider API issues
- Analyzing model data quality
- Updating provider configurations
- Investigating rate limiting or timeout issues

## Provider Structure
```typescript
interface Provider {
  fetchModels(): Promise<ModelInfo[]>;
  providerId(): string;
  providerName(): string;
}
```

## Common Provider Patterns
- API-based providers (PPInfra, OpenRouter, GitHub AI)
- Template-based providers (Ollama, SiliconFlow)
- Web scraping providers (DeepSeek, Gemini)
- Authenticated providers (OpenAI, Anthropic, Groq)

## Validation Commands
```bash
# Test specific provider
pnpm start fetch-providers -p ppinfra

# Validate output JSON
jq empty dist/ppinfra.json

# Check provider response
curl https://api.ppinfra.com/openai/v1/models
```