import { describe, it, expect } from 'vitest';
import { getDefaultConfig } from '../src/config/app-config';

describe('Config', () => {
  it('returns default providers map', () => {
    const cfg = getDefaultConfig();
    expect(cfg.providers).toBeTruthy();
    expect(Object.keys(cfg.providers).length).toBeGreaterThan(0);
    expect(cfg.providers).toHaveProperty('ppinfra');
  });
});

