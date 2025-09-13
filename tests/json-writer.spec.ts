import { describe, it, expect } from 'vitest';
import { JsonWriter } from '../src/output/json-writer';
import { tmpdir } from 'os';
import { join } from 'path';

describe('JsonWriter', () => {
  it('writes, reads, checks, and cleans json', async () => {
    const dir = join(tmpdir(), `ppc-vitest-${Date.now()}`);
    const file = join(dir, 'test.json');
    const data = { a: 1, b: 'x' };

    await JsonWriter.writeToFile(data, file);
    const exists = await JsonWriter.fileExists(file);
    expect(exists).toBe(true);

    const read = await JsonWriter.readFromFile<typeof data>(file);
    expect(read).toEqual(data);
  });
});

