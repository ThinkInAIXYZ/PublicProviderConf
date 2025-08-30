use clap::{Parser, Subcommand};
use std::sync::Arc;
use anyhow::Result;

use public_provider_conf::{
    providers::ppinfra::PPInfraProvider,
    providers::openrouter::OpenRouterProvider,
    fetcher::DataFetcher,
    output::OutputManager,
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

async fn fetch_all_providers(output_dir: String, _config_path: String) -> Result<()> {
    println!("Fetching models from all providers...");
    
    let mut fetcher = DataFetcher::new();
    
    // Add PPInfra provider
    let ppinfra = Arc::new(PPInfraProvider::new(
        "https://api.ppinfra.com/openai/v1/models".to_string()
    ));
    fetcher.add_provider(ppinfra);
    
    // Add OpenRouter provider
    let openrouter = Arc::new(OpenRouterProvider::new(
        "https://openrouter.ai/api/v1/models".to_string()
    ));
    fetcher.add_provider(openrouter);
    
    let provider_data = fetcher.fetch_all().await?;
    
    let output_manager = OutputManager::new(output_dir);
    output_manager.write_provider_files(&provider_data).await?;
    output_manager.write_aggregated_file(&provider_data).await?;
    
    println!("✅ Successfully fetched and wrote {} providers", provider_data.len());
    
    Ok(())
}

async fn fetch_specific_providers(
    _provider_names: Vec<&str>, 
    _output_dir: String, 
    _config_path: String
) -> Result<()> {
    // TODO: Implement specific provider fetching
    println!("Specific provider fetching not yet implemented");
    Ok(())
}