import { ModelInfo } from './model-info';
export interface ProviderInfo {
    provider: string;
    providerName: string;
    lastUpdated: Date;
    models: ModelInfo[];
}
export declare function createProviderInfo(provider: string, providerName: string, models: ModelInfo[]): ProviderInfo;
//# sourceMappingURL=provider-info.d.ts.map