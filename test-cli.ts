#!/usr/bin/env ts-node

import { Command } from 'commander';

const program = new Command();

program
  .name('public-provider-conf')
  .description('A tool to fetch and aggregate AI model information from various providers')
  .version('1.0.0');

program
  .command('fetch-all')
  .description('Fetch models from all configured providers')
  .option('-o, --output <output>', 'Output directory for generated JSON files', 'dist')
  .option('-c, --config <config>', 'Configuration file path', 'config/providers.toml')
  .action((options) => {
    console.log('Fetch all command called with options:', options);
  });

program
  .command('fetch-providers')
  .description('Fetch models from specific providers')
  .requiredOption('-p, --providers <providers>', 'Comma-separated list of provider names')
  .option('-o, --output <output>', 'Output directory for generated JSON files', 'dist')
  .option('-c, --config <config>', 'Configuration file path', 'config/providers.toml')
  .action((options) => {
    console.log('Fetch providers command called with options:', options);
  });

program.parseAsync(process.argv).catch((error) => {
  console.error('❌ Unexpected error:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
});