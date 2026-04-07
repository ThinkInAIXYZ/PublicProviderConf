import { cloneExtraCapabilities, cloneLegacyInterleaved } from '../models/extra-capabilities';
import { ModelInfo } from '../models/model-info';
import { createProviderInfo, ProviderInfo } from '../models/provider-info';

function cloneReasoning(reasoning: ModelInfo['reasoning']): ModelInfo['reasoning'] {
  if (typeof reasoning === 'boolean') {
    return reasoning;
  }

  return reasoning ? { ...reasoning } : false;
}

function cloneModel(model: ModelInfo): ModelInfo {
  return {
    ...model,
    reasoning: cloneReasoning(model.reasoning),
    modalities: model.modalities
      ? {
          ...model.modalities,
          input: model.modalities.input ? [...model.modalities.input] : undefined,
          output: model.modalities.output ? [...model.modalities.output] : undefined,
        }
      : undefined,
    cost: model.cost ? { ...model.cost } : undefined,
    limit: model.limit ? { ...model.limit } : undefined,
    metadata: model.metadata ? { ...model.metadata } : undefined,
    interleaved: cloneLegacyInterleaved(model.interleaved),
    extraCapabilities: cloneExtraCapabilities(model.extraCapabilities),
  };
}

function stripNamespacePrefix(value: string, namespace: string): string {
  const prefix = `${namespace}/`;
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function stripLeadingLabel(value: string, labels: string[]): string {
  const trimmed = value.trim();

  for (const label of labels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^${escapedLabel}\\s*:\\s*`, 'i');
    if (pattern.test(trimmed)) {
      return trimmed.replace(pattern, '').trim();
    }
  }

  return trimmed;
}

export function deriveNamespaceProvider(
  source: ProviderInfo,
  namespace: string,
  providerId: string,
  providerName: string,
  sourceLabels: string[],
): ProviderInfo | null {
  const derivedModels = source.models
    .filter(model => model.id.startsWith(`${namespace}/`))
    .map(model => {
      const cloned = cloneModel(model);
      const strippedId = stripNamespacePrefix(cloned.id, namespace).trim();
      const strippedName = stripLeadingLabel(cloned.name, sourceLabels);

      return {
        ...cloned,
        id: strippedId || cloned.id,
        name: strippedName || strippedId || cloned.name,
      };
    });

  if (derivedModels.length === 0) {
    return null;
  }

  return createProviderInfo(providerId, providerName, derivedModels, {
    lastUpdated: source.lastUpdated,
    description: `Derived from ${source.provider} by splitting ${namespace} namespaced models.`,
    metadata: {
      derivedFromProvider: source.provider,
      derivedFromType: 'namespace-split',
      namespace,
    },
  });
}

export function deriveDoubaoProvider(source: ProviderInfo): ProviderInfo | null {
  return deriveNamespaceProvider(source, 'volcengine', 'doubao', 'Doubao', [
    'VolcanoEngine',
    'Volcengine',
  ]);
}
