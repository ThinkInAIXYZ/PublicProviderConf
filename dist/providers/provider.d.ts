import { ModelInfo } from '../models/model-info';
export interface Provider {
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=provider.d.ts.map