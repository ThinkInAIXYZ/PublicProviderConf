use crate::models::ProviderInfo;
use crate::output::AggregatedOutput;

pub struct DataAggregator;

impl DataAggregator {
    pub fn aggregate_providers(providers: &[ProviderInfo]) -> AggregatedOutput {
        let output_manager = crate::output::OutputManager::new("".to_string());
        output_manager.create_aggregated_output(providers)
    }
}