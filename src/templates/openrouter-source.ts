import axios, { AxiosInstance } from 'axios';
import { JsonWriter } from '../output/json-writer';
import { ModelsDevModel, ModelsDevProvider } from '../models/models-dev';

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

function normalizeModalities(list?: string[] | null): string[] | undefined {
  if (!Array.isArray(list)) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const v = String(raw || '').trim().toLowerCase();
    if (!v) continue;
    if (v === 'file') continue;
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out.length > 0 ? out : undefined;
}

function mapOpenRouterModel(m: OpenRouterModel): ModelsDevModel | null {
  const id = (m.id || '').trim();
  if (!id) return null;
  const name = (m.name || id).trim();

  const inputModalities = m.architecture?.input_modalities ?? undefined;
  const outputModalities = m.architecture?.output_modalities ?? undefined;
  const hasAttachment = Array.isArray(inputModalities)
    ? inputModalities.some(x => String(x || '').trim().toLowerCase() === 'file')
    : false;

  const supported = Array.isArray(m.supported_parameters) ? m.supported_parameters : [];
  const toolCall = supported.some(p => String(p).toLowerCase() === 'tool_choice');
  const reasoning = supported.some(p => String(p).toLowerCase() === 'reasoning');

  const temp = m.default_parameters?.temperature;
  const temperature = typeof temp === 'number' && Number.isFinite(temp) ? true : false;

  const limitContext = toNumber(m.top_provider?.context_length);
  const limitOutput = toNumber(m.top_provider?.max_completion_tokens);

  const model: ModelsDevModel = {
    id,
    name,
    display_name: name,
    attachment: hasAttachment,
    reasoning: { supported: reasoning },
    temperature: temperature,
    tool_call: toolCall,
    modalities: {
      input: normalizeModalities(inputModalities),
      output: normalizeModalities(outputModalities),
    },
    limit: {
      context: typeof limitContext === 'number' ? limitContext : undefined,
      output: typeof limitOutput === 'number' ? limitOutput : undefined,
    },
  };

  if (model.modalities && !model.modalities.input && !model.modalities.output) {
    delete model.modalities;
  }
  if (model.limit && model.limit.context === undefined && model.limit.output === undefined) {
    delete model.limit;
  }

  return model;
}

function uniqueById(models: ModelsDevModel[]): ModelsDevModel[] {
  const seen = new Set<string>();
  const out: ModelsDevModel[] = [];
  for (const m of models) {
    if (!m.id || seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out;
}

export class OpenRouterSource {
  readonly id = 'openrouter';
  private client: AxiosInstance;

  constructor(private readonly apiUrl: string = 'https://openrouter.ai/api/v1/models') {
    this.client = axios.create({ timeout: 30_000, headers: { Accept: 'application/json' } });
  }

  private async fetchRaw(): Promise<OpenRouterModel[]> {
    const resp = await this.client.get<OpenRouterResponse | OpenRouterModel[]>(this.apiUrl);
    const payload = resp.data as OpenRouterResponse | OpenRouterModel[];
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
  }

  private buildProvider(models: ModelsDevModel[]): ModelsDevProvider {
    const sorted = models.slice().sort((a, b) => a.id.localeCompare(b.id));
    return {
      id: 'openrouter',
      name: 'OpenRouter',
      display_name: 'OpenRouter',
      models: sorted,
      api: this.apiUrl,
      metadata: {
        upstream: 'openrouter-api',
        fetchedAt: new Date().toISOString(),
        modelCount: sorted.length,
      },
    };
  }

  private async persistToTemplate(provider: ModelsDevProvider): Promise<void> {
    const minimal = {
      id: provider.id,
      models: provider.models,
    };
    await JsonWriter.writeToFile(minimal, 'manual-templates/openrouter.json');
  }

  async load(): Promise<ModelsDevProvider | null> {
    try {
      const raw = await this.fetchRaw();
      const mapped: ModelsDevModel[] = [];
      for (const item of raw) {
        const m = mapOpenRouterModel(item);
        if (m) mapped.push(m);
      }

      const unique = uniqueById(mapped);
      if (unique.length === 0) {
        console.warn('⚠️  OpenRouter API returned no models after normalization.');
        return null;
      }

      const provider = this.buildProvider(unique);

      try {
        await this.persistToTemplate(provider);
      } catch (e) {
        console.warn('⚠️  Failed to write manual-templates/openrouter.json:', e);
      }

      return provider;
    } catch (error) {
      console.error(
        '❌ Failed to load OpenRouter models:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return null;
    }
  }
}

export type { OpenRouterModel };
