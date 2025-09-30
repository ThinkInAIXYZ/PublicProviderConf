#!/usr/bin/env node

import { Command } from 'commander';
import { fetchAllProviders } from './commands/fetch-all';
import { fetchSpecificProviders } from './commands/fetch-providers';

const program = new Command();

program
  .name('public-provider-conf')
  .description('A tool to fetch and aggregate AI model information from various providers')
  .version('1.0.0');

program
  .command('fetch-all')
  .description('Fetch models from all configured providers')
  .option('-o, --output <directory>', 'Output directory for generated JSON files', 'dist')
  .action(async (options: { output: string }) => {
    try {
      await fetchAllProviders(options.output);
    } catch {
      process.exit(1);
    }
  });

program
  .command('fetch-providers')
  .description('Fetch models from specific providers')
  .option('-p, --providers <names>', 'Comma-separated list of provider names')
  .option('-o, --output <directory>', 'Output directory for generated JSON files', 'dist')
  .action(async (options: { providers?: string; output: string }) => {
    if (!options.providers) {
      console.error('❌ Please specify providers with -p option');
      process.exit(1);
    }
    const providerList = options.providers.split(',').map((p: string) => p.trim());
    try {
      await fetchSpecificProviders(providerList, options.output);
    } catch {
      process.exit(1);
    }
  });

program.parse();
