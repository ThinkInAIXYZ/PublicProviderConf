import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import fixture from './__fixtures__/volcengine-doc-detail.json';
import {
  buildVolcengineProvider,
  shouldSyncDoubaoProvider,
  syncVolcengineOutput,
  type VolcengineDocDetail,
} from './volcengine-sync';

const silentLogger = {
  log: () => undefined,
  warn: () => undefined,
};

function asDocDetail(): VolcengineDocDetail {
  return fixture as VolcengineDocDetail;
}

test('buildVolcengineProvider parses and merges Volcengine doc models', () => {
  const provider = buildVolcengineProvider(asDocDetail());

  assert.equal(provider.id, 'doubao');
  assert.equal(provider.models.length, 6);
  assert.equal(provider.updated_at, '2026-04-14T04:01:11Z');

  const seedPro = provider.models.find(model => model.id === 'doubao-seed-2-0-pro-260215');
  assert.ok(seedPro);
  assert.equal(seedPro.type, 'chat');
  assert.equal(typeof seedPro.reasoning === 'object' && seedPro.reasoning?.supported, true);
  assert.equal(seedPro.tool_call, true);
  assert.equal(seedPro.vision, true);
  assert.equal(seedPro.limit?.context, 256000);
  assert.equal(seedPro.limit?.output, 128000);
  assert.equal(seedPro.metadata?.canonical_id, 'doubao-seed-2-0-pro');
  assert.deepEqual(seedPro.modalities?.output, ['text']);

  const seedVision = provider.models.find(model => model.id === 'doubao-seed-1-6-vision-250815');
  assert.ok(seedVision);
  assert.equal(seedVision.tool_call, true);
  assert.equal(seedVision.structured_output, true);
  assert.equal(seedVision.limit?.context, 256000);
  assert.equal(seedVision.limit?.output, 32000);

  const seedream = provider.models.find(model => model.id === 'doubao-seedream-5-0-260128');
  assert.ok(seedream);
  assert.equal(seedream.type, 'image-generation');
  assert.deepEqual(seedream.modalities?.output, ['image']);
  assert.equal(seedream.limit?.requests_per_minute, 500);

  const seedreamLite = provider.models.find(model => model.id === 'doubao-seedream-5-0-lite-260128');
  assert.ok(seedreamLite);
  assert.equal(seedreamLite.type, 'image-generation');
  assert.deepEqual(seedreamLite.modalities?.input, ['image']);

  const embedding = provider.models.find(model => model.id === 'doubao-embedding-vision-251215');
  assert.ok(embedding);
  assert.equal(embedding.type, 'embedding');
  assert.equal(embedding.limit?.context, 128000);
  assert.equal(embedding.limit?.requests_per_minute, 15000);
  assert.equal(embedding.metadata?.vector_dimension, 2048);
  assert.deepEqual(embedding.modalities?.output, ['embedding']);

  const video = provider.models.find(model => model.id === 'doubao-seedance-2-0-260128');
  assert.ok(video);
  assert.equal(video.type, 'video');
  assert.equal(video.limit?.requests_per_minute, 600);
  assert.deepEqual(video.modalities?.output, ['video']);
});

test('syncVolcengineOutput overwrites doubao.json and refreshes all.json provider entry', async () => {
  const outputDir = await mkdtemp(join(tmpdir(), 'volcengine-sync-'));
  const staleProvider = {
    id: 'doubao',
    name: 'Doubao',
    models: [{ id: 'legacy-model', name: 'Legacy Model' }],
  };
  const aggregated = {
    providers: {
      doubao: staleProvider,
      ppinfra: {
        id: 'ppinfra',
        name: 'PPInfra',
        models: [{ id: 'ppinfra-model', name: 'PPInfra Model' }],
      },
    },
    updated_at: '2026-01-01T00:00:00Z',
  };

  await writeFile(join(outputDir, 'doubao.json'), JSON.stringify(staleProvider, null, 2));
  await writeFile(join(outputDir, 'all.json'), JSON.stringify(aggregated));

  const result = await syncVolcengineOutput({
    outputDir,
    loadDocDetail: async () => asDocDetail(),
    logger: silentLogger,
  });

  assert.equal(result.success, true);
  assert.equal(result.providerWritten, true);
  assert.equal(result.aggregatedWritten, true);

  const providerFile = JSON.parse(await readFile(join(outputDir, 'doubao.json'), 'utf8'));
  const aggregatedFile = JSON.parse(await readFile(join(outputDir, 'all.json'), 'utf8'));

  assert.equal(providerFile.models.length, 6);
  assert.deepEqual(aggregatedFile.providers.doubao, providerFile);
  assert.equal(aggregatedFile.providers.ppinfra.id, 'ppinfra');
});

test('syncVolcengineOutput preserves existing files when doc sync fails', async () => {
  const outputDir = await mkdtemp(join(tmpdir(), 'volcengine-sync-failure-'));
  const staleProvider = {
    id: 'doubao',
    name: 'Doubao',
    models: [{ id: 'legacy-model', name: 'Legacy Model' }],
  };
  const aggregated = {
    providers: {
      doubao: staleProvider,
    },
    updated_at: '2026-01-01T00:00:00Z',
  };

  await writeFile(join(outputDir, 'doubao.json'), JSON.stringify(staleProvider, null, 2));
  await writeFile(join(outputDir, 'all.json'), JSON.stringify(aggregated));

  const result = await syncVolcengineOutput({
    outputDir,
    loadDocDetail: async () => {
      throw new Error('fixture exploded');
    },
    logger: silentLogger,
  });

  assert.equal(result.success, false);
  assert.equal(result.providerWritten, false);
  assert.equal(result.aggregatedWritten, false);

  const providerFile = JSON.parse(await readFile(join(outputDir, 'doubao.json'), 'utf8'));
  const aggregatedFile = JSON.parse(await readFile(join(outputDir, 'all.json'), 'utf8'));

  assert.deepEqual(providerFile, staleProvider);
  assert.deepEqual(aggregatedFile, aggregated);
});

test('shouldSyncDoubaoProvider matches the fetch command gating rules', () => {
  assert.equal(shouldSyncDoubaoProvider(), true);
  assert.equal(shouldSyncDoubaoProvider([]), true);
  assert.equal(shouldSyncDoubaoProvider(['ppinfra']), false);
  assert.equal(shouldSyncDoubaoProvider(['doubao']), true);
  assert.equal(shouldSyncDoubaoProvider(['PPInfra', 'DouBao']), true);
});
