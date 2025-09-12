import { ModelInfo } from './model_info';
export interface ProviderInfo {
    provider: string;
    providerName: string;
    lastUpdated: string;
    models: ModelInfo[];
}
export declare function createProviderInfo(provider: string, providerName: string, models: ModelInfo[]): ProviderInfo;
//# sourceMappingURL=provider.d.ts.map