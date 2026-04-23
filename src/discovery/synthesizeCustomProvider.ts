import type { ModelInfo } from '../models/model-info';
import { loadCustomProviderSeedCatalog } from './catalog';
import type {
  CustomProviderSourceSummary,
  CustomProviderSeedCatalog,
  CustomProviderSynthesisResult,
  ModelsAdapter,
  SourceDiscoveryResult,
} from './types';
import { OpenAIModelsAdapter } from './adapters/OpenAIModelsAdapter';
import { AnthropicModelsAdapter } from './adapters/AnthropicModelsAdapter';
import { GeminiModelsAdapter } from './adapters/GeminiModelsAdapter';
import { KimiModelsAdapter } from './adapters/KimiModelsAdapter';
import { DeepSeekModelsAdapter } from './adapters/DeepSeekModelsAdapter';
import { ZhipuModelsAdapter } from './adapters/ZhipuModelsAdapter';
import { MiniMaxModelsAdapter } from './adapters/MiniMaxModelsAdapter';

export interface SynthesizeCustomProviderOptions {
  seedFilePath?: string;
  catalog?: CustomProviderSeedCatalog;
  adapters?: ModelsAdapter[];
}

function createAdapters(catalog: CustomProviderSeedCatalog): ModelsAdapter[] {
  return catalog.sources.map(source => {
    switch (source.id) {
      case 'openai':
        return new OpenAIModelsAdapter(source);
      case 'anthropic':
        return new AnthropicModelsAdapter(source);
      case 'gemini':
        return new GeminiModelsAdapter(source);
      case 'kimi':
        return new KimiModelsAdapter(source);
      case 'deepseek':
        return new DeepSeekModelsAdapter(source);
      case 'zhipu':
        return new ZhipuModelsAdapter(source);
      case 'minimax':
        return new MiniMaxModelsAdapter(source);
      default:
        throw new Error(`Unsupported custom provider source: ${source.id}`);
    }
  });
}

function sortModels(models: ModelInfo[]): ModelInfo[] {
  return [...models].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

function dedupeModels(models: ModelInfo[]): ModelInfo[] {
  const seen = new Set<string>();
  const deduped: ModelInfo[] = [];

  for (const model of models) {
    if (seen.has(model.id)) {
      continue;
    }
    seen.add(model.id);
    deduped.push(model);
  }

  return deduped;
}

async function fetchAdapterResult(adapter: ModelsAdapter): Promise<SourceDiscoveryResult> {
  try {
    return await adapter.fetchModels();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const summary: CustomProviderSourceSummary = {
      sourceId: adapter.sourceId(),
      displayName: adapter.displayName(),
      selected: 0,
      apiModels: 0,
      seedModels: 0,
      status: 'api-error',
      message,
    };

    return {
      source: {
        id: adapter.sourceId(),
        displayName: adapter.displayName(),
        models: [],
      },
      models: [],
      summary,
    };
  }
}

export async function synthesizeCustomProvider(
  options: SynthesizeCustomProviderOptions = {},
): Promise<CustomProviderSynthesisResult> {
  const catalog = options.catalog ?? await loadCustomProviderSeedCatalog(options.seedFilePath);
  const adapters = options.adapters ?? createAdapters(catalog);
  const results = await Promise.all(adapters.map(fetchAdapterResult));

  const models = sortModels(dedupeModels(results.flatMap(result => result.models)))
    .slice(0, catalog.maxModels);

  return {
    models,
    summaries: results.map(result => result.summary),
    catalog,
  };
}
