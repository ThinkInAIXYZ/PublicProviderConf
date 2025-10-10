export interface ToggleConfig {
  supported?: boolean;
  default?: boolean;
  // allow extra fields (e.g., effort/search_strategy)
  [key: string]: unknown;
}

// Normalize a single toggle object in place based on rules:
// - If supported === true and default is undefined -> set default = true
// - If supported === false -> remove default if present
export function normalizeToggleInPlace<T extends ToggleConfig | undefined>(cfg: T): T {
  if (!cfg || typeof cfg !== 'object') return cfg;
  if (cfg.supported === true && cfg.default === undefined) {
    cfg.default = true;
  } else if (cfg.supported === false && 'default' in cfg) {
    delete (cfg as Record<string, unknown>)['default'];
  }
  return cfg;
}

// Normalize "reasoning" and "search" fields on a model-like record
export function normalizeModelToggles(model: Record<string, unknown>): void {
  const r = (model as { reasoning?: unknown }).reasoning;
  if (typeof r === 'boolean') {
    (model as any).reasoning = { supported: r } as ToggleConfig;
  }
  const s = (model as { search?: unknown }).search;
  if (typeof s === 'boolean') {
    (model as any).search = { supported: s } as ToggleConfig;
  }

  const reasoning = (model as { reasoning?: ToggleConfig }).reasoning;
  if (reasoning && typeof reasoning === 'object') {
    normalizeToggleInPlace(reasoning);
  }
  const search = (model as { search?: ToggleConfig }).search;
  if (search && typeof search === 'object') {
    normalizeToggleInPlace(search);
  }
}

