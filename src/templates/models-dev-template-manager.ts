import { promises as fs } from 'fs';
import { join } from 'path';
import {
  ModelsDevApiResponse,
  ModelsDevModel,
  ModelsDevProvider,
} from '../models/models-dev';

function mergeObjects<T extends Record<string, any> | undefined>(
  base: T,
  override: T
): T {
  if (!base && !override) {
    return undefined as T;
  }
  if (!base) {
    return (override ? { ...override } : undefined) as T;
  }
  if (!override) {
    return (base ? { ...base } : undefined) as T;
  }
  return { ...base, ...override } as T;
}

function mergeStringArrays(base?: string[], override?: string[]): string[] | undefined {
  if (!base && !override) {
    return undefined;
  }

  const seen = new Set<string>();
  const result: string[] = [];

  const addValues = (values?: string[]) => {
    if (!values) {
      return;
    }
    for (const value of values) {
      if (!seen.has(value)) {
        seen.add(value);
        result.push(value);
      }
    }
  };

  addValues(base);
  addValues(override);

  return result;
}

function sanitizeProviderLike(
  provider: ModelsDevProvider,
): ModelsDevProvider & Record<string, unknown> {
  const sanitized = { ...provider } as ModelsDevProvider & Record<string, unknown>;
  delete sanitized.env;
  delete sanitized.npm;
  return sanitized;
}

function mergeModels(base: ModelsDevModel[] = [], override: ModelsDevModel[] = []): ModelsDevModel[] {
  if (!override.length) {
    return base.slice();
  }

  const merged = new Map<string, ModelsDevModel>();

  for (const model of base) {
    if (!model.id) {
      continue;
    }
    merged.set(model.id, {
      ...model,
      capabilities: model.capabilities ? { ...model.capabilities } : undefined,
      metadata: model.metadata ? { ...model.metadata } : undefined,
      modalities: model.modalities ? { ...model.modalities } : undefined,
      cost: model.cost ? { ...model.cost } : undefined,
      limit: model.limit ? { ...model.limit } : undefined,
    });
  }

  for (const model of override) {
    if (!model.id) {
      continue;
    }
    const existing = merged.get(model.id);
    if (existing) {
      const combined = {
        ...existing,
        ...model,
      } as ModelsDevModel & Record<string, unknown>;

      combined.capabilities = mergeObjects(existing.capabilities, model.capabilities);
      combined.metadata = mergeObjects(existing.metadata, model.metadata);
      combined.modalities = mergeObjects(existing.modalities, model.modalities);
      combined.cost = mergeObjects(existing.cost, model.cost);
      combined.limit = mergeObjects(existing.limit, model.limit);

      merged.set(model.id, combined as ModelsDevModel);
    } else {
      merged.set(model.id, {
        ...model,
        capabilities: model.capabilities ? { ...model.capabilities } : undefined,
        metadata: model.metadata ? { ...model.metadata } : undefined,
        modalities: model.modalities ? { ...model.modalities } : undefined,
        cost: model.cost ? { ...model.cost } : undefined,
        limit: model.limit ? { ...model.limit } : undefined,
      });
    }
  }

  return Array.from(merged.values());
}

export function mergeProviderWithTemplate(
  provider: ModelsDevProvider,
  template?: ModelsDevProvider
): ModelsDevProvider {
  if (!template) {
    return sanitizeProviderLike(provider) as ModelsDevProvider;
  }

  const sanitizedProvider = sanitizeProviderLike(provider);
  const sanitizedTemplate = sanitizeProviderLike(template);

  const merged = {
    ...sanitizedProvider,
    ...sanitizedTemplate,
  } as ModelsDevProvider & Record<string, unknown>;

  merged.metadata = mergeObjects(sanitizedProvider.metadata, sanitizedTemplate.metadata);
  merged.models = mergeModels(sanitizedProvider.models, sanitizedTemplate.models);
  merged.tags = mergeStringArrays(sanitizedProvider.tags, sanitizedTemplate.tags);

  return merged as ModelsDevProvider;
}

function ensureProviderDefaults(providerId: string, template: Partial<ModelsDevProvider>): ModelsDevProvider {
  const id = template.id?.trim();
  if (!id) {
    throw new Error(`Template is missing required provider id (file: ${providerId})`);
  }

  const name = template.name?.trim() || template.display_name?.trim() || id;

  const models: ModelsDevModel[] = [];
  for (const model of template.models ?? []) {
    try {
      models.push(ensureModelDefaults(model, id));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️  Skipping template model for provider ${id}: ${message}`);
    }
  }

  const normalized = {
    ...template,
    id,
    name,
    display_name: template.display_name?.trim() || name,
    models,
  } as ModelsDevProvider & Record<string, unknown>;

  normalized.tags = template.tags ? [...template.tags] : undefined;
  normalized.metadata = template.metadata ? { ...template.metadata } : undefined;

  return normalized as ModelsDevProvider;
}

function ensureModelDefaults(model: Partial<ModelsDevModel>, providerId: string): ModelsDevModel {
  const id = model.id?.trim();
  if (!id) {
    throw new Error(`missing required model id (provider: ${providerId})`);
  }

  const name = model.name?.trim() || model.display_name?.trim() || id;
  const normalized = {
    ...model,
    id,
    name,
    display_name: model.display_name?.trim() || name,
  } as ModelsDevModel & Record<string, unknown>;

  normalized.capabilities = model.capabilities ? { ...model.capabilities } : undefined;
  normalized.metadata = model.metadata ? { ...model.metadata } : undefined;
  normalized.modalities = model.modalities ? { ...model.modalities } : undefined;
  normalized.cost = model.cost ? { ...model.cost } : undefined;
  normalized.limit = model.limit ? { ...model.limit } : undefined;

  return normalized as ModelsDevModel;
}

export class ModelsDevTemplateManager {
  constructor(private readonly templatesDir: string = 'manual-templates') {}

  async loadAllTemplates(): Promise<Map<string, ModelsDevProvider>> {
    try {
      const entries = await fs.readdir(this.templatesDir, { withFileTypes: true });
      const templates = new Map<string, ModelsDevProvider>();

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.json')) {
          continue;
        }

        const filePath = join(this.templatesDir, entry.name);
        const raw = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw) as Partial<ModelsDevProvider>;
        const providerId = entry.name.replace(/\.json$/, '');

        try {
          const normalized = ensureProviderDefaults(providerId, parsed);
          templates.set(normalized.id, normalized);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`⚠️  Skipping template provider from ${entry.name}: ${message}`);
        }
      }

      return templates;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return new Map();
      }
      throw error;
    }
  }

  rebuildProviders(
    original: ModelsDevApiResponse['providers'],
    providers: Record<string, ModelsDevProvider>
  ): ModelsDevApiResponse['providers'] {
    if (Array.isArray(original)) {
      return Object.values(providers);
    }

    return providers;
  }
}
