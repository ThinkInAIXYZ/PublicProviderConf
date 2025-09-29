import { promises as fs } from 'fs';
import { HttpClient } from './http-client';
import { ModelsDevApiResponse, normalizeProvidersList } from '../models/models-dev';

const DEFAULT_MODELS_DEV_API_URL = 'https://models.dev/api.json';
function resolveSource(): string {
  return process.env.MODELS_DEV_API_URL?.trim() || DEFAULT_MODELS_DEV_API_URL;
}

function isFileSource(source: string): boolean {
  return !/^https?:/i.test(source) || source.startsWith('file://');
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
    const source = resolveSource();

    if (isFileSource(source)) {
      const filePath = normalizeFilePath(source);
      const data = await this.loadFromFile(filePath);
      this.logProviderCount(data, `Loaded ${filePath} snapshot`);
      return data;
    }

    const data = await this.client.getJson<ModelsDevApiResponse>(source);
    this.ensureValidResponse(data);
    this.logProviderCount(data, 'Fetched');
    return data;
  }

  private async loadFromFile(filePath: string): Promise<ModelsDevApiResponse> {
    const raw = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(raw) as ModelsDevApiResponse;
    this.ensureValidResponse(data);
    return data;
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
