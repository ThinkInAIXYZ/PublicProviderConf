import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { HttpClient } from './http-client';
import {
  ModelsDevApiResponse,
  ModelsDevModel,
  ModelsDevProvider,
  normalizeProvidersList,
} from '../models/models-dev';

const DEFAULT_MODELS_DEV_API_URL = 'https://models.dev/api.json';
const SNAPSHOT_FALLBACK_PATH = 'templates/models-dev-snapshot.json';

function resolvePrimarySource(): string {
  return process.env.MODELS_DEV_API_URL?.trim() || DEFAULT_MODELS_DEV_API_URL;
}

function resolveFallbackSources(primary: string): string[] {
  const sources: string[] = [];
  const snapshotEnv = process.env.MODELS_DEV_SNAPSHOT_PATH?.trim();
  if (snapshotEnv && snapshotEnv !== primary) {
    sources.push(snapshotEnv);
  }
  if (existsSync(SNAPSHOT_FALLBACK_PATH) && SNAPSHOT_FALLBACK_PATH !== primary && !sources.includes(SNAPSHOT_FALLBACK_PATH)) {
    sources.push(SNAPSHOT_FALLBACK_PATH);
  }
  return sources;
}

function isFileSource(source: string): boolean {
  return source.startsWith('file://') || !/^https?:/i.test(source);
}

function normalizeFilePath(source: string): string {
  if (source.startsWith('file://')) {
    return source.replace('file://', '');
  }
  return source;
}

export class ModelsDevClient {
  private client: HttpClient;

  constructor(client?: HttpClient) {
    this.client = client ?? new HttpClient({
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PublicProviderConf/1.0)',
        'Accept': 'application/json',
      },
    });
  }

  async fetchProviders(): Promise<ModelsDevApiResponse> {
    const primarySource = resolvePrimarySource();
    const sources = [primarySource, ...resolveFallbackSources(primarySource)];
    let lastError: unknown;

    for (const source of sources) {
      const isFile = isFileSource(source);
      const descriptor = isFile ? `snapshot (${source})` : `API ${source}`;

      try {
        const rawData = isFile
          ? await this.loadFromFile(normalizeFilePath(source))
          : await this.client.getJson<unknown>(source);

        const data = this.normalizeApiResponse(rawData);
        this.ensureValidResponse(data);
        this.logProviderCount(data, isFile ? `Loaded` : 'Fetched');
        return data;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️  Failed to load models.dev dataset from ${descriptor}: ${message}`);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Failed to load models.dev dataset from all configured sources');
  }

  private async loadFromFile(filePath: string): Promise<unknown> {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as unknown;
  }

  private normalizeApiResponse(data: unknown): ModelsDevApiResponse {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response from models.dev API');
    }

    const candidate = data as ModelsDevApiResponse;
    if ('providers' in candidate && candidate.providers) {
      return this.normalizeProvidersShape(candidate);
    }

    const entries = Object.entries(candidate as Record<string, unknown>);
    const providerEntries: [string, ModelsDevProvider][] = [];
    const extraEntries: [string, unknown][] = [];

    for (const [key, value] of entries) {
      if (value && typeof value === 'object' && 'models' in (value as ModelsDevProvider)) {
        providerEntries.push([key, this.normalizeProvider(value, key)]);
      } else {
        extraEntries.push([key, value]);
      }
    }

    if (providerEntries.length === 0) {
      throw new Error('models.dev API response missing providers data');
    }

    const normalized: ModelsDevApiResponse = {
      providers: Object.fromEntries(providerEntries),
    };

    for (const [key, value] of extraEntries) {
      if (key === 'version' && typeof value === 'string') {
        normalized.version = value;
      } else if (key === 'updated_at' && typeof value === 'string') {
        normalized.updated_at = value;
      } else if (typeof key === 'string') {
        (normalized as Record<string, unknown>)[key] = value;
      }
    }

    return normalized;
  }

  private normalizeProvidersShape(response: ModelsDevApiResponse): ModelsDevApiResponse {
    if (Array.isArray(response.providers)) {
      const normalizedList = response.providers.map(provider =>
        this.normalizeProvider(provider, provider.id || provider.name || ''),
      );
      return {
        ...response,
        providers: normalizedList,
      };
    }

    const normalizedRecord: Record<string, ModelsDevProvider> = {};
    for (const [key, provider] of Object.entries(response.providers ?? {})) {
      const normalized = this.normalizeProvider(provider, key);
      normalizedRecord[normalized.id || key || normalized.name] = normalized;
    }

    return {
      ...response,
      providers: normalizedRecord,
    };
  }

  private normalizeProvider(provider: unknown, fallbackId: string): ModelsDevProvider {
    if (!provider || typeof provider !== 'object') {
      throw new Error('models.dev provider entry is not an object');
    }

    const record = provider as Record<string, unknown>;
    const normalizedModels = this.normalizeModels(record['models'], fallbackId);

    const normalizedProvider: ModelsDevProvider = {
      ...(provider as ModelsDevProvider),
      models: normalizedModels,
    };

    if (!normalizedProvider.id || typeof normalizedProvider.id !== 'string') {
      normalizedProvider.id = fallbackId;
    }

    if (!normalizedProvider.name || typeof normalizedProvider.name !== 'string') {
      const fallbackName = (record['display_name'] as string) || normalizedProvider.id;
      normalizedProvider.name = fallbackName;
      if (!normalizedProvider.display_name) {
        normalizedProvider.display_name = fallbackName;
      }
    }

    if (!normalizedProvider.display_name || typeof normalizedProvider.display_name !== 'string') {
      normalizedProvider.display_name = normalizedProvider.name;
    }

    return normalizedProvider;
  }

  private normalizeModels(models: unknown, providerId: string): ModelsDevModel[] {
    if (Array.isArray(models)) {
      return models.map(model => this.normalizeModel(model, providerId));
    }

    if (models && typeof models === 'object') {
      return Object.entries(models as Record<string, unknown>).map(([modelId, value]) =>
        this.normalizeModel(value, providerId, modelId),
      );
    }

    return [];
  }

  private normalizeModel(model: unknown, providerId: string, fallbackId?: string): ModelsDevModel {
    if (!model || typeof model !== 'object') {
      const id = fallbackId || `${providerId}-model`;
      return {
        id,
        name: id,
      } as ModelsDevModel;
    }

    const normalized = { ...(model as ModelsDevModel) };

    if (!normalized.id || typeof normalized.id !== 'string') {
      normalized.id = fallbackId || normalized.name || `${providerId}-model`;
    }

    if (!normalized.name || typeof normalized.name !== 'string') {
      normalized.name = normalized.id;
    }

    if (!normalized.display_name || typeof normalized.display_name !== 'string') {
      normalized.display_name = normalized.name;
    }

    return normalized;
  }

  private ensureValidResponse(data: ModelsDevApiResponse): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response from models.dev API');
    }

    if (!data.providers) {
      throw new Error('models.dev API response missing providers field');
    }
  }

  private logProviderCount(data: ModelsDevApiResponse, prefix: string): void {
    const providerCount = normalizeProvidersList(data.providers).length;
    console.log(`${prefix} ${providerCount} providers from models.dev`);
  }
}
