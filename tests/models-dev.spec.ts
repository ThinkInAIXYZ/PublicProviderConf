import { describe, it, expect } from 'vitest';
import { tmpdir } from 'os';
import { mkdtempSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  createModelsDevProvider,
  mergeProviders,
  ModelsDevApiResponse,
} from '../src/models/models-dev';
import { createModelInfo, ModelType } from '../src/models/model-info';
import { createProviderInfo } from '../src/models/provider-info';
import { ModelsDevOutputManager } from '../src/output/models-dev-output-manager';
import { mergeProviderWithTemplate } from '../src/templates/models-dev-template-manager';

describe('models.dev helpers', () => {
  const provider = createProviderInfo('tokenflux', 'TokenFlux', [
    createModelInfo('tf-1', 'TokenFlux-1', 8192, 4096, true, false, true, ModelType.Chat),
    createModelInfo('tf-emb', 'TokenFlux-Emb', 4096, 2048, false, false, false, ModelType.Embedding),
  ]);

  it('creates models.dev provider structure', () => {
    const modelsDevProvider = createModelsDevProvider(provider);

    expect(modelsDevProvider.id).toBe('tokenflux');
    expect(modelsDevProvider.models).toHaveLength(2);
    expect(modelsDevProvider.models[0].context_length).toBe(8192);
    expect(modelsDevProvider.models[0].capabilities?.vision).toBe(true);
  });

  it('merges providers into existing record', () => {
    const existing: ModelsDevApiResponse['providers'] = {
      openai: { id: 'openai', name: 'OpenAI', models: [] },
    };

    const merged = mergeProviders(existing, [createModelsDevProvider(provider)]);

    expect((merged as Record<string, any>).openai).toBeDefined();
    expect((merged as Record<string, any>).tokenflux.models).toHaveLength(2);
  });

  it('merges providers into existing array', () => {
    const existing: ModelsDevApiResponse['providers'] = [
      { id: 'openai', name: 'OpenAI', models: [] },
    ];

    const merged = mergeProviders(existing, [createModelsDevProvider(provider)]);

    expect(Array.isArray(merged)).toBe(true);
    const providers = merged as Array<{ id: string }>;
    expect(providers.map(p => p.id)).toContain('tokenflux');
  });

  it('writes aggregated and split provider files', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'models-dev-'));
    try {
      const manager = new ModelsDevOutputManager(dir);
      const data: ModelsDevApiResponse = {
        version: '1.0.0',
        providers: mergeProviders({}, [createModelsDevProvider(provider)]),
      };

      await manager.writeAllFiles(data);

      const allJson = JSON.parse(readFileSync(join(dir, 'all.json'), 'utf8'));
      expect(allJson.providers.tokenflux.models).toHaveLength(2);

      const providerJson = JSON.parse(readFileSync(join(dir, 'tokenflux.json'), 'utf8'));
      expect(providerJson.id).toBe('tokenflux');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('merges provider templates with overrides and additions', () => {
    const base = createModelsDevProvider(provider);
    const merged = mergeProviderWithTemplate(base, {
      id: 'tokenflux',
      name: 'TokenFlux Templates',
      models: [
        {
          id: 'tf-1',
          name: 'TokenFlux-1 (Template)',
          max_output_tokens: 1234,
          capabilities: {
            vision: false,
            reasoning: true,
            function_calling: true,
          },
        },
        {
          id: 'tf-new',
          name: 'TokenFlux-New',
          type: 'chat',
          context_length: 2048,
          capabilities: {
            vision: false,
            reasoning: false,
          },
        },
      ],
      metadata: {
        region: 'global',
      },
    });

    expect(merged.name).toBe('TokenFlux Templates');
    expect(merged.models).toHaveLength(3);
    const overridden = merged.models.find(model => model.id === 'tf-1');
    expect(overridden?.max_output_tokens).toBe(1234);
    expect(overridden?.capabilities?.reasoning).toBe(true);
    const added = merged.models.find(model => model.id === 'tf-new');
    expect(added?.context_length).toBe(2048);
    expect(merged.metadata?.region).toBe('global');
  });
});
