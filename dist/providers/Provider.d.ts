import { ModelInfo } from '../types/ModelInfo';
export interface Provider {
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=Provider.d.ts.map