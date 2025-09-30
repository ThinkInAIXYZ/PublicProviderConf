import { promises as fs } from 'fs';
import { join } from 'path';
import { ProviderInfo } from '../models/provider-info';
import { AggregatedOutput, AggregatedProvider } from './types';
import { JsonWriter } from './json-writer';
import { JsonValidator } from './json-validator';

export class OutputManager {
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
  }

  async writeProviderFiles(providers: ProviderInfo[], validate: boolean = true): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });
    
    for (const provider of providers) {
      // Validate provider data if requested
      if (validate) {
        JsonValidator.validateProviderInfo(provider);
      }
      
      const filename = join(this.outputDir, `${provider.provider}.json`);
      await JsonWriter.writeToFileCompact(provider, filename);
    }
  }

  async writeAggregatedFile(providers: ProviderInfo[], validate: boolean = true): Promise<void> {
    const aggregated = this.createAggregatedOutput(providers);
    
    // Validate each provider if requested
    if (validate) {
      for (const provider of providers) {
        JsonValidator.validateProviderInfo(provider);
      }
    }
    
    const filename = join(this.outputDir, 'all.json');
    await JsonWriter.writeToFileCompact(aggregated, filename);
  }

  createAggregatedOutput(providers: ProviderInfo[]): AggregatedOutput {
    const aggregatedProviders: Record<string, AggregatedProvider> = {};
    let totalModels = 0;

    for (const provider of providers) {
      const aggregatedProvider: AggregatedProvider = {
        providerId: provider.provider,
        providerName: provider.providerName,
        lastUpdated: provider.lastUpdated,
        models: provider.models,
        api: provider.api,
        doc: provider.doc,
        description: provider.description,
        tags: provider.tags,
        metadata: provider.metadata,
      };
      totalModels += provider.models.length;
      aggregatedProviders[provider.provider] = aggregatedProvider;
    }

    return {
      version: '1.0.0',
      generatedAt: new Date(),
      totalModels,
      providers: aggregatedProviders,
    };
  }

  /**
   * Write both individual provider files and aggregated file
   */
  async writeAllFiles(providers: ProviderInfo[], validate: boolean = true): Promise<void> {
    await this.writeProviderFiles(providers, validate);
    await this.writeAggregatedFile(providers, validate);
  }

  /**
   * Get output directory path
   */
  getOutputDir(): string {
    return this.outputDir;
  }

  /**
   * Check if output directory exists
   */
  async outputDirExists(): Promise<boolean> {
    try {
      const stats = await fs.stat(this.outputDir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Clean output directory (remove all JSON files)
   */
  async cleanOutputDir(): Promise<void> {
    if (await this.outputDirExists()) {
      const files = await fs.readdir(this.outputDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      for (const file of jsonFiles) {
        await fs.unlink(join(this.outputDir, file));
      }
    }
  }

  /**
   * Get list of existing provider JSON files
   */
  async getExistingProviderFiles(): Promise<string[]> {
    if (!(await this.outputDirExists())) {
      return [];
    }
    
    const files = await fs.readdir(this.outputDir);
    return files
      .filter(file => file.endsWith('.json') && file !== 'all.json')
      .map(file => file.replace('.json', ''));
  }
}
