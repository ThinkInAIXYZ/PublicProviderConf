import { promises as fs } from 'fs';
import { join } from 'path';
import {
  ModelsDevApiResponse,
  ModelsDevProvider,
  normalizeProvidersList,
  providersToRecord,
  getProviderId,
} from '../models/models-dev';
import { JsonWriter } from './json-writer';

function sanitizeProviderId(id: string): string {
  return id.replace(/[^a-zA-Z0-9-_]/g, '_');
}

export class ModelsDevOutputManager {
  constructor(private outputDir: string) {}

  async writeAggregatedFile(data: ModelsDevApiResponse, filename: string = 'all.json'): Promise<void> {
    await JsonWriter.writeToFileCompact(data, join(this.outputDir, filename));
  }

  async writeProviderFiles(data: ModelsDevApiResponse): Promise<void> {
    const providersRecord = providersToRecord(data.providers);
    await fs.mkdir(this.outputDir, { recursive: true });

    for (const [providerId, provider] of Object.entries(providersRecord)) {
      const safeId = sanitizeProviderId(providerId || getProviderId(provider));
      const filePath = join(this.outputDir, `${safeId}.json`);
      await JsonWriter.writeToFileCompact(provider, filePath);
    }
  }

  async writeAllFiles(data: ModelsDevApiResponse): Promise<void> {
    await this.clearJsonFiles();
    await this.writeAggregatedFile(data);
    await this.writeProviderFiles(data);
  }

  getProviderCount(data: ModelsDevApiResponse): number {
    return normalizeProvidersList(data.providers).length;
  }

  private async clearJsonFiles(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });
    const entries = await fs.readdir(this.outputDir, { withFileTypes: true });
    await Promise.all(
      entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
        .map(entry => fs.unlink(join(this.outputDir, entry.name)))
    );
  }
}
