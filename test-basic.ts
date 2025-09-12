#!/usr/bin/env ts-node

// Simple test to verify the CLI structure works
import { Command } from 'commander';

const program = new Command();

program
  .name('public-provider-conf')
  .description('Test CLI structure')
  .version('1.0.0');

program
  .command('fetch-all')
  .description('Fetch models from all configured providers')
  .option('-o, --output <output>', 'Output directory', 'dist')
  .option('-c, --config <config>', 'Configuration file path', 'config/providers.toml')
  .action((options) => {
    console.log('✓ Fetch-all command works');
    console.log('  Output:', options.output);
    console.log('  Config:', options.config);
  });

program
  .command('fetch-providers')
  .description('Fetch models from specific providers')
  .requiredOption('-p, --providers <providers>', 'Comma-separated list of provider names')
  .option('-o, --output <output>', 'Output directory', 'dist')
  .option('-c, --config <config>', 'Configuration file path', 'config/providers.toml')
  .action((options) => {
    console.log('✓ Fetch-providers command works');
    console.log('  Providers:', options.providers);
    console.log('  Output:', options.output);
    console.log('  Config:', options.config);
  });

// Test help output
console.log('=== Testing help output ===');
program.parse(['node', 'test', '--help']);

console.log('\n=== Testing fetch-all help ===');
program.parse(['node', 'test', 'fetch-all', '--help']);

console.log('\n=== Testing fetch-providers help ===');
program.parse(['node', 'test', 'fetch-providers', '--help']);