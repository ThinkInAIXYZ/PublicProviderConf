import { fetch, ProxyAgent, type Dispatcher } from 'undici';
import { Provider } from './Provider';
import { createModelInfo, ModelInfo, ModelType } from '../models/model-info';
import { normalizeToggleInPlace, type ToggleConfig } from '../utils/toggles';

interface OpenRouterModel {
  id?: string;
  name?: string;
  architecture?: {
    modality?: string;
    input_modalities?: string[] | null;
    output_modalities?: string[] | null;
  } | null;
  supported_parameters?: string[] | null;
  default_parameters?: {
    temperature?: number | null;
    [key: string]: unknown;
  } | null;
  top_provider?: {
    context_length?: number | string | null;
    max_completion_tokens?: number | string | null;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

interface OpenRouterResponse {
  data?: OpenRouterModel[];
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

const OPENAI_VERBOSITY_SUFFIXES = new Set<string>([
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
  'gpt-5-pro',
  'gpt-5-codex',
]);

const OPENAI_EFFORT_SUFFIXES = new Set<string>([
  'o1-pro',
  'o3',
  'o3-pro',
  'o4-mini',
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
  'gpt-5-pro',
  'gpt-5-codex',
]);

function isOpenAIModel(id: string): boolean {
  return (id || '').trim().toLowerCase().startsWith('openai/');
}

function openaiSuffix(id: string): string | null {
  if (!isOpenAIModel(id)) return null;
  const value = (id || '').trim().toLowerCase();
  return value.substring('openai/'.length);
}

function needsOpenAIVerbosity(id: string): boolean {
  const suffix = openaiSuffix(id);
  return !!suffix && OPENAI_VERBOSITY_SUFFIXES.has(suffix);
}

function needsOpenAIEffort(id: string): boolean {
  const suffix = openaiSuffix(id);
  return !!suffix && OPENAI_EFFORT_SUFFIXES.has(suffix);
}

function applyOpenAIReasoningTuning(config: ToggleConfig, id: string): void {
  const addVerbosity = needsOpenAIVerbosity(id);
  const addEffort = needsOpenAIEffort(id);
  if (!addVerbosity && !addEffort) return;

  // Ensure reasoning is marked supported when adding OpenAI-specific params
  config.supported = true;

  if (addVerbosity) {
    config.verbosity = 'medium';
  }
  if (addEffort) {
    config.effort = 'medium';
  }
}

function normalizeModalities(list?: string[] | null): string[] | undefined {
  if (!Array.isArray(list)) return undefined;
  const seen = new Set<string>();
  const output: string[] = [];
  for (const raw of list) {
    const value = String(raw || '').trim().toLowerCase();
    if (!value || value === 'file') continue;
    if (!seen.has(value)) {
      seen.add(value);
      output.push(value);
    }
  }
  return output.length > 0 ? output : undefined;
}

function determineModelType(model: OpenRouterModel, normalizedId: string): ModelType {
  const modality = (model.architecture?.modality || '').toLowerCase();
  if (modality.includes('image')) {
    return ModelType.ImageGeneration;
  }
  if (modality.includes('audio')) {
    return ModelType.Audio;
  }
  if (modality.includes('embedding')) {
    return ModelType.Embedding;
  }

  if (normalizedId.includes('embed')) {
    return ModelType.Embedding;
  }
  if (normalizedId.includes('image')) {
    return ModelType.ImageGeneration;
  }
  if (normalizedId.includes('audio') || normalizedId.includes('speech')) {
    return ModelType.Audio;
  }

  return ModelType.Chat;
}

function modelHasVisionCapability(modalities?: { input?: string[]; output?: string[] }): boolean {
  const inputHasVision = modalities?.input?.some(modality => modality.includes('image') || modality.includes('vision'));
  const outputHasVision = modalities?.output?.some(modality => modality.includes('image') || modality.includes('vision'));
  return Boolean(inputHasVision || outputHasVision);
}

function uniqueById(models: ModelInfo[]): ModelInfo[] {
  const seen = new Set<string>();
  const output: ModelInfo[] = [];
  for (const model of models) {
    if (!model.id || seen.has(model.id)) continue;
    seen.add(model.id);
    output.push(model);
  }
  return output;
}

function mapOpenRouterModel(model: OpenRouterModel): ModelInfo | null {
  const id = (model.id || '').trim();
  if (!id) return null;
  const normalizedId = id.toLowerCase();
  const name = (model.name || id).trim();

  const rawInputModalities = model.architecture?.input_modalities;
  let hasAttachment = false;
  if (Array.isArray(rawInputModalities)) {
    hasAttachment = rawInputModalities.some(value => String(value || '').trim().toLowerCase() === 'file');
  }

  const inputModalities = normalizeModalities(model.architecture?.input_modalities ?? undefined);
  const outputModalities = normalizeModalities(model.architecture?.output_modalities ?? undefined);
  const modalities = inputModalities || outputModalities ? { input: inputModalities, output: outputModalities } : undefined;

  const supportedParameters = Array.isArray(model.supported_parameters) ? model.supported_parameters : [];
  const toolCall = supportedParameters.some(parameter => String(parameter || '').toLowerCase() === 'tool_choice');
  const hasReasoningParameter = supportedParameters.some(parameter => String(parameter || '').toLowerCase() === 'reasoning');

  const reasoningConfig: ToggleConfig = { supported: hasReasoningParameter };
  applyOpenAIReasoningTuning(reasoningConfig, id);
  normalizeToggleInPlace(reasoningConfig);
  const reasoning: ToggleConfig = reasoningConfig;

  const defaultTemperature = model.default_parameters?.temperature;
  const hasTemperatureControl = typeof defaultTemperature === 'number' && Number.isFinite(defaultTemperature);

  const contextLength = toNumber(model.top_provider?.context_length);
  const maxOutputTokens = toNumber(model.top_provider?.max_completion_tokens);

  const modelType = determineModelType(model, normalizedId);
  const context = contextLength ?? 0;
  const maxTokens = maxOutputTokens ?? context;
  const vision = modelHasVisionCapability(modalities);

  const overrides: Partial<Omit<ModelInfo, 'id' | 'name' | 'contextLength' | 'maxTokens' | 'vision' | 'functionCall' | 'reasoning' | 'type'>> = {};

  if (modalities) {
    overrides.modalities = modalities;
  }
  if (hasAttachment) {
    overrides.attachment = true;
  }
  if (hasTemperatureControl) {
    overrides.temperature = true;
  }
  if (toolCall) {
    overrides.toolCall = true;
  }
  if (contextLength !== undefined || maxOutputTokens !== undefined) {
    overrides.limit = {
      context: contextLength,
      output: maxOutputTokens,
    };
  }
  return createModelInfo(
    id,
    name,
    context,
    maxTokens > 0 ? maxTokens : context,
    vision,
    toolCall,
    reasoning,
    modelType,
    overrides,
  );
}

function isReasoningEnabled(model: ModelInfo): boolean {
  const { reasoning } = model;
  if (typeof reasoning === 'object' && reasoning !== null) {
    return reasoning.supported !== undefined ? Boolean(reasoning.supported) : true;
  }
  return Boolean(reasoning);
}

function createProxyDispatcher(): Dispatcher | undefined {
  const proxyUrl =
    process.env.HTTPS_PROXY ??
    process.env.https_proxy ??
    process.env.HTTP_PROXY ??
    process.env.http_proxy;

  if (!proxyUrl) {
    return undefined;
  }

  try {
    return new ProxyAgent(proxyUrl);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn('⚠️  Failed to configure proxy for OpenRouter provider:', reason);
    return undefined;
  }
}

export class OpenRouterProvider implements Provider {
  private readonly dispatcher?: Dispatcher;
  private readonly timeoutMs: number;

  constructor(
    private readonly apiUrl: string = 'https://openrouter.ai/api/v1/models',
    timeoutMs: number = 30_000,
  ) {
    this.timeoutMs = timeoutMs;
    this.dispatcher = createProxyDispatcher();
  }

  private async fetchRaw(): Promise<OpenRouterModel[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.apiUrl, {
        dispatcher: this.dispatcher,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'PublicProviderConf/1.0 (+https://github.com/ThinkInAIXYZ/PublicProviderConf)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const payload = (await response.json()) as OpenRouterResponse | OpenRouterModel[];
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.data)) return payload.data;
      return [];
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async fetchModels(): Promise<ModelInfo[]> {
    console.log('🔄 Fetching models from OpenRouter API...');
    try {
      const rawModels = await this.fetchRaw();
      console.log(`📦 OpenRouter API returned ${rawModels.length} entries`);

      const mapped = rawModels
        .map(mapOpenRouterModel)
        .filter((model): model is ModelInfo => model !== null);
      const unique = uniqueById(mapped).sort((a, b) => a.id.localeCompare(b.id));

      const duplicatesRemoved = mapped.length - unique.length;
      if (duplicatesRemoved > 0) {
        console.log(`♻️  Removed ${duplicatesRemoved} duplicate entries from OpenRouter payload`);
      }

      const typeCounts = unique.reduce<Record<string, number>>((counts, model) => {
        counts[model.type] = (counts[model.type] ?? 0) + 1;
        return counts;
      }, {});
      const typeSummary = Object.entries(typeCounts)
        .map(([type, count]) => `${count} ${type}`)
        .join(', ');
      if (typeSummary) {
        console.log(`🧭 OpenRouter model types: ${typeSummary}`);
      }

      const visionCount = unique.filter(model => model.vision).length;
      const functionCallCount = unique.filter(model => model.functionCall).length;
      const reasoningCount = unique.filter(model => isReasoningEnabled(model)).length;
      const attachmentCount = unique.filter(model => model.attachment).length;

      console.log(
        `🛠️  OpenRouter capability summary: ${visionCount} vision, ${functionCallCount} tool-call, ${reasoningCount} reasoning, ${attachmentCount} attachments`,
      );

      const sampleModels = unique.slice(0, 5).map(model => model.id).join(', ');
      if (sampleModels) {
        const suffix = unique.length > 5 ? ', …' : '';
        console.log(`🔍 Sample OpenRouter models: ${sampleModels}${suffix}`);
      }

      console.log(`✅ Successfully processed ${unique.length} OpenRouter models`);
      return unique;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to fetch OpenRouter models:', reason);
      throw new Error(`Failed to fetch OpenRouter models: ${reason}`);
    }
  }

  providerId(): string {
    return 'openrouter';
  }

  providerName(): string {
    return 'OpenRouter';
  }
}
