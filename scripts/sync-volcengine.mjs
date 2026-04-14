#!/usr/bin/env node

import { resolve } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
require('ts-node/register/transpile-only');

const { syncVolcengineOutput } = require('../src/commands/volcengine-sync');

function parseOutputDir(args) {
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if ((value === '--output' || value === '-o') && args[index + 1]) {
      return resolve(process.cwd(), args[index + 1]);
    }
  }
  return resolve(process.cwd(), 'dist');
}

async function main() {
  const outputDir = parseOutputDir(process.argv.slice(2));
  const result = await syncVolcengineOutput({
    outputDir,
    logger: console,
  });

  if (!result.success) {
    process.exitCode = 0;
  }
}

main().catch(error => {
  console.warn(
    `⚠️  Volcengine sync script skipped: ${error instanceof Error ? error.message : 'Unknown error'}`,
  );
  process.exitCode = 0;
});
