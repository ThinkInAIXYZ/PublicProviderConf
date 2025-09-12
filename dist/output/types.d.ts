import { ModelInfo } from '../models/model-info';
export interface AggregatedOutput {
    version: string;
    generatedAt: Date;
    totalModels: number;
    providers: Record<string, AggregatedProvider>;
}
export interface AggregatedProvider {
    providerId: string;
    providerName: string;
    models: ModelInfo[];
}
//# sourceMappingURL=types.d.ts.map