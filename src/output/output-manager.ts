import { promises as fs } from 'fs';
import { join } from 'path';
import {
  ModelsDevApiResponse,
  normalizeProvidersList,
  providersToRecord,
  getProviderId,
} from '../models/models-dev';
import { JsonWriter } from './json-writer';

function sanitizeProviderId(id: string): string {
  return id.replace(/[^a-zA-Z0-9-_]/g, '_');
}

export class OutputManager {
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
      await JsonWriter.writeToFile(provider, filePath);
    }
  }

  async writeAllFiles(data: ModelsDevApiResponse): Promise<void> {
    await this.clearJsonFiles();

    const updatedAtIso = data.updated_at ?? new Date().toISOString();
    if (!data.updated_at) {
      data.updated_at = updatedAtIso;
    }

    const updatedAtMs = Date.parse(updatedAtIso);
    if (Number.isNaN(updatedAtMs)) {
      throw new Error(`Invalid updated_at timestamp: ${updatedAtIso}`);
    }

    await this.writeAggregatedFile(data);
    await this.writeSyncVersionFile(updatedAtMs);
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
        .map(entry => fs.unlink(join(this.outputDir, entry.name))),
    );
  }

  private async writeSyncVersionFile(updatedAt: number): Promise<void> {
    const filePath = join(this.outputDir, 'dc_sync_version.json');
    await JsonWriter.writeToFileCompact({ updated_at: updatedAt }, filePath);
  }
}
