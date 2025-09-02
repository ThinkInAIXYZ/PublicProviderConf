use clap::{Parser, Subcommand};
use std::sync::Arc;
use anyhow::Result;

use public_provider_conf::{
    providers::ppinfra::PPInfraProvider,
    providers::openrouter::OpenRouterProvider,
    providers::gemini::GeminiProvider,
    providers::vercel::VercelProvider,
    providers::github_ai::GithubAiProvider,
    providers::tokenflux::TokenfluxProvider,
    providers::groq::GroqProvider,
    providers::deepseek::DeepSeekProvider,
    providers::openai::OpenAIProvider,
    providers::anthropic::AnthropicProvider,
    providers::ollama::OllamaProvider,
    fetcher::DataFetcher,
    output::OutputManager,
    config::AppConfig,
};

#[derive(Parser)]
#[command(name = "public-provider-conf")]
#[command(about = "A tool to fetch and aggregate AI model information from various providers")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Fetch models from all configured providers
    FetchAll {
        /// Output directory for generated JSON files
        #[arg(short, long, default_value = "dist")]
        output: String,
        /// Configuration file path
        #[arg(short, long, default_value = "config/providers.toml")]
        config: String,
    },
    /// Fetch models from specific providers
    FetchProviders {
        /// Comma-separated list of provider names
        #[arg(short, long)]
        providers: String,
        /// Output directory for generated JSON files
        #[arg(short, long, default_value = "dist")]
        output: String,
        /// Configuration file path
        #[arg(short, long, default_value = "config/providers.toml")]
        config: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::FetchAll { output, config } => {
            fetch_all_providers(output, config).await?;
        }
        Commands::FetchProviders { providers, output, config } => {
            let provider_list: Vec<&str> = providers.split(',').collect();
            fetch_specific_providers(provider_list, output, config).await?;
        }
    }

    Ok(())
}

async fn fetch_all_providers(output_dir: String, config_path: String) -> Result<()> {
    println!("Fetching models from all providers...");
    
    // Load configuration
    let config = load_config(&config_path);
    
    let mut fetcher = DataFetcher::new();
    
    // Add PPInfra provider (no API key required)
    let ppinfra_config = config.providers.get("ppinfra");
    let ppinfra_url = ppinfra_config
        .map(|c| c.api_url.clone())
        .unwrap_or_else(|| "https://api.ppinfra.com/openai/v1/models".to_string());
    let ppinfra = Arc::new(PPInfraProvider::new(ppinfra_url));
    fetcher.add_provider(ppinfra);
    
    // Add OpenRouter provider (no API key required)
    let openrouter_config = config.providers.get("openrouter");
    let openrouter_url = openrouter_config
        .map(|c| c.api_url.clone())
        .unwrap_or_else(|| "https://openrouter.ai/api/v1/models".to_string());
    let openrouter = Arc::new(OpenRouterProvider::new(openrouter_url));
    fetcher.add_provider(openrouter);
    
    // Add Gemini provider (optional API key for complete model list)
    let gemini_config = config.providers.get("gemini");
    let gemini_api_key = gemini_config
        .and_then(|c| c.get_api_key())
        .or_else(|| std::env::var("GEMINI_API_KEY").ok());
    let gemini = Arc::new(GeminiProvider::new(gemini_api_key));
    fetcher.add_provider(gemini);
    
    // Add Vercel provider (no API key required)
    let vercel_config = config.providers.get("vercel");
    let vercel_url = vercel_config
        .map(|c| c.api_url.clone())
        .unwrap_or_else(|| "https://ai-gateway.vercel.sh/v1/models".to_string());
    let vercel = Arc::new(VercelProvider::new(vercel_url));
    fetcher.add_provider(vercel);
    
    // Add GitHub AI provider (no API key required)
    let github_ai_config = config.providers.get("github_ai");
    let github_ai_url = github_ai_config
        .map(|c| c.api_url.clone())
        .unwrap_or_else(|| "https://models.inference.ai.azure.com/models".to_string());
    let github_ai = Arc::new(GithubAiProvider::new(github_ai_url));
    fetcher.add_provider(github_ai);
    
    // Add Tokenflux provider (no API key required)
    let tokenflux_config = config.providers.get("tokenflux");
    let tokenflux_url = tokenflux_config
        .map(|c| c.api_url.clone())
        .unwrap_or_else(|| "https://tokenflux.ai/v1/models".to_string());
    let tokenflux = Arc::new(TokenfluxProvider::new(tokenflux_url));
    fetcher.add_provider(tokenflux);
    
    // Add Groq provider (requires API key)
    let groq_config = config.providers.get("groq");
    let groq_api_key = groq_config
        .and_then(|c| c.get_api_key())
        .or_else(|| std::env::var("GROQ_API_KEY").ok());
    
    if groq_api_key.is_some() {
        let groq = Arc::new(GroqProvider::new(groq_api_key));
        fetcher.add_provider(groq);
    } else {
        println!("⚠️  Skipping Groq: No API key found (set GROQ_API_KEY or configure in providers.toml)");
    }
    
    // Add DeepSeek provider (no API key required, uses web scraping)
    let deepseek = Arc::new(DeepSeekProvider::new());
    fetcher.add_provider(deepseek);

    // Add OpenAI provider (optional API key for complete model list)
    let openai_config = config.providers.get("openai");
    let openai_api_key = openai_config
        .and_then(|c| c.get_api_key())
        .or_else(|| std::env::var("OPENAI_API_KEY").ok());
    let openai = Arc::new(OpenAIProvider::new(openai_api_key));
    fetcher.add_provider(openai);

    // Add Anthropic provider (optional API key for complete model list)
    let anthropic_config = config.providers.get("anthropic");
    let anthropic_api_key = anthropic_config
        .and_then(|c| c.get_api_key())
        .or_else(|| std::env::var("ANTHROPIC_API_KEY").ok());
    let anthropic = Arc::new(AnthropicProvider::new(anthropic_api_key));
    fetcher.add_provider(anthropic);
    
    // Add Ollama provider (template-based, no API key required)
    let ollama = Arc::new(OllamaProvider::new());
    fetcher.add_provider(ollama);
    
    let provider_data = fetcher.fetch_all().await?;
    
    let output_manager = OutputManager::new(output_dir);
    output_manager.write_provider_files(&provider_data).await?;
    output_manager.write_aggregated_file(&provider_data).await?;
    
    println!("✅ Successfully fetched and wrote {} providers", provider_data.len());
    
    Ok(())
}

async fn fetch_specific_providers(
    provider_names: Vec<&str>, 
    output_dir: String, 
    config_path: String
) -> Result<()> {
    println!("Fetching models from providers: {}", provider_names.join(", "));
    
    // Load configuration
    let config = load_config(&config_path);
    
    let mut fetcher = DataFetcher::new();
    
    for provider_name in provider_names {
        match provider_name.trim().to_lowercase().as_str() {
            "ppinfra" => {
                let ppinfra_config = config.providers.get("ppinfra");
                let ppinfra_url = ppinfra_config
                    .map(|c| c.api_url.clone())
                    .unwrap_or_else(|| "https://api.ppinfra.com/openai/v1/models".to_string());
                let ppinfra = Arc::new(PPInfraProvider::new(ppinfra_url));
                fetcher.add_provider(ppinfra);
            }
            "openrouter" => {
                let openrouter_config = config.providers.get("openrouter");
                let openrouter_url = openrouter_config
                    .map(|c| c.api_url.clone())
                    .unwrap_or_else(|| "https://openrouter.ai/api/v1/models".to_string());
                let openrouter = Arc::new(OpenRouterProvider::new(openrouter_url));
                fetcher.add_provider(openrouter);
            }
            "gemini" => {
                let gemini_config = config.providers.get("gemini");
                let gemini_api_key = gemini_config
                    .and_then(|c| c.get_api_key())
                    .or_else(|| std::env::var("GEMINI_API_KEY").ok());
                let gemini = Arc::new(GeminiProvider::new(gemini_api_key));
                fetcher.add_provider(gemini);
            }
            "vercel" => {
                let vercel_config = config.providers.get("vercel");
                let vercel_url = vercel_config
                    .map(|c| c.api_url.clone())
                    .unwrap_or_else(|| "https://ai-gateway.vercel.sh/v1/models".to_string());
                let vercel = Arc::new(VercelProvider::new(vercel_url));
                fetcher.add_provider(vercel);
            }
            "github_ai" => {
                let github_ai_config = config.providers.get("github_ai");
                let github_ai_url = github_ai_config
                    .map(|c| c.api_url.clone())
                    .unwrap_or_else(|| "https://models.inference.ai.azure.com/models".to_string());
                let github_ai = Arc::new(GithubAiProvider::new(github_ai_url));
                fetcher.add_provider(github_ai);
            }
            "tokenflux" => {
                let tokenflux_config = config.providers.get("tokenflux");
                let tokenflux_url = tokenflux_config
                    .map(|c| c.api_url.clone())
                    .unwrap_or_else(|| "https://tokenflux.ai/v1/models".to_string());
                let tokenflux = Arc::new(TokenfluxProvider::new(tokenflux_url));
                fetcher.add_provider(tokenflux);
            }
            "groq" => {
                let groq_config = config.providers.get("groq");
                let groq_api_key = groq_config
                    .and_then(|c| c.get_api_key())
                    .or_else(|| std::env::var("GROQ_API_KEY").ok());
                
                if let Some(api_key) = groq_api_key {
                    let groq = Arc::new(GroqProvider::new(Some(api_key)));
                    fetcher.add_provider(groq);
                } else {
                    eprintln!("❌ Groq requires an API key. Set GROQ_API_KEY environment variable or configure in providers.toml");
                }
            }
            "deepseek" => {
                let deepseek = Arc::new(DeepSeekProvider::new());
                fetcher.add_provider(deepseek);
            }
            "openai" => {
                let openai_config = config.providers.get("openai");
                let openai_api_key = openai_config
                    .and_then(|c| c.get_api_key())
                    .or_else(|| std::env::var("OPENAI_API_KEY").ok());
                let openai = Arc::new(OpenAIProvider::new(openai_api_key));
                fetcher.add_provider(openai);
            }
            "anthropic" => {
                let anthropic_config = config.providers.get("anthropic");
                let anthropic_api_key = anthropic_config
                    .and_then(|c| c.get_api_key())
                    .or_else(|| std::env::var("ANTHROPIC_API_KEY").ok());
                let anthropic = Arc::new(AnthropicProvider::new(anthropic_api_key));
                fetcher.add_provider(anthropic);
            }
            "ollama" => {
                let ollama = Arc::new(OllamaProvider::new());
                fetcher.add_provider(ollama);
            }
            _ => {
                eprintln!("⚠️  Unknown provider: {}", provider_name);
            }
        }
    }
    
    let provider_data = fetcher.fetch_all().await?;
    
    if provider_data.is_empty() {
        eprintln!("❌ No valid providers found or no data fetched");
        return Ok(());
    }
    
    let output_manager = OutputManager::new(output_dir);
    output_manager.write_provider_files(&provider_data).await?;
    
    println!("✅ Successfully fetched and wrote {} providers", provider_data.len());
    
    // Print summary for each provider
    for provider_info in &provider_data {
        println!("   📋 {}: {} models", provider_info.provider_name, provider_info.models.len());
    }
    
    Ok(())
}

fn load_config(config_path: &str) -> AppConfig {
    match AppConfig::load_from_file(config_path) {
        Ok(config) => {
            println!("📄 Loaded configuration from: {}", config_path);
            config
        },
        Err(_) => {
            if config_path.contains("providers.toml") && std::path::Path::new("config/providers.toml.example").exists() {
                println!("⚠️  Config file not found at {}", config_path);
                println!("💡 To create your config file:");
                println!("   cp config/providers.toml.example config/providers.toml");
                println!("   # Then edit config/providers.toml with your settings");
                println!("🔒 Note: config/providers.toml is ignored by git for security");
                println!("📋 Using default configuration for now");
            } else {
                println!("⚠️  Config file not found at {}, using default configuration", config_path);
                println!("💡 You can create a config file to customize provider settings and API keys");
            }
            AppConfig::default()
        }
    }
}