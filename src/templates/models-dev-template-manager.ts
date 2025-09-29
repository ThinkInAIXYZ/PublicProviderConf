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
    });
  }

  for (const model of override) {
    if (!model.id) {
      continue;
    }
    const existing = merged.get(model.id);
    if (existing) {
      merged.set(model.id, {
        ...existing,
        ...model,
        capabilities: mergeObjects(existing.capabilities, model.capabilities),
        metadata: mergeObjects(existing.metadata, model.metadata),
      });
    } else {
      merged.set(model.id, {
        ...model,
        capabilities: model.capabilities ? { ...model.capabilities } : undefined,
        metadata: model.metadata ? { ...model.metadata } : undefined,
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
    return provider;
  }

  return {
    ...provider,
    ...template,
    metadata: mergeObjects(provider.metadata, template.metadata),
    models: mergeModels(provider.models, template.models),
  };
}

function ensureProviderDefaults(providerId: string, template: Partial<ModelsDevProvider>): ModelsDevProvider {
  const id = template.id?.trim() || providerId;
  const name = template.name?.trim() || template.display_name?.trim() || id;
  const models = (template.models ?? []).map(model => ensureModelDefaults(model));

  return {
    id,
    name,
    display_name: template.display_name?.trim() || name,
    description: template.description,
    updated_at: template.updated_at,
    metadata: template.metadata ? { ...template.metadata } : undefined,
    models,
  };
}

function ensureModelDefaults(model: Partial<ModelsDevModel>): ModelsDevModel {
  if (!model.id) {
    throw new Error('Template model is missing required "id" field');
  }
  const name = model.name?.trim() || model.display_name?.trim() || model.id;
  return {
    id: model.id,
    name,
    display_name: model.display_name?.trim() || name,
    description: model.description,
    type: model.type,
    context_length: model.context_length,
    max_output_tokens: model.max_output_tokens,
    capabilities: model.capabilities ? { ...model.capabilities } : undefined,
    metadata: model.metadata ? { ...model.metadata } : undefined,
  };
}

export class ModelsDevTemplateManager {
  constructor(private readonly templatesDir: string = 'templates') {}

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
        const normalized = ensureProviderDefaults(providerId, parsed);
        templates.set(normalized.id, normalized);
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
