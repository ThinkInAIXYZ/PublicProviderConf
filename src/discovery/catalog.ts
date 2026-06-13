import { promises as fs } from 'fs';
import { join } from 'path';
import type { CustomProviderSeedCatalog } from './types';

const DEFAULT_CATALOG_PATH = join(
  process.cwd(),
  'manual-templates',
  'custom-provider-overrides.json',
);

export async function loadCustomProviderSeedCatalog(
  filePath: string = DEFAULT_CATALOG_PATH,
): Promise<CustomProviderSeedCatalog> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as CustomProviderSeedCatalog;
}
